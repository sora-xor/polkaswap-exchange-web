import { api as walletApi } from '@soramitsu/soraneo-wallet-web';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock ethersUtil functions used in utils
vi.mock('@/utils/ethers-util', () => ({
  default: {
    getBlockNumber: vi.fn(),
    getEvmTransaction: vi.fn(),
    getEvmTransactionReceipt: vi.fn(),
    calcEvmFee: (gp: any, ga: any) => `fee(${String(gp)},${String(ga)})`,
  },
}));
import * as utils from '@/utils/bridge/common/utils';
import ethersUtil from '@/utils/ethers-util';

// Mock wallet api used by getTransactionEvents
vi.mock('@soramitsu/soraneo-wallet-web', () => ({
  api: {
    system: {
      getExtrinsicsFromBlock: vi.fn(),
      getBlockEvents: vi.fn(),
    },
    bridgeProxy: { sub: {}, evm: {}, eth: {} },
  },
  vuex: { WalletModules: [] },
  WALLET_CONSTS: { ETH_BRIDGE_STATES: { INITIAL: 0 } },
}));

// Mock ethers.isError behavior
vi.mock('ethers', () => ({
  ethers: {
    isError: (e: any, code: string) => e && e.code === code,
  },
}));

// Avoid pulling in the SDK and its polkadot deps in tests
vi.mock('@sora-substrate/sdk', () => ({
  isEthOperation: () => false,
  isEvmOperation: () => false,
  isSubstrateOperation: () => false,
}));
vi.mock('@sora-substrate/sdk/build/assets/consts', () => ({ XOR: { address: 'xor' }, TBCD: { address: 'tbcd' } }));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/consts', () => ({
  BridgeNetworkType: { Eth: 'Eth', Evm: 'Evm', Sub: 'Sub' },
}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/eth/consts', () => ({}));
vi.mock('@/consts/evm', () => ({
  KnownEthBridgeAsset: { Other: 'Other', XOR: 'XOR', VAL: 'VAL' },
  SmartContractType: { EthBridge: 'ETH_BRIDGE', ERC20: 'ERC20' },
  SmartContracts: { ETH_BRIDGE: {}, ERC20: {} },
}));
vi.mock('@/utils', () => ({}));

describe('evm flow helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('waitForEvmTransactionMined resolves with receipt', async () => {
    const getBlockNumberMock = vi.mocked(
      ((ethersUtil as any).getBlockNumber ?? (ethersUtil as any).default?.getBlockNumber) as any
    );
    getBlockNumberMock.mockResolvedValueOnce(100);
    const receipt = { fee: 1n, status: 1 } as any;
    const tx: any = {
      blockNumber: undefined,
      replaceableTransaction: vi.fn(() => ({ wait: vi.fn(async () => receipt) })),
    };

    const res = await utils.waitForEvmTransactionMined(tx, () => {});
    expect(res).toBe(receipt);
  });

  it('waitForEvmTransactionMined handles replaced tx', async () => {
    // First wait throws TRANSACTION_REPLACED, then the replaced tx wait resolves
    const replacedReceipt = { fee: 2n, status: 1 } as any;
    const replacedTx: any = {
      replaceableTransaction: () => ({ wait: vi.fn(async () => replacedReceipt) }),
    };
    const error: any = new Error('replaced');
    error.code = 'TRANSACTION_REPLACED';
    error.replacement = replacedTx;

    const tx: any = {
      blockNumber: 50,
      replaceableTransaction: () => ({
        wait: vi.fn(async () => {
          throw error;
        }),
      }),
    };

    const cb = vi.fn();
    const res = await utils.waitForEvmTransactionMined(tx, cb);
    expect(cb).toHaveBeenCalledWith(replacedTx);
    expect(res).toBe(replacedReceipt);
  });

  it('waitForEvmTransactionMined rejects on empty transaction payload', async () => {
    await expect(utils.waitForEvmTransactionMined(null as any)).rejects.toThrow(
      '[waitForEvmTransactionMined]: tx cannot be empty!'
    );
  });

  it('onEvmTransactionPending updates transaction with fee and block info', async () => {
    const id = 'tx-id';
    const getTx = vi.fn(() => ({ id, externalHash: '0xhash' }) as any);
    const updates: any[] = [];
    const updateTx = vi.fn((_id: string, u: any) => updates.push(u));

    // Mock EVM tx and mined receipt path
    const mined: any = { fee: 777n, blockNumber: 99, blockHash: '0xB', status: 1 };
    const mockTxResponse: any = {
      gasPrice: 1n,
      gasLimit: 2n,
      replaceableTransaction: () => ({ wait: vi.fn(async () => mined) }),
    };
    const getEvmTransactionMock = vi.mocked(
      ((ethersUtil as any).getEvmTransaction ?? (ethersUtil as any).default?.getEvmTransaction) as any
    );
    getEvmTransactionMock.mockResolvedValueOnce(mockTxResponse);

    await utils.onEvmTransactionPending(id, getTx as any, updateTx as any);

    // Should record external fee + block data
    expect(updates.some((u) => u.externalNetworkFee === '777')).toBe(true);
    expect(updates.some((u) => u.externalBlockHeight === 99 && u.externalBlockId === '0xB')).toBe(true);
  });

  it('onEvmTransactionPending throws when transaction hash is absent', async () => {
    const id = 'missing-hash';
    const getTx = vi.fn(() => ({ id, externalHash: undefined }) as any);
    const updateTx = vi.fn();
    const getEvmTransactionMock = vi.mocked(
      ((ethersUtil as any).getEvmTransaction ?? (ethersUtil as any).default?.getEvmTransaction) as any
    );

    await expect(utils.onEvmTransactionPending(id, getTx as any, updateTx as any)).rejects.toThrow(
      '[onEvmTransactionPending] Evm transaction hash is empty'
    );
    expect(updateTx).not.toHaveBeenCalled();
    expect(getEvmTransactionMock).not.toHaveBeenCalled();
  });

  it('onEvmTransactionPending resets external hash when the receipt is missing', async () => {
    const id = 'missing-receipt';
    const externalHash = '0xdead';
    const getTx = vi.fn(() => ({ id, externalHash }) as any);
    const updateTx = vi.fn();
    const getEvmTransactionMock = vi.mocked(
      ((ethersUtil as any).getEvmTransaction ?? (ethersUtil as any).default?.getEvmTransaction) as any
    );
    const txResponse: any = {
      blockNumber: 42,
      replaceableTransaction: () => ({ wait: vi.fn(async () => null) }),
    };
    getEvmTransactionMock.mockResolvedValueOnce(txResponse);

    await expect(utils.onEvmTransactionPending(id, getTx as any, updateTx as any)).rejects.toThrow(
      /Ethereum transaction not found/
    );

    expect(updateTx).toHaveBeenCalledWith(id, {
      externalHash: undefined,
      externalNetworkFee: undefined,
    });
  });

  it('onEvmTransactionPending surfaces failed status while preserving updates', async () => {
    const id = 'failed-status';
    const getTx = vi.fn(() => ({ id, externalHash: '0xhash' }) as any);
    const updateTx = vi.fn();
    const mined: any = { fee: 777n, blockNumber: 99, blockHash: '0xB', status: 0 };
    const mockTxResponse: any = {
      gasPrice: 1n,
      gasLimit: 2n,
      replaceableTransaction: () => ({ wait: vi.fn(async () => mined) }),
    };
    const getEvmTransactionMock = vi.mocked(
      ((ethersUtil as any).getEvmTransaction ?? (ethersUtil as any).default?.getEvmTransaction) as any
    );
    getEvmTransactionMock.mockResolvedValueOnce(mockTxResponse);

    await expect(utils.onEvmTransactionPending(id, getTx as any, updateTx as any)).rejects.toThrow(/has failed status/);

    expect(updateTx).toHaveBeenCalledWith(id, {
      externalNetworkFee: '777',
      externalBlockHeight: 99,
      externalBlockId: '0xB',
    });
  });

  it('getTransactionEvents finds events for a specific extrinsic', async () => {
    const blockHash = '0xBLOCK';
    const txHash = '0xTX';
    // 2 extrinsics, second matches
    const getExtrinsicsFromBlockMock = vi.mocked(walletApi.system.getExtrinsicsFromBlock as any);
    const getBlockEventsMock = vi.mocked(walletApi.system.getBlockEvents as any);
    getExtrinsicsFromBlockMock.mockResolvedValueOnce([
      { hash: { toString: () => '0xOTHER' } },
      { hash: { toString: () => txHash } },
    ]);

    const targetIndex = 1;
    const event = {
      phase: {
        isApplyExtrinsic: true,
        asApplyExtrinsic: { toNumber: () => targetIndex },
      },
    };
    getBlockEventsMock.mockResolvedValueOnce([event, { phase: { isApplyExtrinsic: false } }]);

    const result = await utils.getTransactionEvents(blockHash, txHash, {} as any);
    expect(result).toEqual([event]);
  });
});
