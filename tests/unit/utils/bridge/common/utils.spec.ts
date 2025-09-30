import { beforeEach, describe, expect, it, vi } from 'vitest';

const { XOR_ADDRESS, TBCD_ADDRESS } = vi.hoisted(() => ({
  XOR_ADDRESS: 'xor',
  TBCD_ADDRESS: 'tbcd',
}));

// Mock ethers-util used inside utils
vi.mock('@/utils/ethers-util', () => ({
  default: {
    calcEvmFee: vi.fn((gasPrice: any, gasAmount: any) => `fee(${String(gasPrice)},${String(gasAmount)})`),
    getEvmTransactionReceipt: vi.fn(async (_hash: string) => ({
      fee: { toString: () => '777' },
      from: '0xabc',
      blockNumber: 123,
      blockHash: '0xblock',
    })),
  },
}));

// Minimal mocks for heavy deps that are not used in these tests
vi.mock('@soramitsu/soraneo-wallet-web', () => ({
  api: { system: {}, bridgeProxy: { sub: {}, evm: {}, eth: {} } },
  vuex: { WalletModules: [] },
  WALLET_CONSTS: { ETH_BRIDGE_STATES: { INITIAL: 0 } },
}));

// Avoid pulling in the SDK and its polkadot deps in tests
vi.mock('@sora-substrate/sdk', () => ({
  isEthOperation: () => false,
  isEvmOperation: () => false,
  isSubstrateOperation: () => false,
}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/consts', () => ({
  BridgeNetworkType: { Eth: 'Eth', Evm: 'Evm', Sub: 'Sub' },
}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/evm/consts', () => ({ EvmNetworkId: { EthereumMainnet: 1 } }));
vi.mock('@/consts/evm', () => ({
  KnownEthBridgeAsset: { Other: 'Other', XOR: 'XOR', VAL: 'VAL' },
  SmartContractType: { EthBridge: 'ETH_BRIDGE', ERC20: 'ERC20' },
  SmartContracts: { ETH_BRIDGE: {}, ERC20: {} },
}));
vi.mock('@/utils', () => ({}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/eth/consts', () => ({}));
vi.mock('@sora-substrate/sdk/build/assets/consts', () => ({
  XOR: { address: XOR_ADDRESS },
  TBCD: { address: TBCD_ADDRESS },
}));

vi.mock('ethers', () => ({
  ethers: {
    isError: () => false,
  },
}));

import { isDenominatedAsset, getEvmTransactionFee, getEvmTransactionReceiptByHash } from '@/utils/bridge/common/utils';
import ethersUtil from '@/utils/ethers-util';

describe('bridge common utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isDenominatedAsset returns true for XOR and TBCD', () => {
    expect(isDenominatedAsset(XOR_ADDRESS)).toBe(true);
    expect(isDenominatedAsset(TBCD_ADDRESS)).toBe(true);
  });

  it('isDenominatedAsset returns false for unknown asset', () => {
    expect(isDenominatedAsset('0x0000000000000000000000000000000000000001')).toBe(false);
  });

  it('getEvmTransactionFee delegates to ethersUtil.calcEvmFee', () => {
    const tx: any = { gasPrice: 123n, gasUsed: 456n };
    const fee = getEvmTransactionFee(tx);
    expect(fee).toBe('fee(123,456)');
    expect((ethersUtil as any).calcEvmFee ?? (ethersUtil as any).default?.calcEvmFee).toHaveBeenCalledWith(123n, 456n);
  });

  it('getEvmTransactionReceiptByHash returns parsed receipt data', async () => {
    const res = await getEvmTransactionReceiptByHash('0xhash');
    expect(res).toEqual({ fee: '777', from: '0xabc', blockNumber: 123, blockHash: '0xblock' });
  });
});
