import { Operation, TransactionStatus } from '@sora-substrate/sdk';
import { BridgeNetworkType, BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { encodeAddress } from '@polkadot/util-crypto';
import { Observable, NEVER, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SubTransferType } from '@/utils/bridge/sub/types';
import {
  SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY,
  SubBridgeAuthoritativeStatus,
  SubBridgeReconciliationErrorCode,
} from '@/utils/bridge/sub/reconciliation';

vi.mock('@polkadot/util-crypto', () => ({
  cryptoWaitReady: async () => true,
  encodeAddress: (publicKey: Uint8Array, prefix = 42) => `test:${prefix}:${Array.from(publicKey).join('.')}`,
  decodeAddress: (address: string) => {
    const match = /^test:\d+:(\d+(?:\.\d+)*)$/.exec(address);
    if (!match) throw new Error('Invalid test address');

    return Uint8Array.from(match[1].split('.').map(Number));
  },
}));

const setDeferredInterval: typeof setInterval = (handler, timeout, ...args) =>
  setTimeout(handler, timeout, ...args) as unknown as ReturnType<typeof setInterval>;
const clearDeferredInterval: typeof clearInterval = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>);

const reducerMocks = vi.hoisted(() => ({
  system: {
    getBlockHashObservable: vi.fn(),
    getEventsObservable: vi.fn(),
    getBlockNumberObservable: vi.fn(),
    getBlockHash: vi.fn(),
    getBlockNumber: vi.fn(),
    getExtrinsicsFromBlock: vi.fn(),
  },
  subBridgeApi: {
    api: {
      query: {
        bridgeProxy: {
          transactions: vi.fn(),
        },
      },
    },
    apiRx: {},
    history: {} as Record<string, any>,
    getHistory: vi.fn(),
    saveHistory: vi.fn(),
    getTransactionDetails: vi.fn(),
    isEvmAccount: vi.fn(() => false),
    prepareNetworkParam: vi.fn(),
    subscribeOnTransactionDetails: vi.fn(),
  },
  common: {
    getTransactionEvents: vi.fn(),
  },
  subUtils: {
    getSoraBridgeProviderHash: vi.fn(),
    getMessageAcceptedNonces: vi.fn(),
    hasSubBridgeIncomingSubmissionEvidence: vi.fn(),
    isSoraBridgeAppBurned: vi.fn(),
  },
  connector: {
    init: vi.fn(),
    stop: vi.fn(),
  },
  ethersGetAccount: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    system: reducerMocks.system,
  },
}));

vi.mock('@/utils/bridge/sub/api', () => ({
  subBridgeApi: reducerMocks.subBridgeApi,
}));

vi.mock('@/utils/bridge/sub/classes/adapter', () => ({
  SubNetworksConnector: class {
    init(...args: unknown[]) {
      return reducerMocks.connector.init(...args);
    }

    stop() {
      return reducerMocks.connector.stop();
    }
  },
}));

vi.mock('@/utils/ethers-util', () => ({
  default: {
    getAccount: reducerMocks.ethersGetAccount,
  },
}));

vi.mock('@/utils/bridge/common/utils', () => ({
  getTransactionEvents: reducerMocks.common.getTransactionEvents,
  isUnsignedTx: vi.fn(() => false),
}));

vi.mock('@/utils/bridge/sub/utils', async () => {
  const actual = await vi.importActual<typeof import('@/utils/bridge/sub/utils')>('@/utils/bridge/sub/utils');

  return {
    ...actual,
    determineTransferType: vi.fn(() => SubTransferType.Standalone),
    getBridgeProxyHash: vi.fn(),
    getSoraBridgeProviderHash: reducerMocks.subUtils.getSoraBridgeProviderHash,
    getDepositedBalance: vi.fn(),
    getMessageAcceptedNonces: reducerMocks.subUtils.getMessageAcceptedNonces,
    hasSubBridgeIncomingSubmissionEvidence: reducerMocks.subUtils.hasSubBridgeIncomingSubmissionEvidence,
    isMessageDispatchedNonces: vi.fn(),
    isAssetAddedToChannel: vi.fn(),
    isSoraBridgeAppBurned: reducerMocks.subUtils.isSoraBridgeAppBurned,
    getReceivedAmount: vi.fn(),
    getParachainSystemMessageHash: vi.fn(),
    isXcmPalletAttempted: vi.fn(),
    isTransactionFeePaid: vi.fn(),
    isQueueMessage: vi.fn(),
  };
});

import {
  findSubstrateTransactionBlock,
  SORA_BRIDGE_DETAILS_TIMEOUT_MS,
  SUBSTRATE_TRANSACTION_RECOVERY_TIMEOUT_MS,
  SubBridgeIncomingReducer,
  SubBridgeOutgoingReducer,
  SubBridgeReducer,
} from '@/utils/bridge/sub/classes/reducers';
import { getTransaction, updateTransaction } from '@/utils/bridge/sub/utils';

const transactionHash = `0x${'a'.repeat(64)}`;

const createReducerOptions = (transaction: Record<string, any>, updateTransaction = vi.fn()) => ({
  addAsset: vi.fn(),
  getAssetByAddress: vi.fn(),
  getTransaction: vi.fn(() => transaction),
  updateTransaction,
  updateHistory: vi.fn(),
  showNotification: vi.fn(),
  getActiveTransaction: vi.fn(() => transaction),
  addTransactionToProgress: vi.fn(),
  removeTransactionFromProgress: vi.fn(),
  beforeTransactionSign: vi.fn(),
  boundaryStates: {},
  getSubBridgeConnector: vi.fn(),
});

describe('Sub bridge reducer observable waits', () => {
  beforeEach(() => {
    // The global test harness runs intervals immediately, while RxJS timeout
    // requires a real scheduler so source events can win before the deadline.
    vi.stubGlobal('setInterval', setDeferredInterval);
    vi.stubGlobal('clearInterval', clearDeferredInterval);
    vi.clearAllMocks();
    reducerMocks.connector.init.mockResolvedValue(undefined);
    reducerMocks.connector.stop.mockResolvedValue(undefined);
    reducerMocks.ethersGetAccount.mockResolvedValue(`0x${'a'.repeat(40)}`);
    reducerMocks.subBridgeApi.getTransactionDetails.mockResolvedValue(null);
    reducerMocks.subBridgeApi.history = {};
    reducerMocks.subBridgeApi.getHistory.mockImplementation(
      (id: string) => reducerMocks.subBridgeApi.history[id] ?? null
    );
    reducerMocks.subBridgeApi.saveHistory.mockImplementation((transaction: Record<string, any>) => {
      reducerMocks.subBridgeApi.history[transaction.id] = transaction;
    });
    reducerMocks.subBridgeApi.isEvmAccount.mockReturnValue(false);
    reducerMocks.subBridgeApi.prepareNetworkParam.mockImplementation((network) => network);
    reducerMocks.subBridgeApi.api.query.bridgeProxy.transactions.mockResolvedValue({ isSome: false });
    reducerMocks.subUtils.hasSubBridgeIncomingSubmissionEvidence.mockImplementation(
      (tx: Record<string, any>) =>
        tx.type === Operation.SubstrateIncoming &&
        Boolean(
          tx.txId ||
          tx.externalHash ||
          tx.blockId ||
          tx.externalBlockId ||
          tx.hash ||
          tx.payload?.startBlock !== undefined ||
          tx.payload?.batchNonce !== undefined ||
          tx.payload?.messageNonce !== undefined
        )
    );
    reducerMocks.subUtils.isSoraBridgeAppBurned.mockReturnValue(false);
    reducerMocks.system.getBlockHash.mockResolvedValue('0xsora-block');
    reducerMocks.system.getBlockNumber.mockResolvedValue(102);
    reducerMocks.system.getExtrinsicsFromBlock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('awaits connector initialization and teardown', async () => {
    let resolveInit!: () => void;
    let resolveStop!: () => void;
    reducerMocks.connector.init.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveInit = resolve;
      })
    );
    reducerMocks.connector.stop.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveStop = resolve;
      })
    );
    const existingConnector = {};
    const options = createReducerOptions({ externalNetwork: 'Liberland' });
    options.getSubBridgeConnector.mockReturnValue(existingConnector);
    const reducer = new SubBridgeReducer(options as any);
    let initialized = false;
    const initPromise = reducer.initConnector('tx-incoming').then(() => {
      initialized = true;
    });

    await Promise.resolve();
    expect(initialized).toBe(false);
    resolveInit();
    await initPromise;

    let stopped = false;
    const stopPromise = reducer.closeConnector().then(() => {
      stopped = true;
    });

    await Promise.resolve();
    expect(stopped).toBe(false);
    resolveStop();
    await stopPromise;

    expect(reducerMocks.connector.init).toHaveBeenCalledWith('Liberland', existingConnector);
    expect(reducerMocks.connector.stop).toHaveBeenCalledTimes(1);
  });

  it('stops the account-bound connector when managed tracking is canceled', async () => {
    const reducer = new SubBridgeReducer(createReducerOptions({ externalNetwork: 'Liberland' }) as any);

    await reducer.initConnector('tx-incoming');
    reducerMocks.connector.stop.mockClear();
    await (reducer as any).onTrackingAbort();

    expect(reducerMocks.connector.stop).toHaveBeenCalledTimes(1);
  });

  it.each([BridgeTxStatus.Pending, BridgeTxStatus.Failed])(
    'does not process display-only recovered history in misleading %s state',
    async (transactionState) => {
      const transaction = {
        id: 'settlement',
        txId: 'settlement',
        hash: 'stale-request',
        type: Operation.SubstrateIncoming,
        transactionState,
        externalNetwork: SubNetworkId.Liberland,
        externalNetworkType: BridgeNetworkType.Sub,
        payload: {
          startBlock: 1,
          submissionState: 'broadcast',
          subBridgeHistoryRecovery: SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY,
        },
      };
      const update = vi.fn();
      const options = createReducerOptions(transaction, update);
      const reducer = new SubBridgeIncomingReducer(options as any);

      await reducer.changeState(transaction as any);

      expect(update).not.toHaveBeenCalled();
      expect(options.addTransactionToProgress).not.toHaveBeenCalled();
      expect(options.beforeTransactionSign).not.toHaveBeenCalled();
      expect(reducerMocks.connector.init).not.toHaveBeenCalled();
    }
  );

  it('rejects an unsigned incoming transfer before prompting when the connected signer differs', async () => {
    const recordedPublicKey = new Uint8Array(32).fill(1);
    const connectedPublicKey = new Uint8Array(32).fill(2);
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      externalNetwork: 'Liberland',
      assetAddress: 'asset-id',
      amount: '1',
      from: 'sora-recipient',
      to: encodeAddress(recordedPublicKey, 42),
    };
    const options = createReducerOptions(transaction);
    options.getAssetByAddress.mockReturnValue({ address: 'asset-id' });
    const reducer = new SubBridgeIncomingReducer(options as any);
    const start = vi.fn();
    const incomingTransfer = vi.fn();

    Object.assign(reducer as any, {
      connector: {
        accountApi: { address: encodeAddress(connectedPublicKey, 42) },
        start,
        incomingTransfer,
      },
    });

    await expect((reducer as any).checkTxId(transaction.id)).rejects.toThrow(
      `Change account in external wallet to ${transaction.to}`
    );

    expect(options.beforeTransactionSign).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    expect(incomingTransfer).not.toHaveBeenCalled();
  });

  it('accepts the same incoming signer encoded with a different SS58 prefix', async () => {
    const publicKey = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      externalNetwork: 'Liberland',
      assetAddress: 'asset-id',
      amount: '1',
      from: 'sora-recipient',
      to: encodeAddress(publicKey, 42),
    };
    const options = createReducerOptions(transaction);
    const asset = { address: 'asset-id' };
    options.getAssetByAddress.mockReturnValue(asset);
    const reducer = new SubBridgeIncomingReducer(options as any);
    const start = vi.fn(async () => undefined);
    const incomingTransfer = vi.fn(async () => undefined);
    const saveStartBlock = vi.spyOn(reducer, 'saveStartBlock').mockResolvedValue(undefined);

    Object.assign(reducer as any, {
      connector: {
        accountApi: { address: encodeAddress(publicKey, 0) },
        start,
        incomingTransfer,
      },
    });

    await expect((reducer as any).checkTxId(transaction.id)).resolves.toBeUndefined();

    expect(options.beforeTransactionSign).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(incomingTransfer).toHaveBeenCalledWith(asset, transaction.from, transaction.amount, transaction.id);
    expect(saveStartBlock).toHaveBeenCalledWith(transaction.id);
  });

  it('validates an EVM-account Sub bridge against the connected EVM signer', async () => {
    const recordedAccount = `0x${'a'.repeat(40)}`;
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      externalNetwork: 'Moonbase',
      assetAddress: 'asset-id',
      amount: '1',
      from: 'sora-recipient',
      to: recordedAccount,
    };
    const options = createReducerOptions(transaction);
    const asset = { address: 'asset-id' };
    options.getAssetByAddress.mockReturnValue(asset);
    reducerMocks.subBridgeApi.isEvmAccount.mockReturnValue(true);
    reducerMocks.ethersGetAccount.mockResolvedValue(recordedAccount.toUpperCase());
    const reducer = new SubBridgeIncomingReducer(options as any);
    const start = vi.fn(async () => undefined);
    const incomingTransfer = vi.fn(async () => undefined);
    const saveStartBlock = vi.spyOn(reducer, 'saveStartBlock').mockResolvedValue(undefined);

    Object.assign(reducer as any, {
      connector: {
        accountApi: { address: encodeAddress(new Uint8Array(32).fill(9), 42) },
        start,
        incomingTransfer,
      },
    });

    await expect((reducer as any).checkTxId(transaction.id)).resolves.toBeUndefined();

    expect(reducerMocks.ethersGetAccount).toHaveBeenCalledTimes(1);
    expect(options.beforeTransactionSign).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(incomingTransfer).toHaveBeenCalledWith(asset, transaction.from, transaction.amount, transaction.id);
    expect(saveStartBlock).toHaveBeenCalledWith(transaction.id);
  });

  it('restores a transaction block from the bounded submission window', async () => {
    reducerMocks.system.getBlockHash.mockImplementation(async (blockHeight: number) => `0xblock-${blockHeight}`);
    reducerMocks.system.getExtrinsicsFromBlock.mockImplementation(async (blockId: string) =>
      blockId === '0xblock-101' ? [{ hash: { toString: () => transactionHash } }] : []
    );

    await expect(findSubstrateTransactionBlock(transactionHash, 100, {} as never)).resolves.toEqual({
      blockId: '0xblock-101',
      blockHeight: 101,
    });

    expect(reducerMocks.system.getBlockHash).toHaveBeenCalledWith(98, {});
    expect(reducerMocks.system.getBlockHash).toHaveBeenCalledWith(101, {});
    expect(reducerMocks.system.getBlockHash).not.toHaveBeenCalledWith(102 + 1, {});
  });

  it('restores a queued transaction more than ten blocks after submission', async () => {
    reducerMocks.system.getBlockNumber.mockResolvedValue(200);
    reducerMocks.system.getBlockHash.mockImplementation(async (blockHeight: number) => `0xblock-${blockHeight}`);
    reducerMocks.system.getExtrinsicsFromBlock.mockImplementation(async (blockId: string) =>
      blockId === '0xblock-132' ? [{ hash: { toString: () => transactionHash } }] : []
    );

    await expect(findSubstrateTransactionBlock(transactionHash, 100, {} as never)).resolves.toEqual({
      blockId: '0xblock-132',
      blockHeight: 132,
    });
  });

  it('restores broadcast transactions immediately instead of waiting for the timeout', async () => {
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      status: TransactionStatus.Broadcast,
      txId: transactionHash,
      payload: { startBlock: 100 },
    };
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction) as any);
    const restoreSpy = vi.spyOn(reducer as any, 'restoreTransactionBlockId').mockResolvedValue(true);
    const waitForBlockSpy = vi.spyOn(reducer, 'waitForTransactionBlockId').mockResolvedValue(undefined);

    Object.assign(reducer as any, { transferType: SubTransferType.Standalone });

    await reducer.waitForTxBlockAndStatus(transaction.id);

    expect(restoreSpy).toHaveBeenCalledWith(transaction.id);
    expect(waitForBlockSpy).not.toHaveBeenCalled();
  });

  it('keeps waiting when a fresh broadcast transaction is not in the recovery window yet', async () => {
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      status: TransactionStatus.Broadcast,
      txId: transactionHash,
      payload: { startBlock: 100 },
    };
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction) as any);
    const restoreSpy = vi.spyOn(reducer as any, 'restoreTransactionBlockId').mockResolvedValue(false);
    const waitForBlockSpy = vi.spyOn(reducer, 'waitForTransactionBlockId').mockResolvedValue(undefined);

    Object.assign(reducer as any, { transferType: SubTransferType.Standalone });

    await reducer.waitForTxBlockAndStatus(transaction.id);

    expect(restoreSpy).toHaveBeenCalledWith(transaction.id);
    expect(waitForBlockSpy).toHaveBeenCalledWith(transaction.id);
  });

  it('recovers a signed standalone transaction even when no status callback was persisted', async () => {
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      txId: transactionHash,
      payload: { startBlock: 100 },
    };
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction) as any);
    const waitForStatusSpy = vi.spyOn(reducer, 'waitForTransactionStatus').mockResolvedValue(undefined);
    const restoreSpy = vi.spyOn(reducer as any, 'restoreTransactionBlockId').mockResolvedValue(true);
    const waitForBlockSpy = vi.spyOn(reducer, 'waitForTransactionBlockId').mockResolvedValue(undefined);

    Object.assign(reducer as any, { transferType: SubTransferType.Standalone });

    await reducer.waitForTxBlockAndStatus(transaction.id);

    expect(waitForStatusSpy).not.toHaveBeenCalled();
    expect(restoreSpy).toHaveBeenCalledWith(transaction.id);
    expect(waitForBlockSpy).not.toHaveBeenCalled();
  });

  it('returns null when the transaction is absent from the bounded submission window', async () => {
    reducerMocks.system.getBlockHash.mockImplementation(async (blockHeight: number) => `0xblock-${blockHeight}`);

    await expect(findSubstrateTransactionBlock(transactionHash, 100, {} as never)).resolves.toBeNull();

    expect(reducerMocks.system.getBlockHash).toHaveBeenCalledTimes(5);
    expect(reducerMocks.system.getBlockHash).toHaveBeenLastCalledWith(102, {});
  });

  it('times out a stalled historical source-block scan with a retryable tracking error', async () => {
    vi.useFakeTimers();
    reducerMocks.system.getBlockNumber.mockReturnValue(new Promise(() => undefined));

    try {
      const scanPromise = findSubstrateTransactionBlock(transactionHash, 100, {} as never);
      const rejection = expect(scanPromise).rejects.toThrow(SubBridgeReconciliationErrorCode.TrackingTimeout);

      await vi.advanceTimersByTimeAsync(SUBSTRATE_TRANSACTION_RECOVERY_TIMEOUT_MS);
      await rejection;

      expect(reducerMocks.system.getBlockHash).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('releases the incoming queue after a source scan timeout so another transaction can run', async () => {
    vi.useFakeTimers();
    const firstTransaction = {
      id: 'tx-timeout',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      externalNetwork: 'Liberland',
    };
    const secondTransaction = {
      ...firstTransaction,
      id: 'tx-after-timeout',
    };
    const transactions = {
      [firstTransaction.id]: firstTransaction,
      [secondTransaction.id]: secondTransaction,
    };
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      Object.assign(transactions[id], params);
    });
    const options = createReducerOptions(firstTransaction, updateTransaction);
    options.getTransaction.mockImplementation((id: string) => transactions[id]);
    options.boundaryStates = {
      [Operation.SubstrateIncoming]: { done: BridgeTxStatus.Done, failed: [BridgeTxStatus.Failed] },
    };
    const reducer = new SubBridgeIncomingReducer(options as any);
    const recoveryCalls: string[] = [];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    reducerMocks.system.getBlockNumber.mockReturnValue(new Promise(() => undefined));
    Object.assign(reducer as any, { transferType: SubTransferType.Standalone });
    vi.spyOn(reducer, 'beforeSubmit').mockImplementation((id: string) => {
      options.addTransactionToProgress(id);
    });
    vi.spyOn(reducer, 'initConnector').mockResolvedValue(undefined);
    vi.spyOn(reducer, 'closeConnector').mockResolvedValue(undefined);
    vi.spyOn(reducer as any, 'checkTxId').mockResolvedValue(undefined);
    vi.spyOn(reducer as any, 'updateTxIncomingData').mockImplementation(async (id: string) => {
      recoveryCalls.push(id);

      if (id === firstTransaction.id) {
        await findSubstrateTransactionBlock(transactionHash, 100, {} as never);
      }
    });
    vi.spyOn(reducer as any, 'waitForSoraInboundMessageNonce').mockResolvedValue(undefined);
    vi.spyOn(reducer as any, 'waitSoraBlockByHash').mockResolvedValue(undefined);

    try {
      const first = reducer.changeState(firstTransaction as any);
      const second = reducer.changeState(secondTransaction as any);

      await vi.advanceTimersByTimeAsync(SUBSTRATE_TRANSACTION_RECOVERY_TIMEOUT_MS);
      await Promise.all([first, second]);

      expect(recoveryCalls).toEqual([firstTransaction.id, secondTransaction.id]);
      expect(firstTransaction.transactionState).toBe(BridgeTxStatus.Failed);
      expect(firstTransaction.errorMessage).toBe(SubBridgeReconciliationErrorCode.TrackingTimeout);
      expect(secondTransaction.transactionState).toBe(BridgeTxStatus.Done);
      expect(options.removeTransactionFromProgress).toHaveBeenCalledWith(firstTransaction.id);
      expect(consoleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: SubBridgeReconciliationErrorCode.TrackingTimeout })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects invalid restoration inputs before querying the chain', async () => {
    await expect(findSubstrateTransactionBlock('not-a-hash', 100, {} as never)).rejects.toThrow(
      'Invalid Substrate transaction hash'
    );
    await expect(findSubstrateTransactionBlock(transactionHash, Number.NaN, {} as never)).rejects.toThrow(
      'Invalid Substrate transaction start block'
    );
    await expect(findSubstrateTransactionBlock(transactionHash, 0, {} as never)).rejects.toThrow(
      'Invalid Substrate transaction start block'
    );

    expect(reducerMocks.system.getBlockNumber).not.toHaveBeenCalled();
  });

  it('preserves a valid saved start block when the connection reports zero', async () => {
    const transaction = {
      id: 'tx-incoming',
      payload: { startBlock: 100 },
    };
    const updateTransaction = vi.fn();
    const reducer = new SubBridgeReducer(createReducerOptions(transaction, updateTransaction) as any);
    const adapter = {
      connect: vi.fn(),
      getBlockNumber: vi.fn(async () => 0),
    };

    Object.assign(reducer as any, {
      connector: { network: adapter },
      transferType: SubTransferType.Standalone,
    });

    await expect(reducer.saveStartBlock(transaction.id)).resolves.toBeUndefined();

    expect(adapter.connect).not.toHaveBeenCalled();
    expect(adapter.getBlockNumber).not.toHaveBeenCalled();
    expect(updateTransaction).not.toHaveBeenCalled();
  });

  it('rejects a zero start block instead of persisting unrecoverable metadata', async () => {
    const transaction = {
      id: 'tx-incoming',
      payload: {},
    };
    const updateTransaction = vi.fn();
    const reducer = new SubBridgeReducer(createReducerOptions(transaction, updateTransaction) as any);
    const adapter = {
      connect: vi.fn(async () => undefined),
      getBlockNumber: vi.fn(async () => 0),
    };

    Object.assign(reducer as any, {
      connector: { network: adapter },
      transferType: SubTransferType.Standalone,
    });

    await expect(reducer.saveStartBlock(transaction.id)).rejects.toThrow(
      'Unable to determine a valid source start block'
    );

    expect(updateTransaction).not.toHaveBeenCalled();
  });

  it('restores a txId-only standalone response-loss attempt despite volatile local Error status', async () => {
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      status: TransactionStatus.Error,
      txId: transactionHash,
      payload: { startBlock: 100 },
    };
    const updateTransaction = vi.fn();
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction, updateTransaction) as any);
    const adapter = {
      api: {},
      connect: vi.fn(async () => undefined),
    };

    reducerMocks.system.getBlockHash.mockImplementation(async (blockHeight: number) => `0xblock-${blockHeight}`);
    reducerMocks.system.getExtrinsicsFromBlock.mockImplementation(async (blockId: string) =>
      blockId === '0xblock-100' ? [{ hash: { toString: () => transactionHash.toUpperCase() } }] : []
    );
    Object.assign(reducer as any, {
      connector: { network: adapter },
      transferType: SubTransferType.Standalone,
    });
    const waitForStatusSpy = vi.spyOn(reducer, 'waitForTransactionStatus');

    await expect(reducer.waitForTxBlockAndStatus(transaction.id)).resolves.toBeUndefined();

    expect(waitForStatusSpy).not.toHaveBeenCalled();
    expect(adapter.connect).toHaveBeenCalledTimes(1);
    expect(updateTransaction).toHaveBeenCalledWith(transaction.id, {
      blockId: '0xblock-100',
      blockHeight: 100,
    });
  });

  it('uses external source hash and block evidence without waiting on volatile local status', async () => {
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      txId: '',
      externalHash: transactionHash,
      externalBlockId: '0xliberland-block',
    };
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction) as any);
    const waitForStatusSpy = vi.spyOn(reducer, 'waitForTransactionStatus');
    const restoreSpy = vi.spyOn(reducer as any, 'restoreTransactionBlockId');
    const waitForBlockSpy = vi.spyOn(reducer, 'waitForTransactionBlockId');

    Object.assign(reducer as any, { transferType: SubTransferType.Standalone });

    await reducer.waitForTxBlockAndStatus(transaction.id);

    expect(waitForStatusSpy).not.toHaveBeenCalled();
    expect(restoreSpy).not.toHaveBeenCalled();
    expect(waitForBlockSpy).not.toHaveBeenCalled();
  });

  it('does not scan when the incoming transaction already has block data', async () => {
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      txId: transactionHash,
      blockId: '0xknown-block',
      payload: { startBlock: 100 },
    };
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction) as any);

    Object.assign(reducer as any, {
      transferType: SubTransferType.Standalone,
    });

    await expect((reducer as any).restoreTransactionBlockId(transaction.id)).resolves.toBe(true);

    expect(reducerMocks.system.getBlockNumber).not.toHaveBeenCalled();
  });

  it('fails restoration safely when submission block metadata is absent', async () => {
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      txId: transactionHash,
      payload: {},
    };
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction) as any);

    Object.assign(reducer as any, {
      connector: { network: { connect: vi.fn() } },
      transferType: SubTransferType.Standalone,
    });

    await expect((reducer as any).restoreTransactionBlockId(transaction.id)).rejects.toThrow(
      'Start block is unavailable'
    );

    expect(reducerMocks.system.getBlockNumber).not.toHaveBeenCalled();
  });

  it('does not sign or submit an existing incoming transaction again', async () => {
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      txId: transactionHash,
      assetAddress: 'lld',
    };
    const options = createReducerOptions(transaction);
    options.getAssetByAddress.mockReturnValue({ address: 'lld', symbol: 'LLD' });
    const reducer = new SubBridgeIncomingReducer(options as any);
    const connector = {
      accountApi: {},
      incomingTransfer: vi.fn(),
      start: vi.fn(),
    };
    const beforeSignSpy = vi.spyOn(reducer, 'beforeSign');
    const saveStartBlockSpy = vi.spyOn(reducer, 'saveStartBlock');

    Object.assign(reducer as any, { connector });

    await (reducer as any).checkTxId(transaction.id);

    expect(beforeSignSpy).not.toHaveBeenCalled();
    expect(connector.start).not.toHaveBeenCalled();
    expect(connector.incomingTransfer).not.toHaveBeenCalled();
    expect(saveStartBlockSpy).not.toHaveBeenCalled();
  });

  it('does not re-sign when tracking already moved the incoming source hash out of txId', async () => {
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      txId: '',
      externalHash: transactionHash,
      externalBlockId: '0xliberland-block',
      assetAddress: 'lld',
    };
    const options = createReducerOptions(transaction);
    options.getAssetByAddress.mockReturnValue({ address: 'lld', symbol: 'LLD' });
    const reducer = new SubBridgeIncomingReducer(options as any);
    const connector = {
      accountApi: {},
      incomingTransfer: vi.fn(),
      start: vi.fn(),
    };

    Object.assign(reducer as any, { connector });

    await (reducer as any).checkTxId(transaction.id);

    expect(reducerMocks.subUtils.hasSubBridgeIncomingSubmissionEvidence).toHaveBeenCalledWith(transaction);
    expect(options.beforeTransactionSign).not.toHaveBeenCalled();
    expect(connector.start).not.toHaveBeenCalled();
    expect(connector.incomingTransfer).not.toHaveBeenCalled();
  });

  it('recovers the SORA request hash from the finalized Liberland burn', async () => {
    const requestHash = `0x${'b'.repeat(64)}`;
    const burnEvent = { event: { data: [{}, {}, {}, {}, { toString: () => '1000000000000' }] } };
    const transactionEvents = [
      { event: { method: 'MessageAccepted', section: 'substrateBridgeOutboundChannel' } },
      { event: { method: 'RequestStatusUpdate', section: 'soraBridgeProvider' } },
      burnEvent,
    ];
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      externalBlockId: '0xliberland-block',
      externalHash: transactionHash,
      amount: '1',
      from: 'sora-recipient',
      to: 'liberland-sender',
      payload: {},
    };
    const updateTransaction = vi.fn();
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction, updateTransaction) as any);
    const adapter = {
      api: {},
      connect: vi.fn(async () => undefined),
    };

    reducerMocks.common.getTransactionEvents.mockResolvedValue(transactionEvents);
    reducerMocks.subUtils.getSoraBridgeProviderHash.mockReturnValue(requestHash);
    reducerMocks.subUtils.getMessageAcceptedNonces.mockReturnValue([7, 9]);
    reducerMocks.subUtils.isSoraBridgeAppBurned.mockImplementation((event) => event === burnEvent);
    Object.assign(reducer as any, {
      connector: { network: adapter },
      transferType: SubTransferType.Standalone,
      asset: { externalDecimals: 12 },
    });

    await (reducer as any).updateTxExternalData(transaction.id);

    expect(reducerMocks.common.getTransactionEvents).toHaveBeenCalledWith(
      transaction.externalBlockId,
      transaction.externalHash,
      adapter.api
    );
    expect(reducerMocks.subUtils.getSoraBridgeProviderHash).toHaveBeenCalledWith(transactionEvents);
    expect(reducerMocks.subUtils.getMessageAcceptedNonces).toHaveBeenCalledWith(transactionEvents);
    expect(updateTransaction).toHaveBeenCalledWith(transaction.id, { hash: requestHash, amount2: '1' });
    expect(updateTransaction).toHaveBeenCalledWith(transaction.id, {
      payload: { batchNonce: 7, messageNonce: 9 },
    });
  });

  it('uses an authoritative SORA request hash when auxiliary message nonces cannot be restored', async () => {
    const requestHash = `0x${'c'.repeat(64)}`;
    const burnEvent = { event: { data: [{}, {}, {}, {}, { toString: () => '1000000000000' }] } };
    const transactionEvents = [{ event: { method: 'RequestStatusUpdate', section: 'soraBridgeProvider' } }, burnEvent];
    const transaction = {
      id: 'tx-incoming-request-hash-only',
      type: Operation.SubstrateIncoming,
      externalBlockId: '0xliberland-block',
      externalHash: transactionHash,
      amount: '1',
      from: 'sora-recipient',
      to: 'liberland-sender',
      payload: {},
    };
    const updateTransaction = vi.fn();
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction, updateTransaction) as any);
    const adapter = {
      api: {},
      connect: vi.fn(async () => undefined),
    };

    reducerMocks.common.getTransactionEvents.mockResolvedValue(transactionEvents);
    reducerMocks.subUtils.getSoraBridgeProviderHash.mockReturnValue(requestHash);
    reducerMocks.subUtils.getMessageAcceptedNonces.mockImplementation(() => {
      throw new Error('MessageAccepted unavailable');
    });
    reducerMocks.subUtils.isSoraBridgeAppBurned.mockImplementation((event) => event === burnEvent);
    Object.assign(reducer as any, {
      connector: { network: adapter },
      transferType: SubTransferType.Standalone,
      asset: { externalDecimals: 12 },
    });

    await expect((reducer as any).updateTxExternalData(transaction.id)).resolves.toBeUndefined();

    expect(updateTransaction).toHaveBeenCalledWith(transaction.id, { hash: requestHash, amount2: '1' });
    expect(updateTransaction).not.toHaveBeenCalledWith(
      transaction.id,
      expect.objectContaining({ payload: expect.anything() })
    );
  });

  it('reconciles an ambiguous txId-only response loss by verifying historical Burned events', async () => {
    const requestHash = `0x${'b'.repeat(64)}`;
    const burnEvent = { event: { data: [{}, {}, {}, {}, { toString: () => '1000000000000' }] } };
    const transactionEvents = [burnEvent, { event: { method: 'RequestStatusUpdate' } }];
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      status: TransactionStatus.Error,
      txId: transactionHash,
      externalNetwork: 'Liberland',
      assetAddress: 'lld',
      amount: '1',
      from: 'sora-recipient',
      to: 'liberland-sender',
      payload: { startBlock: 100 },
    };
    const updateTransaction = vi.fn((_id: string, params: Record<string, unknown>) => {
      Object.assign(transaction, params);
    });
    const options = createReducerOptions(transaction, updateTransaction);
    const asset = { address: 'lld', symbol: 'LLD', decimals: 18, externalDecimals: 12 };
    options.getAssetByAddress.mockReturnValue(asset);
    const reducer = new SubBridgeIncomingReducer(options as any);
    const adapter = {
      api: {},
      connect: vi.fn(async () => undefined),
    };
    const connector = {
      accountApi: {},
      network: adapter,
      stop: vi.fn(async () => undefined),
    };
    const waitForStatusSpy = vi.spyOn(reducer, 'waitForTransactionStatus');

    vi.spyOn(reducer, 'initConnector').mockResolvedValue(undefined);
    Object.assign(reducer as any, { connector, transferType: SubTransferType.Standalone });
    reducerMocks.system.getBlockHash.mockImplementation(async (blockHeight: number, chainApi: unknown) =>
      chainApi === adapter.api ? `0xliberland-${blockHeight}` : '0xsora-block'
    );
    reducerMocks.system.getExtrinsicsFromBlock.mockImplementation(async (blockId: string) =>
      blockId === '0xliberland-100' ? [{ hash: { toString: () => transactionHash } }] : []
    );
    reducerMocks.common.getTransactionEvents.mockResolvedValue(transactionEvents);
    reducerMocks.subUtils.isSoraBridgeAppBurned.mockImplementation((event) => event === burnEvent);
    reducerMocks.subUtils.getSoraBridgeProviderHash.mockReturnValue(requestHash);
    reducerMocks.subUtils.getMessageAcceptedNonces.mockReturnValue([7, 9]);
    reducerMocks.subBridgeApi.getTransactionDetails.mockResolvedValue({
      endBlock: 77,
      status: BridgeTxStatus.Done,
    });

    await reducer.changeState(transaction as any);

    expect(options.beforeTransactionSign).not.toHaveBeenCalled();
    expect(waitForStatusSpy).not.toHaveBeenCalled();
    expect(reducerMocks.common.getTransactionEvents).toHaveBeenCalledWith(
      '0xliberland-100',
      transactionHash,
      adapter.api
    );
    expect(reducerMocks.subBridgeApi.getTransactionDetails).toHaveBeenCalledWith(
      transaction.from,
      transaction.externalNetwork,
      requestHash
    );
    expect(transaction).toEqual(
      expect.objectContaining({
        transactionState: BridgeTxStatus.Done,
        externalHash: transactionHash,
        externalBlockId: '0xliberland-100',
        hash: requestHash,
        blockId: '0xsora-block',
        blockHeight: 77,
      })
    );
  });

  it('processes standalone incoming recovery without starting the live nonce watcher', async () => {
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      externalNetwork: 'Liberland',
    };
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction) as any);
    const calls: string[] = [];

    Object.assign(reducer as any, { transferType: SubTransferType.Standalone });
    vi.spyOn(reducer, 'initConnector').mockResolvedValue(undefined);
    vi.spyOn(reducer, 'closeConnector').mockResolvedValue(undefined);
    vi.spyOn(reducer as any, 'checkTxId').mockResolvedValue(undefined);
    vi.spyOn(reducer as any, 'updateTxIncomingData').mockImplementation(async () => {
      calls.push('external');
    });
    const liveNonceSpy = vi.spyOn(reducer as any, 'waitForSoraParachainNonce').mockResolvedValue(undefined);
    vi.spyOn(reducer as any, 'waitForSoraInboundMessageNonce').mockImplementation(async () => {
      calls.push('inbound');
    });
    vi.spyOn(reducer as any, 'waitSoraBlockByHash').mockImplementation(async () => {
      calls.push('details');
    });
    vi.spyOn(reducer, 'onComplete').mockImplementation(async () => {
      calls.push('complete');
    });

    await reducer.changeState(transaction as any);

    expect(liveNonceSpy).not.toHaveBeenCalled();
    expect(calls).toEqual(['external', 'inbound', 'details', 'complete']);
  });

  it('coalesces concurrent incoming recovery so the source submission path runs once', async () => {
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      externalNetwork: 'Liberland',
    };
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction) as any);
    let finishTracking!: () => void;

    Object.assign(reducer as any, { transferType: SubTransferType.Standalone });
    vi.spyOn(reducer, 'initConnector').mockResolvedValue(undefined);
    vi.spyOn(reducer, 'closeConnector').mockResolvedValue(undefined);
    const checkTxIdSpy = vi.spyOn(reducer as any, 'checkTxId').mockResolvedValue(undefined);
    vi.spyOn(reducer as any, 'updateTxIncomingData').mockResolvedValue(undefined);
    vi.spyOn(reducer as any, 'waitForSoraInboundMessageNonce').mockResolvedValue(undefined);
    const waitForSoraSpy = vi.spyOn(reducer as any, 'waitSoraBlockByHash').mockReturnValue(
      new Promise<void>((resolve) => {
        finishTracking = resolve;
      })
    );
    vi.spyOn(reducer, 'onComplete').mockResolvedValue(undefined);

    const first = reducer.changeState(transaction as any);
    const second = reducer.changeState(transaction as any);

    await vi.waitFor(() => expect(waitForSoraSpy).toHaveBeenCalledTimes(1));
    expect(checkTxIdSpy).toHaveBeenCalledTimes(1);

    finishTracking();
    await Promise.all([first, second]);

    expect(checkTxIdSpy).toHaveBeenCalledTimes(1);
    expect(waitForSoraSpy).toHaveBeenCalledTimes(1);
  });

  it('serializes different incoming transaction IDs that share reducer connector state', async () => {
    const firstTransaction = {
      id: 'tx-first',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      externalNetwork: 'Liberland',
    };
    const secondTransaction = {
      ...firstTransaction,
      id: 'tx-second',
    };
    const transactions = {
      [firstTransaction.id]: firstTransaction,
      [secondTransaction.id]: secondTransaction,
    };
    const options = createReducerOptions(firstTransaction);
    options.getTransaction.mockImplementation((id: string) => transactions[id]);
    const reducer = new SubBridgeIncomingReducer(options as any);
    const calls: string[] = [];
    let releaseFirst!: () => void;
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    Object.assign(reducer as any, { transferType: SubTransferType.Standalone });
    vi.spyOn(reducer, 'beforeSubmit').mockImplementation(() => undefined);
    const initSpy = vi.spyOn(reducer, 'initConnector').mockImplementation(async (id) => {
      calls.push(`init:${id}`);
    });
    vi.spyOn(reducer, 'closeConnector').mockImplementation(async () => {
      calls.push('close');
    });
    vi.spyOn(reducer as any, 'checkTxId').mockResolvedValue(undefined);
    vi.spyOn(reducer as any, 'updateTxIncomingData').mockResolvedValue(undefined);
    vi.spyOn(reducer as any, 'waitForSoraInboundMessageNonce').mockResolvedValue(undefined);
    vi.spyOn(reducer as any, 'waitSoraBlockByHash').mockImplementation(async (id: string) => {
      calls.push(`wait:${id}`);
      if (id === firstTransaction.id) await firstBlocked;
    });
    vi.spyOn(reducer, 'onComplete').mockImplementation(async (id) => {
      calls.push(`complete:${id}`);
    });

    const first = reducer.changeState(firstTransaction as any);
    const second = reducer.changeState(secondTransaction as any);

    await vi.waitFor(() => expect(calls).toContain(`wait:${firstTransaction.id}`));
    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(initSpy).not.toHaveBeenCalledWith(secondTransaction.id);

    releaseFirst();
    await Promise.all([first, second]);

    expect(initSpy.mock.calls.map(([id]) => id)).toEqual([firstTransaction.id, secondTransaction.id]);
    expect(calls.indexOf('close')).toBeLessThan(calls.indexOf(`init:${secondTransaction.id}`));
  });

  it('does not resume a locally Failed transaction after SORA storage recorded a terminal failure', async () => {
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Failed,
      payload: { bridgeRecoveryStatus: SubBridgeAuthoritativeStatus.Refunded },
    };
    const updateTransaction = vi.fn();
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction, updateTransaction) as any);

    await reducer.changeState(transaction as any);

    expect(updateTransaction).not.toHaveBeenCalled();
  });

  it('rereads persisted retry state when an Eth-selected UI cache still contains Failed', async () => {
    const selectedUiFamily = 'Eth';
    const staleCachedTransaction = {
      id: 'tx-cross-family-recovery',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Failed,
      externalNetwork: 'Liberland',
      assetAddress: 'lld',
      amount: '1',
      from: 'sora-account',
      to: 'liberland-account',
      payload: {},
    };
    const persistedTransaction = {
      ...staleCachedTransaction,
      txId: transactionHash,
      payload: { startBlock: 100, submissionState: 'unknown' },
    };

    reducerMocks.subBridgeApi.history[persistedTransaction.id] = persistedTransaction;

    const persistedUpdate = vi.fn((id: string, params: Record<string, unknown>) => {
      updateTransaction(id, params);
    });
    const options = createReducerOptions(staleCachedTransaction, persistedUpdate);
    options.getTransaction.mockImplementation((id: string) => getTransaction(id, staleCachedTransaction as any));
    options.getAssetByAddress.mockReturnValue({ address: 'lld' });
    options.updateHistory.mockImplementation(() => {
      // An Eth history refresh deliberately leaves the distinct cached Sub row
      // untouched; reducer reads must therefore come from persisted Sub history.
      expect(selectedUiFamily).toBe('Eth');
    });
    options.boundaryStates = {
      [Operation.SubstrateIncoming]: { done: BridgeTxStatus.Done, failed: [BridgeTxStatus.Failed] },
    };
    const reducer = new SubBridgeIncomingReducer(options as any);
    const checkTxIdSpy = vi.spyOn(reducer as any, 'checkTxId');
    const beforeSignSpy = vi.spyOn(reducer, 'beforeSign');

    vi.spyOn(reducer as any, 'updateTxIncomingData').mockResolvedValue(undefined);
    vi.spyOn(reducer as any, 'waitForSoraInboundMessageNonce').mockResolvedValue(undefined);
    vi.spyOn(reducer as any, 'waitSoraBlockByHash').mockResolvedValue(undefined);

    await reducer.process(staleCachedTransaction as any);

    expect(checkTxIdSpy).toHaveBeenCalledTimes(1);
    expect(beforeSignSpy).not.toHaveBeenCalled();
    expect(options.beforeTransactionSign).not.toHaveBeenCalled();
    expect(staleCachedTransaction.transactionState).toBe(BridgeTxStatus.Failed);
    expect(reducerMocks.subBridgeApi.history[persistedTransaction.id]).toEqual(
      expect.objectContaining({
        transactionState: BridgeTxStatus.Done,
        txId: transactionHash,
        payload: expect.objectContaining({ startBlock: 100, submissionState: 'unknown' }),
      })
    );
    expect(persistedUpdate).toHaveBeenCalledWith(persistedTransaction.id, {
      transactionState: BridgeTxStatus.Pending,
    });
  });

  it('completes an existing standalone burn from historical chain data without resubmitting', async () => {
    const requestHash = `0x${'b'.repeat(64)}`;
    const burnAmount = { toString: () => '1000000000000' };
    const transactionEvents = [
      { event: { data: [null, null, null, null, burnAmount], method: 'Burned', section: 'soraBridgeApp' } },
      { event: { method: 'RequestStatusUpdate', section: 'soraBridgeProvider' } },
      { event: { method: 'MessageAccepted', section: 'substrateBridgeOutboundChannel' } },
    ];
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      status: TransactionStatus.Broadcast,
      txId: transactionHash,
      payload: { startBlock: 100 },
      assetAddress: 'lld',
      externalNetwork: 'Liberland',
      from: 'sora-account',
      to: 'liberland-account',
      amount: '1',
    };
    const updateTransaction = vi.fn((_id: string, params: Record<string, unknown>) => {
      Object.assign(transaction, params);
    });
    const options = createReducerOptions(transaction, updateTransaction);
    options.boundaryStates = {
      [Operation.SubstrateIncoming]: { done: BridgeTxStatus.Done, failed: [BridgeTxStatus.Failed] },
    };
    const asset = { address: 'lld', decimals: 18, externalDecimals: 12, symbol: 'LLD' };
    options.getAssetByAddress.mockReturnValue(asset);
    const reducer = new SubBridgeIncomingReducer(options as any);
    const adapter = {
      api: {},
      connect: vi.fn(async () => undefined),
    };
    const connector = {
      accountApi: {},
      incomingTransfer: vi.fn(),
      network: adapter,
      start: vi.fn(),
      stop: vi.fn(async () => undefined),
    };
    const beforeSignSpy = vi.spyOn(reducer, 'beforeSign');
    const saveStartBlockSpy = vi.spyOn(reducer, 'saveStartBlock');
    const liveNonceSpy = vi.spyOn(reducer as any, 'waitForSoraParachainNonce');

    reducerMocks.system.getBlockHash.mockImplementation(async (blockHeight: number) =>
      blockHeight === 77 ? '0xsora-finalized' : `0xliberland-${blockHeight}`
    );
    reducerMocks.system.getExtrinsicsFromBlock.mockImplementation(async (blockId: string) =>
      blockId === '0xliberland-100' ? [{ hash: { toString: () => transactionHash } }] : []
    );
    reducerMocks.common.getTransactionEvents.mockResolvedValue(transactionEvents);
    reducerMocks.subUtils.getSoraBridgeProviderHash.mockReturnValue(requestHash);
    reducerMocks.subUtils.getMessageAcceptedNonces.mockReturnValue([1330, 0]);
    reducerMocks.subUtils.isSoraBridgeAppBurned.mockReturnValue(true);
    reducerMocks.subBridgeApi.getTransactionDetails.mockResolvedValue({
      endBlock: 77,
      status: BridgeTxStatus.Done,
    });
    Object.assign(reducer as any, {
      connector,
      transferType: SubTransferType.Standalone,
    });
    vi.spyOn(reducer, 'initConnector').mockResolvedValue(undefined);

    await reducer.changeState(transaction as any);

    expect(beforeSignSpy).not.toHaveBeenCalled();
    expect(connector.start).not.toHaveBeenCalled();
    expect(connector.incomingTransfer).not.toHaveBeenCalled();
    expect(saveStartBlockSpy).not.toHaveBeenCalled();
    expect(liveNonceSpy).not.toHaveBeenCalled();
    expect(reducerMocks.subBridgeApi.subscribeOnTransactionDetails).not.toHaveBeenCalled();
    expect(transaction).toEqual(
      expect.objectContaining({
        blockHeight: 77,
        blockId: '0xsora-finalized',
        externalBlockHeight: 100,
        externalBlockId: '0xliberland-100',
        externalHash: transactionHash,
        hash: requestHash,
        transactionState: BridgeTxStatus.Done,
        txId: '',
      })
    );
  });

  it('waits for a future block hash and unsubscribes after resolving it', async () => {
    let emitHash!: (hash: string) => void;
    const teardown = vi.fn();
    const hashes = new Observable<string>((subscriber) => {
      emitHash = (hash) => subscriber.next(hash);
      return teardown;
    });
    reducerMocks.system.getBlockHashObservable.mockReturnValue(hashes);
    const reducer = new SubBridgeReducer(createReducerOptions({}) as any);

    const resultPromise = reducer.getHashesByBlockNumber(42, {} as never);
    emitHash('0xblock');

    await expect(resultPromise).resolves.toEqual({ blockHeight: 42, blockId: '0xblock' });
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('rejects and cleans up when the block-hash observable errors', async () => {
    const sourceError = new Error('block hash stream failed');
    const teardown = vi.fn();
    const hashes = new Observable<string>((subscriber) => {
      queueMicrotask(() => subscriber.error(sourceError));
      return teardown;
    });
    reducerMocks.system.getBlockHashObservable.mockReturnValue(hashes);
    const reducer = new SubBridgeReducer(createReducerOptions({}) as any);

    await expect(reducer.getHashesByBlockNumber(42, {} as never)).rejects.toBe(sourceError);
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('preserves a synchronous subscribe error instead of masking it during cleanup', async () => {
    const subscribeError = new Error('subscribe failed synchronously');
    reducerMocks.system.getBlockHashObservable.mockReturnValue({
      subscribe: vi.fn(() => {
        throw subscribeError;
      }),
    });
    const reducer = new SubBridgeReducer(createReducerOptions({}) as any);

    await expect(reducer.getHashesByBlockNumber(42, {} as never)).rejects.toBe(subscribeError);
  });

  it('propagates transaction-detail observable errors and cleans up', async () => {
    const sourceError = new Error('transaction details failed');
    const teardown = vi.fn();
    reducerMocks.subBridgeApi.subscribeOnTransactionDetails.mockReturnValue(
      new Observable((subscriber) => {
        queueMicrotask(() => subscriber.error(sourceError));
        return teardown;
      })
    );
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      hash: '0xsora-hash',
      from: 'sora-account',
      externalNetwork: 'Liberland',
    };
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction) as any);

    await expect((reducer as any).waitSoraBlockByHash(transaction.id)).rejects.toBe(sourceError);
    expect(teardown).toHaveBeenCalledTimes(1);
    expect(reducerMocks.system.getBlockHash).not.toHaveBeenCalled();
  });

  it('times out an inactive SORA details subscription without recording an authoritative terminal state', async () => {
    vi.useFakeTimers();
    const teardown = vi.fn();
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      hash: '0xsora-hash',
      from: 'sora-account',
      externalNetwork: 'Liberland',
      payload: { startBlock: 100 },
    };
    const updateTransaction = vi.fn();
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction, updateTransaction) as any);

    reducerMocks.subBridgeApi.getTransactionDetails.mockResolvedValue({
      endBlock: 0,
      status: BridgeTxStatus.Pending,
    });
    reducerMocks.subBridgeApi.subscribeOnTransactionDetails.mockReturnValue(new Observable(() => teardown));

    try {
      const waitPromise = (reducer as any).waitSoraBlockByHash(transaction.id);
      const rejection = expect(waitPromise).rejects.toThrow(SubBridgeReconciliationErrorCode.TrackingTimeout);

      await vi.advanceTimersByTimeAsync(0);
      expect(reducerMocks.subBridgeApi.subscribeOnTransactionDetails).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(SORA_BRIDGE_DETAILS_TIMEOUT_MS);
      await rejection;

      expect(teardown).toHaveBeenCalledTimes(1);
      expect(updateTransaction).not.toHaveBeenCalledWith(
        transaction.id,
        expect.objectContaining({
          payload: expect.objectContaining({ bridgeRecoveryStatus: expect.anything() }),
        })
      );
      expect(reducerMocks.system.getBlockHash).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects with a retryable tracking error when SORA details complete while still Pending', async () => {
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      hash: '0xsora-hash',
      from: 'sora-account',
      externalNetwork: 'Liberland',
    };
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction) as any);

    reducerMocks.subBridgeApi.getTransactionDetails.mockResolvedValue({
      endBlock: 0,
      status: BridgeTxStatus.Pending,
    });
    reducerMocks.subBridgeApi.subscribeOnTransactionDetails.mockReturnValue(
      of({ endBlock: 0, status: BridgeTxStatus.Pending })
    );

    await expect((reducer as any).waitSoraBlockByHash(transaction.id)).rejects.toThrow(
      SubBridgeReconciliationErrorCode.TrackingTimeout
    );

    expect(reducerMocks.subBridgeApi.getTransactionDetails).toHaveBeenCalledTimes(2);
    expect(reducerMocks.system.getBlockHash).not.toHaveBeenCalled();
  });

  it('accepts a final Done value before the SORA details stream completes', async () => {
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      hash: '0xsora-hash',
      from: 'sora-account',
      externalNetwork: 'Liberland',
    };
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction) as any);

    reducerMocks.subBridgeApi.getTransactionDetails
      .mockResolvedValueOnce({ endBlock: 0, status: BridgeTxStatus.Pending })
      .mockResolvedValueOnce({ endBlock: 77, status: BridgeTxStatus.Done });
    reducerMocks.subBridgeApi.subscribeOnTransactionDetails.mockReturnValue(
      of({ endBlock: 77, status: BridgeTxStatus.Done })
    );

    await expect((reducer as any).waitSoraBlockByHash(transaction.id)).resolves.toBeUndefined();

    expect(reducerMocks.system.getBlockHash).toHaveBeenCalledWith(77, reducerMocks.subBridgeApi.api);
  });

  it('times out a stalled initial SORA storage reconciliation before subscribing', async () => {
    vi.useFakeTimers();
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      hash: '0xsora-hash',
      from: 'sora-account',
      externalNetwork: 'Liberland',
    };
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction) as any);

    reducerMocks.subBridgeApi.getTransactionDetails.mockReturnValue(new Promise(() => undefined));

    try {
      const waitPromise = (reducer as any).waitSoraBlockByHash(transaction.id);
      const rejection = expect(waitPromise).rejects.toThrow(SubBridgeReconciliationErrorCode.TrackingTimeout);

      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(SORA_BRIDGE_DETAILS_TIMEOUT_MS);
      await rejection;

      expect(reducerMocks.subBridgeApi.subscribeOnTransactionDetails).not.toHaveBeenCalled();
      expect(reducerMocks.system.getBlockHash).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps transaction-detail waits open for a valid future Done event, then cleans up', async () => {
    let emitDetails!: (details: { endBlock: number; status: BridgeTxStatus }) => void;
    const teardown = vi.fn();
    reducerMocks.subBridgeApi.subscribeOnTransactionDetails.mockReturnValue(
      new Observable((subscriber) => {
        emitDetails = (details) => subscriber.next(details);
        return teardown;
      })
    );
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      hash: '0xsora-hash',
      from: 'sora-account',
      externalNetwork: 'Liberland',
    };
    const updateTransaction = vi.fn();
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction, updateTransaction) as any);

    const waitPromise = (reducer as any).waitSoraBlockByHash(transaction.id);
    await vi.waitFor(() => expect(emitDetails).toBeTypeOf('function'));
    emitDetails({ endBlock: 77, status: BridgeTxStatus.Done });
    await waitPromise;

    expect(teardown).toHaveBeenCalledTimes(1);
    expect(reducerMocks.system.getBlockHash).toHaveBeenCalledWith(77, reducerMocks.subBridgeApi.api);
    expect(updateTransaction).toHaveBeenCalledWith(
      transaction.id,
      expect.objectContaining({ blockId: '0xsora-block', blockHeight: 77 })
    );
  });

  it('uses current SORA bridge details when the recovered request is already done', async () => {
    reducerMocks.subBridgeApi.getTransactionDetails.mockResolvedValue({
      endBlock: 77,
      status: BridgeTxStatus.Done,
    });
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      hash: '0xrequest-hash',
      from: 'sora-account',
      externalNetwork: 'Liberland',
    };
    const updateTransaction = vi.fn();
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction, updateTransaction) as any);

    await (reducer as any).waitSoraBlockByHash(transaction.id);

    expect(reducerMocks.subBridgeApi.getTransactionDetails).toHaveBeenCalledWith(
      transaction.from,
      transaction.externalNetwork,
      transaction.hash
    );
    expect(reducerMocks.subBridgeApi.subscribeOnTransactionDetails).not.toHaveBeenCalled();
    expect(reducerMocks.system.getBlockHash).toHaveBeenCalledWith(77, reducerMocks.subBridgeApi.api);
    expect(updateTransaction).toHaveBeenCalledWith(
      transaction.id,
      expect.objectContaining({ blockId: '0xsora-block', blockHeight: 77 })
    );
  });

  it('does not treat an authoritative Failed request with an end block as Done', async () => {
    reducerMocks.subBridgeApi.getTransactionDetails.mockResolvedValue({
      endBlock: 77,
      status: BridgeTxStatus.Failed,
    });
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      hash: '0xrequest-hash',
      from: 'sora-account',
      externalNetwork: 'Liberland',
    };
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction) as any);

    await expect((reducer as any).waitSoraBlockByHash(transaction.id)).rejects.toThrow(
      SubBridgeReconciliationErrorCode.Failed
    );

    expect(reducerMocks.subBridgeApi.subscribeOnTransactionDetails).not.toHaveBeenCalled();
    expect(reducerMocks.system.getBlockHash).not.toHaveBeenCalled();
    expect((reducer as any).updateTransaction).toHaveBeenCalledWith(transaction.id, {
      payload: { bridgeRecoveryStatus: SubBridgeAuthoritativeStatus.Failed },
    });
  });

  it('preserves Refunded from raw SORA storage and gives refund guidance', async () => {
    reducerMocks.subBridgeApi.getTransactionDetails.mockResolvedValue({
      endBlock: 77,
      status: BridgeTxStatus.Failed,
    });
    reducerMocks.subBridgeApi.api.query.bridgeProxy.transactions.mockResolvedValue({
      isSome: true,
      unwrap: () => ({ status: { isRefunded: true, type: 'Refunded' } }),
    });
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      hash: '0xrequest-hash',
      from: 'sora-account',
      externalNetwork: 'Liberland',
    };
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction) as any);

    await expect((reducer as any).waitSoraBlockByHash(transaction.id)).rejects.toThrow(
      SubBridgeReconciliationErrorCode.Refunded
    );

    expect(reducerMocks.system.getBlockHash).not.toHaveBeenCalled();
    expect((reducer as any).updateTransaction).toHaveBeenCalledWith(transaction.id, {
      payload: { bridgeRecoveryStatus: SubBridgeAuthoritativeStatus.Refunded },
    });
  });

  it('keeps waiting when Pending storage reports an end block and completes only after Done', async () => {
    let emitDetails!: (details: { endBlock: number; status: BridgeTxStatus }) => void;
    reducerMocks.subBridgeApi.getTransactionDetails
      .mockResolvedValueOnce({ endBlock: 77, status: BridgeTxStatus.Pending })
      .mockResolvedValueOnce({ endBlock: 77, status: BridgeTxStatus.Pending })
      .mockResolvedValueOnce({ endBlock: 78, status: BridgeTxStatus.Done });
    reducerMocks.subBridgeApi.subscribeOnTransactionDetails.mockReturnValue(
      new Observable((subscriber) => {
        emitDetails = (details) => subscriber.next(details);
      })
    );
    const transaction = {
      id: 'tx-incoming',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Pending,
      hash: '0xrequest-hash',
      from: 'sora-account',
      externalNetwork: 'Liberland',
    };
    const reducer = new SubBridgeIncomingReducer(createReducerOptions(transaction) as any);

    const waitPromise = (reducer as any).waitSoraBlockByHash(transaction.id);
    await vi.waitFor(() => expect(emitDetails).toBeTypeOf('function'));
    emitDetails({ endBlock: 77, status: BridgeTxStatus.Pending });
    await Promise.resolve();
    await Promise.resolve();

    expect(reducerMocks.system.getBlockHash).not.toHaveBeenCalled();

    emitDetails({ endBlock: 78, status: BridgeTxStatus.Done });
    await waitPromise;

    expect(reducerMocks.system.getBlockHash).toHaveBeenCalledWith(78, reducerMocks.subBridgeApi.api);
  });

  it('propagates combineLatest event-source errors and stops the adapter', async () => {
    const sourceError = new Error('event stream failed');
    const teardown = vi.fn();
    reducerMocks.system.getEventsObservable.mockReturnValue(
      new Observable((subscriber) => {
        queueMicrotask(() => subscriber.error(sourceError));
        return teardown;
      })
    );
    reducerMocks.system.getBlockNumberObservable.mockReturnValue(NEVER);
    const transaction = {
      id: 'tx-outgoing',
      type: Operation.SubstrateOutgoing,
      transactionState: BridgeTxStatus.Pending,
      payload: { batchNonce: 1, messageNonce: 2 },
      to: 'external-account',
      amount: '1',
    };
    const reducer = new SubBridgeOutgoingReducer(createReducerOptions(transaction) as any);
    const adapter = {
      apiRx: {},
      connect: vi.fn(async () => undefined),
      stop: vi.fn(),
    };
    Object.assign(reducer as any, {
      transferType: SubTransferType.Standalone,
      connector: { network: adapter },
      asset: { externalDecimals: 18 },
    });

    await expect((reducer as any).waitForIntermediateExecution(transaction.id)).rejects.toBe(sourceError);
    expect(teardown).toHaveBeenCalledTimes(1);
    expect(adapter.stop).toHaveBeenCalledTimes(1);
  });
});
