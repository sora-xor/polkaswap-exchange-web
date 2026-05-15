import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  XOR_ADDRESS,
  TBCD_ADDRESS,
  isEthOperationMock,
  isEvmOperationMock,
  isSubstrateOperationMock,
  ethOutgoingMock,
  ethUnsignedMock,
  ethWaitingMock,
  evmOutgoingMock,
  evmUnsignedMock,
  subOutgoingMock,
  subUnsignedMock,
  isEthersErrorMock,
} = vi.hoisted(() => ({
  XOR_ADDRESS: 'xor',
  TBCD_ADDRESS: 'tbcd',
  isEthOperationMock: vi.fn(),
  isEvmOperationMock: vi.fn(),
  isSubstrateOperationMock: vi.fn(),
  ethOutgoingMock: vi.fn(),
  ethUnsignedMock: vi.fn(),
  ethWaitingMock: vi.fn(),
  evmOutgoingMock: vi.fn(),
  evmUnsignedMock: vi.fn(),
  subOutgoingMock: vi.fn(),
  subUnsignedMock: vi.fn(),
  isEthersErrorMock: vi.fn(),
}));

// Mock ethers-util used inside utils
vi.mock('@/utils/ethers-util', () => ({
  default: {
    calcEvmFee: vi.fn((gasPrice: any, gasAmount: any) => `fee(${String(gasPrice)},${String(gasAmount)})`),
    getBlockNumber: vi.fn(),
    getEvmTransaction: vi.fn(),
    getEvmTransactionReceipt: vi.fn(async (_hash: string) => ({
      fee: { toString: () => '777' },
      from: '0xabc',
      blockNumber: 123,
      blockHash: '0xblock',
    })),
  },
}));

// Minimal mocks for heavy deps that are not used in these tests
vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock, withWalletMock } = await import('@tests/stubs/createWalletMock');
  const wallet = createWalletMock();

  return withWalletMock(wallet, {
    api: {
      ...wallet.api,
      bridgeProxy: {
        eth: {},
        evm: {},
        sub: {},
      },
      system: {
        getBlockEvents: vi.fn(),
        getExtrinsicsFromBlock: vi.fn(),
      },
    },
    WALLET_CONSTS: {
      ...wallet.WALLET_CONSTS,
      ETH_BRIDGE_STATES: {
        ...(wallet.WALLET_CONSTS?.ETH_BRIDGE_STATES ?? {}),
        INITIAL: 0,
        SORA_REJECTED: 1,
        SORA_COMMITED: 2,
        EVM_REJECTED: 3,
      },
    },
  });
});

// Avoid pulling in the SDK and its polkadot deps in tests
vi.mock('@sora-substrate/sdk', () => ({
  isEthOperation: isEthOperationMock,
  isEvmOperation: isEvmOperationMock,
  isSubstrateOperation: isSubstrateOperationMock,
  api: {
    setStorage: vi.fn(),
    shouldPairBeLocked: false,
    initKeyring: vi.fn(),
  },
  connection: {},
  Operation: {
    SwapAndSend: 'SwapAndSend',
    Transfer: 'Transfer',
    VestedTransfer: 'VestedTransfer',
    SwapTransferBatch: 'SwapTransferBatch',
    Mint: 'Mint',
  },
  TransactionStatus: {
    Finalized: 'Finalized',
    Pending: 'Pending',
    Failed: 'Failed',
  },
}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/consts', () => ({
  BridgeNetworkType: { Eth: 'Eth', Evm: 'Evm', Sub: 'Sub' },
  BridgeTxDirection: { Outgoing: 'Outgoing', Incoming: 'Incoming' },
  BridgeTxStatus: { Pending: 'Pending', Ready: 'Ready', Failed: 'Failed' },
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
  XSTUSD: { address: 'xstusd' },
  VXOR: { address: 'vxor' },
  BalanceType: {
    Transferable: 'Transferable',
    Total: 'Total',
    Locked: 'Locked',
  },
}));

vi.mock('@/utils/bridge/eth/utils', () => ({
  isOutgoingTx: ethOutgoingMock,
  isUnsignedTx: ethUnsignedMock,
  isWaitingForAction: ethWaitingMock,
}));

vi.mock('@/utils/bridge/evm/utils', () => ({
  isOutgoingTx: evmOutgoingMock,
  isUnsignedTx: evmUnsignedMock,
}));

vi.mock('@/utils/bridge/sub/utils', () => ({
  isOutgoingTx: subOutgoingMock,
  isUnsignedTx: subUnsignedMock,
}));

vi.mock('ethers', () => ({
  ethers: {
    isError: isEthersErrorMock,
  },
}));

import {
  getBlockEventsByTxIndex,
  getEvmTransactionFee,
  getEvmTransactionReceiptByHash,
  getTransactionEvents,
  isDenominatedAsset,
  isOutgoingTransaction,
  isUnsignedTx,
  isWaitingForAction,
  onEvmTransactionPending,
  waitForEvmTransactionMined,
} from '@/utils/bridge/common/utils';
import { api as soraApi } from '@/lib/soraneo-wallet/src/api';
import ethersUtil from '@/utils/ethers-util';

describe('bridge common utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isEthOperationMock.mockImplementation((type: string) => type === 'eth');
    isEvmOperationMock.mockImplementation((type: string) => type === 'evm');
    isSubstrateOperationMock.mockImplementation((type: string) => type === 'sub');
    ethOutgoingMock.mockReturnValue(true);
    ethUnsignedMock.mockReturnValue(false);
    ethWaitingMock.mockReturnValue(true);
    evmOutgoingMock.mockReturnValue(false);
    evmUnsignedMock.mockReturnValue(true);
    subOutgoingMock.mockReturnValue(true);
    subUnsignedMock.mockReturnValue(false);
    isEthersErrorMock.mockReturnValue(false);
    (ethersUtil.getBlockNumber as any).mockResolvedValue(100);
    (ethersUtil.getEvmTransaction as any).mockResolvedValue(null);
    (ethersUtil.getEvmTransactionReceipt as any).mockResolvedValue({
      fee: { toString: () => '777' },
      from: '0xabc',
      blockNumber: 123,
      blockHash: '0xblock',
    });
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

  it('getEvmTransactionFee uses gasLimit when a transaction is not mined yet', () => {
    const tx: any = { gasPrice: 123n, gasLimit: 21000n };

    expect(getEvmTransactionFee(tx)).toBe('fee(123,21000)');
    expect(ethersUtil.calcEvmFee).toHaveBeenCalledWith(123n, 21000n);
  });

  it('getEvmTransactionReceiptByHash returns parsed receipt data', async () => {
    const res = await getEvmTransactionReceiptByHash('0xhash');
    expect(res).toEqual({ fee: '777', from: '0xabc', blockNumber: 123, blockHash: '0xblock' });
  });

  it('getEvmTransactionReceiptByHash returns null when receipt lookup fails', async () => {
    (ethersUtil.getEvmTransactionReceipt as any).mockRejectedValueOnce(new Error('missing receipt'));

    await expect(getEvmTransactionReceiptByHash('0xmissing')).resolves.toBeNull();
  });

  it('waitForEvmTransactionMined rejects empty transactions', async () => {
    await expect(waitForEvmTransactionMined(null)).rejects.toThrow('[waitForEvmTransactionMined]: tx cannot be empty!');
  });

  it('waitForEvmTransactionMined waits for a replaceable transaction from the transaction block', async () => {
    const receipt = { hash: '0xreceipt' };
    const wait = vi.fn().mockResolvedValue(receipt);
    const replaceableTransaction = vi.fn(() => ({ wait }));
    const tx: any = {
      blockNumber: 55,
      replaceableTransaction,
    };

    await expect(waitForEvmTransactionMined(tx)).resolves.toBe(receipt);

    expect(replaceableTransaction).toHaveBeenCalledWith(55);
    expect(wait).toHaveBeenCalledTimes(1);
    expect(ethersUtil.getBlockNumber).not.toHaveBeenCalled();
  });

  it('waitForEvmTransactionMined follows replacement transactions and reports the new hash', async () => {
    const receipt = { hash: '0xreplacementReceipt' };
    const replacementWait = vi.fn().mockResolvedValue(receipt);
    const replacementTx: any = {
      hash: '0xreplacement',
      to: '0xbridge',
      data: '0xabcdef',
      value: 0n,
      blockNumber: 77,
      replaceableTransaction: vi.fn(() => ({ wait: replacementWait })),
    };
    const replacedError = { cancelled: false, reason: 'repriced', replacement: replacementTx };
    const originalTx: any = {
      hash: '0xoriginal',
      to: '0xbridge',
      data: '0xabcdef',
      value: 0n,
      blockNumber: undefined,
      replaceableTransaction: vi.fn(() => ({
        wait: vi.fn().mockRejectedValue(replacedError),
      })),
    };
    const replaceCallback = vi.fn();
    isEthersErrorMock.mockImplementation(
      (error: unknown, code: string) => code === 'TRANSACTION_REPLACED' && error === replacedError
    );

    await expect(waitForEvmTransactionMined(originalTx, replaceCallback)).resolves.toBe(receipt);

    expect(ethersUtil.getBlockNumber).toHaveBeenCalledTimes(1);
    expect(originalTx.replaceableTransaction).toHaveBeenCalledWith(100);
    expect(replaceCallback).toHaveBeenCalledWith(replacementTx);
    expect(replacementTx.replaceableTransaction).toHaveBeenCalledWith(77);
  });

  it('waitForEvmTransactionMined rejects same-nonce replacements that change the EVM action', async () => {
    const replacementTx: any = {
      hash: '0xcancel',
      to: '0xuser',
      data: '0x',
      value: 0n,
      blockNumber: 77,
      replaceableTransaction: vi.fn(() => ({
        wait: vi.fn().mockResolvedValue({ status: 1 }),
      })),
    };
    const replacedError = { cancelled: true, reason: 'cancelled', replacement: replacementTx };
    const originalTx: any = {
      hash: '0xoriginal',
      to: '0xbridge',
      data: '0xabcdef',
      value: 0n,
      blockNumber: 10,
      replaceableTransaction: vi.fn(() => ({
        wait: vi.fn().mockRejectedValue(replacedError),
      })),
    };
    const replaceCallback = vi.fn();
    isEthersErrorMock.mockImplementation(
      (error: unknown, code: string) => code === 'TRANSACTION_REPLACED' && error === replacedError
    );

    await expect(waitForEvmTransactionMined(originalTx, replaceCallback)).rejects.toThrow(
      '[waitForEvmTransactionMined]: EVM transaction 0xoriginal was replaced by a different transaction'
    );
    expect(replaceCallback).not.toHaveBeenCalled();
  });

  it('waitForEvmTransactionMined rethrows non-replacement wait failures', async () => {
    const waitError = new Error('rpc timeout');
    const tx: any = {
      blockNumber: 10,
      replaceableTransaction: vi.fn(() => ({
        wait: vi.fn().mockRejectedValue(waitError),
      })),
    };

    await expect(waitForEvmTransactionMined(tx)).rejects.toBe(waitError);
  });

  it('getBlockEventsByTxIndex filters block events by extrinsic phase index', async () => {
    const matchingEvent = {
      phase: {
        isApplyExtrinsic: true,
        asApplyExtrinsic: { toNumber: () => 2 },
      },
    };
    const skippedEvent = {
      phase: {
        isApplyExtrinsic: true,
        asApplyExtrinsic: { toNumber: () => 1 },
      },
    };
    const skippedInitializationEvent = {
      phase: {
        isApplyExtrinsic: false,
        asApplyExtrinsic: { toNumber: () => 2 },
      },
    };
    (soraApi.system.getBlockEvents as any).mockResolvedValue([matchingEvent, skippedEvent, skippedInitializationEvent]);

    await expect(getBlockEventsByTxIndex('0xblock', 2, {} as any)).resolves.toEqual([matchingEvent]);
    expect(soraApi.system.getBlockEvents).toHaveBeenCalledWith('0xblock', {});
  });

  it('getTransactionEvents resolves an extrinsic index and returns its events', async () => {
    const transactionEvent = {
      phase: {
        isApplyExtrinsic: true,
        asApplyExtrinsic: { toNumber: () => 1 },
      },
    };
    (soraApi.system.getExtrinsicsFromBlock as any).mockResolvedValue([
      { hash: { toString: () => '0xfirst' } },
      { hash: { toString: () => '0xtarget' } },
    ]);
    (soraApi.system.getBlockEvents as any).mockResolvedValue([transactionEvent]);

    await expect(getTransactionEvents('0xblock', '0xtarget', {} as any)).resolves.toEqual([transactionEvent]);
    expect(soraApi.system.getBlockEvents).toHaveBeenCalledWith('0xblock', {});
  });

  it('getTransactionEvents throws when the target extrinsic is missing', async () => {
    (soraApi.system.getExtrinsicsFromBlock as any).mockResolvedValue([{ hash: { toString: () => '0xother' } }]);

    await expect(getTransactionEvents('0xblock', '0xtarget', {} as any)).rejects.toThrow(
      'Unable to find extrinsic "0xtarget" in block "0xblock"'
    );
  });

  it('routes outgoing, unsigned, and waiting checks by bridge operation family', () => {
    const ethTx = { type: 'eth' } as any;
    const evmTx = { type: 'evm' } as any;
    const subTx = { type: 'sub' } as any;

    expect(isOutgoingTransaction(null)).toBe(false);
    expect(isOutgoingTransaction(ethTx)).toBe(true);
    expect(isOutgoingTransaction(evmTx)).toBe(false);
    expect(isOutgoingTransaction(subTx)).toBe(true);

    expect(isUnsignedTx(null)).toBe(true);
    expect(isUnsignedTx(ethTx)).toBe(false);
    expect(isUnsignedTx(evmTx)).toBe(true);
    expect(isUnsignedTx(subTx)).toBe(false);

    expect(isWaitingForAction(null)).toBe(false);
    expect(isWaitingForAction(ethTx)).toBe(true);
    expect(isWaitingForAction(evmTx)).toBe(false);

    expect(ethOutgoingMock).toHaveBeenCalledWith(ethTx);
    expect(evmUnsignedMock).toHaveBeenCalledWith(evmTx);
    expect(subUnsignedMock).toHaveBeenCalledWith(subTx);
  });

  it('defaults operation checks for unknown bridge operation types', () => {
    const unknownTx = { type: 'unknown' } as any;

    expect(isOutgoingTransaction(unknownTx)).toBe(false);
    expect(isUnsignedTx(unknownTx)).toBe(true);
    expect(isWaitingForAction(unknownTx)).toBe(false);
  });

  it('onEvmTransactionPending rejects transactions without an EVM hash', async () => {
    await expect(onEvmTransactionPending('tx-id', () => ({ externalHash: '' }) as any, vi.fn())).rejects.toThrow(
      '[onEvmTransactionPending] Evm transaction hash is empty'
    );
  });

  it('onEvmTransactionPending updates mined receipt metadata', async () => {
    const txResponse = {
      blockNumber: 10,
      replaceableTransaction: vi.fn(() => ({
        wait: vi.fn().mockResolvedValue({
          fee: { toString: () => '900' },
          blockNumber: 321,
          blockHash: '0xevmBlock',
          status: 1,
        }),
      })),
    };
    (ethersUtil.getEvmTransaction as any).mockResolvedValue(txResponse);
    const updateTransaction = vi.fn();

    await onEvmTransactionPending('tx-id', () => ({ externalHash: '0xevm' }) as any, updateTransaction);

    expect(ethersUtil.getEvmTransaction).toHaveBeenCalledWith('0xevm');
    expect(updateTransaction).toHaveBeenCalledWith('tx-id', {
      externalNetworkFee: '900',
      externalBlockHeight: 321,
      externalBlockId: '0xevmBlock',
    });
  });

  it('onEvmTransactionPending stores replacement transaction hashes before mined metadata', async () => {
    const receipt = {
      fee: { toString: () => '11' },
      blockNumber: 321,
      blockHash: '0xevmBlock',
      status: 1,
    };
    const replacementTx: any = {
      hash: '0xreplacement',
      to: '0xbridge',
      data: '0xabcdef',
      value: 0n,
      gasPrice: 2n,
      gasLimit: 3n,
      blockNumber: 11,
      replaceableTransaction: vi.fn(() => ({
        wait: vi.fn().mockResolvedValue(receipt),
      })),
    };
    const replacementError = { cancelled: false, reason: 'repriced', replacement: replacementTx };
    const txResponse = {
      hash: '0xoriginal',
      to: '0xbridge',
      data: '0xabcdef',
      value: 0n,
      blockNumber: 10,
      replaceableTransaction: vi.fn(() => ({
        wait: vi.fn().mockRejectedValue(replacementError),
      })),
    };
    isEthersErrorMock.mockImplementation(
      (error: unknown, code: string) => code === 'TRANSACTION_REPLACED' && error === replacementError
    );
    (ethersUtil.getEvmTransaction as any).mockResolvedValue(txResponse);
    const updateTransaction = vi.fn();

    await onEvmTransactionPending('tx-id', () => ({ externalHash: '0xoriginal' }) as any, updateTransaction);

    expect(updateTransaction).toHaveBeenNthCalledWith(1, 'tx-id', {
      externalHash: '0xreplacement',
      externalNetworkFee: 'fee(2,3)',
    });
    expect(updateTransaction).toHaveBeenNthCalledWith(2, 'tx-id', {
      externalNetworkFee: '11',
      externalBlockHeight: 321,
      externalBlockId: '0xevmBlock',
    });
  });

  it('onEvmTransactionPending does not accept a mined replacement with different bridge calldata', async () => {
    const replacementTx: any = {
      hash: '0xreplacement',
      to: '0xbridge',
      data: '0xdifferent',
      value: 0n,
      blockNumber: 11,
      replaceableTransaction: vi.fn(() => ({
        wait: vi.fn().mockResolvedValue({
          fee: { toString: () => '11' },
          blockNumber: 321,
          blockHash: '0xevmBlock',
          status: 1,
        }),
      })),
    };
    const replacementError = { cancelled: true, reason: 'replaced', replacement: replacementTx };
    const txResponse = {
      hash: '0xoriginal',
      to: '0xbridge',
      data: '0xabcdef',
      value: 0n,
      blockNumber: 10,
      replaceableTransaction: vi.fn(() => ({
        wait: vi.fn().mockRejectedValue(replacementError),
      })),
    };
    isEthersErrorMock.mockImplementation(
      (error: unknown, code: string) => code === 'TRANSACTION_REPLACED' && error === replacementError
    );
    (ethersUtil.getEvmTransaction as any).mockResolvedValue(txResponse);
    const updateTransaction = vi.fn();

    await expect(
      onEvmTransactionPending('tx-id', () => ({ externalHash: '0xoriginal' }) as any, updateTransaction)
    ).rejects.toThrow(
      '[waitForEvmTransactionMined]: EVM transaction 0xoriginal was replaced by a different transaction'
    );
    expect(updateTransaction).not.toHaveBeenCalledWith(
      'tx-id',
      expect.objectContaining({ externalHash: '0xreplacement' })
    );
    expect(updateTransaction).not.toHaveBeenCalledWith('tx-id', expect.objectContaining({ externalBlockHeight: 321 }));
  });

  it('onEvmTransactionPending falls back to receipt lookup when the transaction response is unavailable', async () => {
    (ethersUtil.getEvmTransaction as any).mockResolvedValue(null);
    (ethersUtil.getEvmTransactionReceipt as any).mockResolvedValueOnce({
      fee: { toString: () => '42' },
      from: '0xsender',
      blockNumber: 654,
      blockHash: '0xreceiptBlock',
      status: 1,
    });
    const updateTransaction = vi.fn();

    await onEvmTransactionPending('tx-id', () => ({ externalHash: '0xmined' }) as any, updateTransaction);

    expect(ethersUtil.getEvmTransactionReceipt).toHaveBeenCalledWith('0xmined');
    expect(updateTransaction).toHaveBeenCalledWith('tx-id', {
      externalNetworkFee: '42',
      externalBlockHeight: 654,
      externalBlockId: '0xreceiptBlock',
    });
  });

  it('onEvmTransactionPending preserves the EVM hash when no mined receipt is available', async () => {
    (ethersUtil.getEvmTransaction as any).mockResolvedValue({
      blockNumber: 10,
      replaceableTransaction: vi.fn(() => ({
        wait: vi.fn().mockResolvedValue(null),
      })),
    });
    (ethersUtil.getEvmTransactionReceipt as any).mockResolvedValueOnce(null);
    const updateTransaction = vi.fn();

    await expect(
      onEvmTransactionPending('tx-id', () => ({ externalHash: '0xmissing' }) as any, updateTransaction)
    ).rejects.toThrow('[onEvmTransactionPending]: Ethereum transaction receipt not found, hash: 0xmissing.');

    expect(updateTransaction).not.toHaveBeenCalledWith(
      'tx-id',
      expect.objectContaining({ externalHash: undefined })
    );
  });

  it('onEvmTransactionPending rejects failed EVM receipts after saving receipt metadata', async () => {
    (ethersUtil.getEvmTransaction as any).mockResolvedValue({
      blockNumber: 10,
      replaceableTransaction: vi.fn(() => ({
        wait: vi.fn().mockResolvedValue({
          fee: { toString: () => '1' },
          blockNumber: 321,
          blockHash: '0xevmBlock',
          status: 0,
        }),
      })),
    });
    const updateTransaction = vi.fn();

    await expect(
      onEvmTransactionPending('tx-id', () => ({ externalHash: '0xfailed' }) as any, updateTransaction)
    ).rejects.toThrow('[onEvmTransactionPending]: Ethereum transaction has failed status, hash: 0xfailed.');

    expect(updateTransaction).toHaveBeenCalledWith('tx-id', {
      externalNetworkFee: '1',
      externalBlockHeight: 321,
      externalBlockId: '0xevmBlock',
    });
  });
});
