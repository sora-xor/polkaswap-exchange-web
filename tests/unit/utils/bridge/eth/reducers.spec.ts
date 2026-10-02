import { Operation, TransactionStatus } from '@sora-substrate/sdk';
import { BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';

const getTransactionEventsMock = vi.hoisted(() => vi.fn());
const getEvmTransactionFeeMock = vi.hoisted(() => vi.fn(() => '0.01'));
const getEvmTransactionReceiptByHashMock = vi.hoisted(() => vi.fn());
const ethBridgeApiMock = vi.hoisted(() => ({
  api: {
    events: {
      ethBridge: {
        RequestRegistered: {
          is: vi.fn(() => true),
        },
      },
    },
  },
  getRequestStatus: vi.fn(),
  getApprovedRequest: vi.fn(),
  subscribeOnRequestStatus: vi.fn(),
  transfer: vi.fn(),
}));

vi.mock('@/utils/bridge/common/utils', async () => {
  const actual = await vi.importActual<typeof import('@/utils/bridge/common/utils')>('@/utils/bridge/common/utils');

  return {
    ...actual,
    getTransactionEvents: getTransactionEventsMock,
    getEvmTransactionFee: getEvmTransactionFeeMock,
    getEvmTransactionReceiptByHash: getEvmTransactionReceiptByHashMock,
  };
});

vi.mock('@/utils/bridge/eth/api', () => ({
  ethBridgeApi: ethBridgeApiMock,
}));

import { EthBridgeOutgoingReducer } from '@/utils/bridge/eth/classes/reducers';

const createReducer = (
  tx: Record<string, unknown>,
  updateTransaction = vi.fn(),
  options: {
    getBridgeHistoryInstance?: ReturnType<typeof vi.fn>;
    signExternalOutgoing?: ReturnType<typeof vi.fn>;
    isTransactionInProgress?: ReturnType<typeof vi.fn>;
  } = {}
) =>
  new EthBridgeOutgoingReducer({
    addAsset: vi.fn(),
    getAssetByAddress: vi.fn(),
    getTransaction: () => tx,
    updateTransaction,
    updateHistory: vi.fn(),
    showNotification: vi.fn(),
    getActiveTransaction: () => tx,
    addTransactionToProgress: vi.fn(),
    removeTransactionFromProgress: vi.fn(),
    isTransactionInProgress: options.isTransactionInProgress ?? vi.fn(() => false),
    beforeTransactionSign: vi.fn(),
    boundaryStates: {
      [Operation.EthBridgeOutgoing]: {
        done: ETH_BRIDGE_STATES.EVM_COMMITED,
        failed: [ETH_BRIDGE_STATES.SORA_REJECTED, ETH_BRIDGE_STATES.EVM_REJECTED],
      },
    },
    getBridgeHistoryInstance: options.getBridgeHistoryInstance ?? vi.fn(),
    signExternalOutgoing: options.signExternalOutgoing ?? vi.fn(),
    signExternalIncoming: vi.fn(),
  } as any);

describe('EthBridgeOutgoingReducer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEvmTransactionFeeMock.mockReturnValue('0.01');
    getEvmTransactionReceiptByHashMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restores the bridge request hash when local history has the SORA tx hash', async () => {
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      blockId: '0xblock',
      txId: '0xextrinsic-hash',
      hash: '0xextrinsic-hash',
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) {
        Object.assign(tx, params);
      }
    });
    const reducer = createReducer(tx, updateTransaction);

    ethBridgeApiMock.getRequestStatus.mockResolvedValueOnce(null);
    getTransactionEventsMock.mockResolvedValueOnce([
      {
        event: {
          data: [{ toString: () => '0xrequest-hash' }],
        },
      },
    ]);

    await (reducer as any).ensureOutgoingRequestHash(tx.id);

    expect(getTransactionEventsMock).toHaveBeenCalledWith('0xblock', '0xextrinsic-hash', ethBridgeApiMock.api);
    expect(tx).toMatchObject({
      hash: '0xrequest-hash',
    });
  });

  it('restores missing SORA block data from history before reading the bridge request hash', async () => {
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      from: 'sora-address',
      hash: '0xextrinsic-hash',
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) {
        Object.assign(tx, params);
      }
    });
    const fetchHistoryElements = vi.fn().mockResolvedValue([
      {
        id: '0xextrinsic-hash',
        blockHash: '0xblock',
        blockHeight: '123',
        data: {},
      },
    ]);
    const getBridgeHistoryInstance = vi.fn().mockResolvedValue({ fetchHistoryElements });
    const reducer = createReducer(tx, updateTransaction, { getBridgeHistoryInstance });

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(null);
    getTransactionEventsMock.mockResolvedValueOnce([
      {
        event: {
          data: [{ toString: () => '0xrequest-hash' }],
        },
      },
    ]);

    await (reducer as any).ensureOutgoingRequestHash(tx.id);

    expect(fetchHistoryElements).toHaveBeenCalledWith('sora-address', 0, ['0xextrinsic-hash']);
    expect(getTransactionEventsMock).toHaveBeenCalledWith('0xblock', '0xextrinsic-hash', ethBridgeApiMock.api);
    expect(tx).toMatchObject({
      txId: '0xextrinsic-hash',
      blockId: '0xblock',
      blockHeight: 123,
      hash: '0xrequest-hash',
    });
  });

  it('rejects invalid local hashes when the SORA block data cannot be restored', async () => {
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      hash: '0xextrinsic-hash',
    };
    const reducer = createReducer(tx);

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(null);

    await expect((reducer as any).ensureOutgoingRequestHash(tx.id)).rejects.toThrow(
      '[Bridge]: Unable to restore ETH bridge request hash because SORA block data is unavailable'
    );
    expect(getTransactionEventsMock).not.toHaveBeenCalled();
  });

  it('keeps an existing hash when it already resolves to a bridge request status', async () => {
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      blockId: '0xblock',
      txId: '0xextrinsic-hash',
      hash: '0xrequest-hash',
    };
    const reducer = createReducer(tx);

    ethBridgeApiMock.getRequestStatus.mockResolvedValueOnce('Pending');

    await (reducer as any).ensureOutgoingRequestHash(tx.id);

    expect(getTransactionEventsMock).not.toHaveBeenCalled();
    expect(tx.hash).toBe('0xrequest-hash');
  });

  it('rejects a finalized failed SORA extrinsic instead of treating its block hash as success', async () => {
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
      blockId: '0xfailed-block',
      txId: '0xfailed-extrinsic',
      status: TransactionStatus.Error,
      errorMessage: { section: 'ethBridge', name: 'RequestNotFound' },
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    const reducer = createReducer(tx, updateTransaction);

    await reducer.changeState(tx);

    expect(tx.transactionState).toBe(ETH_BRIDGE_STATES.SORA_REJECTED);
    expect(tx.errorMessage).toContain('ethBridge.RequestNotFound');
    expect(ethBridgeApiMock.getRequestStatus).not.toHaveBeenCalled();
    expect(getTransactionEventsMock).not.toHaveBeenCalled();
  });

  it('stops request-hash polling when an in-block SORA extrinsic later finalizes as failed', async () => {
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
      blockId: '0xfailed-block',
      txId: '0xfailed-extrinsic',
      status: TransactionStatus.InBlock,
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    const reducer = createReducer(tx, updateTransaction);

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(null);
    getTransactionEventsMock.mockImplementationOnce(async () => {
      tx.status = TransactionStatus.Error;
      tx.errorMessage = 'system.ExtrinsicFailed';
      return [];
    });

    await reducer.changeState(tx);

    expect(tx.transactionState).toBe(ETH_BRIDGE_STATES.SORA_REJECTED);
    expect(tx.errorMessage).toContain('system.ExtrinsicFailed');
    expect(getTransactionEventsMock).toHaveBeenCalledTimes(1);
  });

  it.each(['0xrecipient', '0xunexpected'])(
    'continues restored outgoing transfers without replacing their original recipient (%s)',
    async (approvedRecipient) => {
      const tx = {
        id: 'tx-outgoing',
        type: Operation.EthBridgeOutgoing,
        transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
        blockId: '0xblock',
        txId: '0xextrinsic-hash',
        hash: '0xrequest-hash',
        externalNetwork: 1,
        to: '0xrecipient',
      } as any;
      const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
        if (id === tx.id) {
          Object.assign(tx, params);
        }
      });
      const reducer = createReducer(tx, updateTransaction);
      const waitForTransactionStatus = vi
        .spyOn(reducer, 'waitForTransactionStatus')
        .mockRejectedValue(new Error('status should not be required for restored transactions'));

      ethBridgeApiMock.getRequestStatus.mockResolvedValue(BridgeTxStatus.Ready);
      ethBridgeApiMock.getApprovedRequest.mockResolvedValue({ to: approvedRecipient });

      await reducer.changeState(tx);

      expect(waitForTransactionStatus).not.toHaveBeenCalled();
      expect(tx.transactionState).toBe(ETH_BRIDGE_STATES.EVM_SUBMITTED);
      expect(tx.to).toBe('0xrecipient');
    }
  );

  it('restores indexed SORA metadata before falling back to the slow block wait', async () => {
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
      from: 'sora-address',
      txId: '0xextrinsic-hash',
      externalNetwork: 1,
      to: '0xrecipient',
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) {
        Object.assign(tx, params);
      }
    });
    const fetchHistoryElements = vi.fn().mockResolvedValue([
      {
        id: '0xextrinsic-hash',
        blockHash: '0xblock',
        blockHeight: '123',
        data: {
          requestHash: '0xrequest-hash',
        },
      },
    ]);
    const getBridgeHistoryInstance = vi.fn().mockResolvedValue({ fetchHistoryElements });
    const reducer = createReducer(tx, updateTransaction, { getBridgeHistoryInstance });
    const waitForTransactionBlockId = vi
      .spyOn(reducer, 'waitForTransactionBlockId')
      .mockRejectedValue(new Error('block wait should not be needed when history has request metadata'));

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(BridgeTxStatus.Ready);
    ethBridgeApiMock.getApprovedRequest.mockResolvedValue({ to: '0xrecipient' });

    await reducer.changeState(tx);

    expect(fetchHistoryElements).toHaveBeenCalledWith('sora-address', 0, ['0xextrinsic-hash']);
    expect(waitForTransactionBlockId).not.toHaveBeenCalled();
    expect(tx).toMatchObject({
      blockId: '0xblock',
      blockHeight: 123,
      hash: '0xrequest-hash',
      transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
    });
  });

  it('advances a signed SORA row to automatic reconciliation before the indexer is ready', async () => {
    vi.useFakeTimers();
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.SORA_SUBMITTED,
      from: 'sora-address',
      txId: '0xextrinsic-hash',
      externalNetwork: 1,
      to: '0xrecipient',
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    const fetchHistoryElements = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: '0xextrinsic-hash',
          blockHash: '0xblock',
          blockHeight: '122',
          data: { requestHash: '0xrequest-hash' },
        },
      ]);
    const reducer = createReducer(tx, updateTransaction, {
      getBridgeHistoryInstance: vi.fn().mockResolvedValue({ fetchHistoryElements }),
    });

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(BridgeTxStatus.Ready);
    ethBridgeApiMock.getApprovedRequest.mockResolvedValue({ to: '0xrecipient' });

    await reducer.changeState(tx);

    expect(tx.transactionState).toBe(ETH_BRIDGE_STATES.SORA_PENDING);
    expect(fetchHistoryElements).not.toHaveBeenCalled();

    const reconciliation = reducer.changeState(tx);
    await vi.advanceTimersByTimeAsync(2_000);
    await reconciliation;

    expect(fetchHistoryElements).toHaveBeenCalledTimes(2);
    expect(tx).toMatchObject({
      blockId: '0xblock',
      hash: '0xrequest-hash',
      transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
    });
    expect(tx.endTime).toBeUndefined();
    expect(tx.errorMessage).toBeUndefined();
  });

  it('reconciles an ambiguously submitted SORA extrinsic without signing it twice', async () => {
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.SORA_SUBMITTED,
      from: 'sora-address',
      to: '0xrecipient',
      amount: '1',
      assetAddress: 'asset-id',
      externalNetwork: 1,
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    const reducer = createReducer(tx, updateTransaction);

    (reducer as any).getAssetByAddress = vi.fn(() => ({ address: 'asset-id' }));
    ethBridgeApiMock.transfer.mockImplementationOnce(async () => {
      tx.txId = '0xsigned-extrinsic-hash';
      throw new Error('RPC response lost');
    });

    await reducer.changeState(tx);

    expect(ethBridgeApiMock.transfer).toHaveBeenCalledTimes(1);
    expect(tx).toMatchObject({
      txId: '0xsigned-extrinsic-hash',
      transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
    });
    expect(tx.endTime).toBeUndefined();
    expect(tx.errorMessage).toBeUndefined();
  });

  it('keeps polling through indexer lag and advances without a user Retry', async () => {
    vi.useFakeTimers();
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
      from: 'sora-address',
      txId: '0xextrinsic-hash',
      externalNetwork: 1,
      to: '0xrecipient',
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    const fetchHistoryElements = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: '0xextrinsic-hash',
          blockHash: '0xblock',
          blockHeight: '123',
          data: { requestHash: '0xrequest-hash' },
        },
      ]);
    const reducer = createReducer(tx, updateTransaction, {
      getBridgeHistoryInstance: vi.fn().mockResolvedValue({ fetchHistoryElements }),
    });

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(BridgeTxStatus.Ready);
    ethBridgeApiMock.getApprovedRequest.mockResolvedValue({ to: '0xrecipient' });

    const processing = reducer.changeState(tx);

    await vi.advanceTimersByTimeAsync(2_000);
    await processing;

    expect(fetchHistoryElements).toHaveBeenCalledTimes(2);
    expect(tx).toMatchObject({
      blockId: '0xblock',
      blockHeight: 123,
      hash: '0xrequest-hash',
      transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
    });
    expect(tx.endTime).toBeUndefined();
    expect(tx.errorMessage).toBeUndefined();
  });

  it('recovers automatically after a transient indexer error', async () => {
    vi.useFakeTimers();
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
      from: 'sora-address',
      txId: '0xextrinsic-hash',
      externalNetwork: 1,
      to: '0xrecipient',
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    const fetchHistoryElements = vi
      .fn()
      .mockRejectedValueOnce(new Error('indexer unavailable'))
      .mockResolvedValueOnce([
        {
          id: '0xextrinsic-hash',
          blockHash: '0xblock',
          blockHeight: '124',
          data: { requestHash: '0xrequest-hash' },
        },
      ]);
    const reducer = createReducer(tx, updateTransaction, {
      getBridgeHistoryInstance: vi.fn().mockResolvedValue({ fetchHistoryElements }),
    });

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(BridgeTxStatus.Ready);
    ethBridgeApiMock.getApprovedRequest.mockResolvedValue({ to: '0xrecipient' });

    const processing = reducer.changeState(tx);

    await vi.advanceTimersByTimeAsync(2_000);
    await processing;

    expect(fetchHistoryElements).toHaveBeenCalledTimes(2);
    expect(tx.transactionState).toBe(ETH_BRIDGE_STATES.EVM_SUBMITTED);
    expect(tx.endTime).toBeUndefined();
    expect(tx.errorMessage).toBeUndefined();
  });

  it('keeps a signed transfer pending through a transient request-hash RPC failure', async () => {
    vi.useFakeTimers();
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
      blockId: '0xblock',
      txId: '0xextrinsic-hash',
      hash: '0xrequest-hash',
      externalNetwork: 1,
      to: '0xrecipient',
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    const reducer = createReducer(tx, updateTransaction);

    ethBridgeApiMock.getRequestStatus
      .mockRejectedValueOnce(new Error('RPC reconnecting'))
      .mockResolvedValue(BridgeTxStatus.Ready);
    ethBridgeApiMock.getApprovedRequest.mockResolvedValue({ to: '0xrecipient' });

    const processing = reducer.changeState(tx);

    await vi.advanceTimersByTimeAsync(2_000);
    await processing;

    expect(tx.transactionState).toBe(ETH_BRIDGE_STATES.EVM_SUBMITTED);
    expect(tx.endTime).toBeUndefined();
    expect(tx.errorMessage).toBeUndefined();
  });

  it('cancels outgoing metadata polling without converting the transaction to a failed state', async () => {
    vi.useFakeTimers();
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
      from: 'sora-address',
      txId: '0xextrinsic-hash',
      externalNetwork: 1,
      to: '0xrecipient',
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    const fetchHistoryElements = vi.fn().mockResolvedValue([]);
    const reducer = createReducer(tx, updateTransaction, {
      getBridgeHistoryInstance: vi.fn().mockResolvedValue({ fetchHistoryElements }),
    });
    const controller = new AbortController();

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(null);

    const processing = reducer.changeState(tx, controller.signal);
    const expectation = expect(processing).rejects.toMatchObject({ name: 'AbortError' });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchHistoryElements).toHaveBeenCalledTimes(1);
    controller.abort();

    await expectation;
    expect(tx.transactionState).toBe(ETH_BRIDGE_STATES.SORA_PENDING);
    expect(tx.endTime).toBeUndefined();
    expect(tx.errorMessage).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels outgoing reconciliation while an indexer request is still pending', async () => {
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
      from: 'sora-address',
      txId: '0xextrinsic-hash',
      externalNetwork: 1,
      to: '0xrecipient',
    } as any;
    const fetchHistoryElements = vi.fn().mockReturnValue(new Promise(() => undefined));
    const reducer = createReducer(tx, vi.fn(), {
      getBridgeHistoryInstance: vi.fn().mockResolvedValue({ fetchHistoryElements }),
    });
    const controller = new AbortController();

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(null);

    const processing = reducer.changeState(tx, controller.signal);
    const expectation = expect(processing).rejects.toMatchObject({ name: 'AbortError' });

    await Promise.resolve();
    await Promise.resolve();
    controller.abort();

    await expectation;
    expect(tx.transactionState).toBe(ETH_BRIDGE_STATES.SORA_PENDING);
    expect(tx.endTime).toBeUndefined();
    expect(tx.errorMessage).toBeUndefined();
  });

  it('cancels outgoing approval polling without requiring a later Retry', async () => {
    vi.useFakeTimers();
    const unsubscribe = vi.fn();
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
      blockId: '0xblock',
      txId: '0xextrinsic-hash',
      hash: '0xrequest-hash',
      externalNetwork: 1,
      to: '0xrecipient',
    } as any;
    const reducer = createReducer(tx);
    const controller = new AbortController();

    ethBridgeApiMock.getRequestStatus.mockResolvedValue(BridgeTxStatus.Ready);
    ethBridgeApiMock.getApprovedRequest.mockResolvedValue(null);
    ethBridgeApiMock.subscribeOnRequestStatus.mockReturnValue({
      subscribe: () => ({ unsubscribe }),
    });

    const processing = reducer.changeState(tx, controller.signal);
    const expectation = expect(processing).rejects.toMatchObject({ name: 'AbortError' });

    await vi.advanceTimersByTimeAsync(0);
    controller.abort();

    await expectation;
    expect(tx.transactionState).toBe(ETH_BRIDGE_STATES.SORA_PENDING);
    expect(tx.endTime).toBeUndefined();
    expect(tx.errorMessage).toBeUndefined();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restores an already submitted Ethereum transaction before asking for another signature', async () => {
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      to: '0xrecipient',
      hash: '0xrequest-hash',
      startTime: 123,
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) {
        Object.assign(tx, params);
      }
    });
    const findEthTxBySoraHash = vi.fn().mockResolvedValue({ hash: '0xevm-hash' });
    const getBridgeHistoryInstance = vi.fn().mockResolvedValue({ findEthTxBySoraHash });
    const signExternalOutgoing = vi.fn();
    const reducer = createReducer(tx, updateTransaction, { getBridgeHistoryInstance, signExternalOutgoing });

    await reducer.onEvmSubmitted(tx.id, signExternalOutgoing);

    expect(findEthTxBySoraHash).toHaveBeenCalledWith('0xrecipient', '0xrequest-hash', 123);
    expect(signExternalOutgoing).not.toHaveBeenCalled();
    expect(tx.externalHash).toBe('0xevm-hash');
  });

  it('retries a transient outgoing history failure before deciding whether another signature is safe', async () => {
    vi.useFakeTimers();
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      to: '0xrecipient',
      hash: '0xrequest-hash',
      startTime: 123,
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    const findEthTxBySoraHash = vi
      .fn()
      .mockRejectedValueOnce(new Error('explorer temporarily unavailable'))
      .mockResolvedValueOnce({ hash: '0xauthoritative-evm-hash' });
    const getBridgeHistoryInstance = vi.fn().mockResolvedValue({ findEthTxBySoraHash });
    const signExternalOutgoing = vi.fn().mockResolvedValue({ hash: '0xduplicate-evm-hash' });
    const reducer = createReducer(tx, updateTransaction, { getBridgeHistoryInstance, signExternalOutgoing });

    const processing = reducer.onEvmSubmitted(tx.id, signExternalOutgoing);

    await vi.advanceTimersByTimeAsync(2_000);
    await processing;

    expect(findEthTxBySoraHash).toHaveBeenCalledTimes(2);
    expect(findEthTxBySoraHash).toHaveBeenLastCalledWith('0xrecipient', '0xrequest-hash', 123);
    expect(signExternalOutgoing).not.toHaveBeenCalled();
    expect(tx.externalHash).toBe('0xauthoritative-evm-hash');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('skips submitted Ethereum transaction restoration for a live in-progress transfer', async () => {
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      to: '0xrecipient',
      hash: '0xrequest-hash',
      startTime: 123,
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) {
        Object.assign(tx, params);
      }
    });
    const findEthTxBySoraHash = vi.fn().mockResolvedValue({ hash: '0xexisting-evm-hash' });
    const getBridgeHistoryInstance = vi.fn().mockResolvedValue({ findEthTxBySoraHash });
    const signExternalOutgoing = vi.fn().mockResolvedValue({ hash: '0xfresh-evm-hash' });
    const reducer = createReducer(tx, updateTransaction, {
      getBridgeHistoryInstance,
      signExternalOutgoing,
      isTransactionInProgress: vi.fn(() => true),
    });

    await reducer.onEvmSubmitted(tx.id, signExternalOutgoing);

    expect(getBridgeHistoryInstance).not.toHaveBeenCalled();
    expect(findEthTxBySoraHash).not.toHaveBeenCalled();
    expect(signExternalOutgoing).toHaveBeenCalledWith(tx.id, expect.any(Function));
    expect(tx.externalHash).toBe('0xfresh-evm-hash');
    expect(tx.externalNetworkFee).toBe('0.01');
  });

  it('exposes a persistent discovery failure without losing SORA evidence or asking for another signature', async () => {
    vi.useFakeTimers();
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      to: '0xrecipient',
      hash: '0xrequest-hash',
      txId: '0xsora-tx',
    } as any;
    const findEthTxBySoraHash = vi.fn().mockRejectedValue(new Error('explorer offline'));
    const signExternalOutgoing = vi.fn();
    const reducer = createReducer(tx, vi.fn(), {
      getBridgeHistoryInstance: vi.fn().mockResolvedValue({ findEthTxBySoraHash }),
      signExternalOutgoing,
    });
    const result = expect(reducer.onEvmSubmitted(tx.id, signExternalOutgoing)).rejects.toThrow('explorer offline');
    await vi.advanceTimersByTimeAsync(4_000);
    await result;
    expect(findEthTxBySoraHash).toHaveBeenCalledTimes(3);
    expect(signExternalOutgoing).not.toHaveBeenCalled();
    expect(tx).toMatchObject({ hash: '0xrequest-hash', txId: '0xsora-tx' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('asks for a fresh Ethereum signature when the restored matching transaction failed', async () => {
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      to: '0xrecipient',
      hash: '0xrequest-hash',
      startTime: 123,
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) {
        Object.assign(tx, params);
      }
    });
    const findEthTxBySoraHash = vi.fn().mockResolvedValue({ hash: '0xfailed-evm-hash', isError: '1' });
    const getBridgeHistoryInstance = vi.fn().mockResolvedValue({ findEthTxBySoraHash });
    const signExternalOutgoing = vi.fn().mockResolvedValue({ hash: '0xretry-evm-hash' });
    const reducer = createReducer(tx, updateTransaction, { getBridgeHistoryInstance, signExternalOutgoing });

    await reducer.onEvmSubmitted(tx.id, signExternalOutgoing);

    expect(findEthTxBySoraHash).toHaveBeenCalledWith('0xrecipient', '0xrequest-hash', 123);
    expect(signExternalOutgoing).toHaveBeenCalledWith(tx.id, expect.any(Function));
    expect(tx.externalHash).toBe('0xretry-evm-hash');
    expect(tx.externalNetworkFee).toBe('0.01');
  });

  it('asks for a fresh Ethereum signature when the restored transaction receipt failed', async () => {
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      to: '0xrecipient',
      hash: '0xrequest-hash',
      startTime: 123,
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) {
        Object.assign(tx, params);
      }
    });
    const findEthTxBySoraHash = vi.fn().mockResolvedValue({ hash: '0xfailed-evm-hash' });
    const getBridgeHistoryInstance = vi.fn().mockResolvedValue({ findEthTxBySoraHash });
    const signExternalOutgoing = vi.fn().mockResolvedValue({ hash: '0xretry-evm-hash' });
    const reducer = createReducer(tx, updateTransaction, { getBridgeHistoryInstance, signExternalOutgoing });

    getEvmTransactionReceiptByHashMock.mockResolvedValueOnce({ status: 0 });

    await reducer.onEvmSubmitted(tx.id, signExternalOutgoing);

    expect(getEvmTransactionReceiptByHashMock).toHaveBeenCalledWith('0xfailed-evm-hash');
    expect(signExternalOutgoing).toHaveBeenCalledWith(tx.id, expect.any(Function));
    expect(tx.externalHash).toBe('0xretry-evm-hash');
  });

  it('persists prepared EVM submission evidence before sending and clears it after a successful signature', async () => {
    const evidence = {
      from: '0xsender',
      to: '0xbridge-contract',
      nonce: 42,
      data: '0xdeadbeef',
      value: '1000000000000000000',
      startTimestamp: 1_700_000_000_000,
    };
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
      payload: { note: 'keep-me', tonswapFunding: 'ethereum-dai-v1' },
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    const evidenceSeenBeforeSend = vi.fn();
    const signExternalOutgoing = vi.fn(async (id: string, recordSubmission?: (prepared: typeof evidence) => void) => {
      recordSubmission?.(evidence);
      evidenceSeenBeforeSend(tx.payload?.evmSubmission);

      return { hash: '0xfresh-evm-hash' };
    });
    const reducer = createReducer(tx, updateTransaction, { signExternalOutgoing });

    await reducer.onEvmSubmitted(tx.id, signExternalOutgoing as any);

    expect(signExternalOutgoing).toHaveBeenCalledWith(tx.id, expect.any(Function));
    expect(evidenceSeenBeforeSend).toHaveBeenCalledWith(evidence);
    expect(tx).toMatchObject({
      externalHash: '0xfresh-evm-hash',
      externalNetworkFee: '0.01',
      payload: { note: 'keep-me', tonswapFunding: 'ethereum-dai-v1' },
    });
    expect(tx.payload.evmSubmission).toBeUndefined();
  });

  it('recovers an ambiguously submitted EVM transaction without requesting a second signature', async () => {
    vi.useFakeTimers();
    const evidence = {
      from: '0xsender',
      to: '0xbridge-contract',
      nonce: 43,
      data: '0xcafebabe',
      value: '25',
      startTimestamp: 1_700_000_001_000,
    };
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
      payload: {},
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    const findEthTxBySubmissionFingerprint = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ hash: '0xrecovered-evm-hash' });
    const getBridgeHistoryInstance = vi.fn().mockResolvedValue({ findEthTxBySubmissionFingerprint });
    const signExternalOutgoing = vi.fn(async (id: string, recordSubmission?: (prepared: typeof evidence) => void) => {
      recordSubmission?.(evidence);
      throw Object.assign(new Error('provider response lost'), { code: 'UNKNOWN_ERROR' });
    });
    const reducer = createReducer(tx, updateTransaction, { getBridgeHistoryInstance, signExternalOutgoing });

    const processing = reducer.onEvmSubmitted(tx.id, signExternalOutgoing as any);
    await vi.advanceTimersByTimeAsync(10_000);
    await processing;

    expect(signExternalOutgoing).toHaveBeenCalledTimes(1);
    expect(findEthTxBySubmissionFingerprint.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(findEthTxBySubmissionFingerprint).toHaveBeenLastCalledWith(evidence);
    expect(tx.externalHash).toBe('0xrecovered-evm-hash');
    expect(tx.payload.evmSubmission).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('resumes pending EVM submission evidence by polling history instead of signing again', async () => {
    vi.useFakeTimers();
    const evidence = {
      from: '0xsender',
      to: '0xbridge-contract',
      nonce: 44,
      data: '0x1234',
      value: '50',
      startTimestamp: 1_700_000_002_000,
    };
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
      payload: { evmSubmission: evidence, note: 'keep-me' },
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    const findEthTxBySubmissionFingerprint = vi
      .fn()
      .mockRejectedValueOnce(new Error('explorer temporarily unavailable'))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ hash: '0xresumed-evm-hash' });
    const getBridgeHistoryInstance = vi.fn().mockResolvedValue({ findEthTxBySubmissionFingerprint });
    const signExternalOutgoing = vi.fn();
    const reducer = createReducer(tx, updateTransaction, { getBridgeHistoryInstance, signExternalOutgoing });

    const processing = reducer.onEvmSubmitted(tx.id, signExternalOutgoing);
    await vi.advanceTimersByTimeAsync(10_000);
    await processing;

    expect(signExternalOutgoing).not.toHaveBeenCalled();
    expect(findEthTxBySubmissionFingerprint.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(findEthTxBySubmissionFingerprint).toHaveBeenLastCalledWith(evidence);
    expect(tx.externalHash).toBe('0xresumed-evm-hash');
    expect(tx.payload.note).toBe('keep-me');
    expect(tx.payload.evmSubmission).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops EVM submission-evidence polling cleanly when tracking is canceled', async () => {
    vi.useFakeTimers();
    const evidence = {
      from: '0xsender',
      to: '0xbridge-contract',
      nonce: 45,
      data: '0xabcd',
      value: '75',
      startTimestamp: 1_700_000_003_000,
    };
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
      payload: { evmSubmission: evidence },
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    const findEthTxBySubmissionFingerprint = vi.fn().mockResolvedValue(null);
    const getBridgeHistoryInstance = vi.fn().mockResolvedValue({ findEthTxBySubmissionFingerprint });
    const signExternalOutgoing = vi.fn();
    const reducer = createReducer(tx, updateTransaction, { getBridgeHistoryInstance, signExternalOutgoing });
    const controller = new AbortController();

    const processing = reducer.onEvmSubmitted(tx.id, signExternalOutgoing, controller.signal);
    const expectation = expect(processing).rejects.toMatchObject({ name: 'AbortError' });

    await vi.advanceTimersByTimeAsync(0);
    expect(findEthTxBySubmissionFingerprint).toHaveBeenCalledWith(evidence);
    controller.abort();

    await expectation;
    expect(signExternalOutgoing).not.toHaveBeenCalled();
    expect(tx.externalHash).toBeUndefined();
    expect(tx.payload.evmSubmission).toEqual(evidence);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['NONCE_EXPIRED', 'REPLACEMENT_UNDERPRICED'])(
    'preserves prepared EVM submission evidence after ambiguous %s errors',
    async (code) => {
      const evidence = {
        from: '0xsender',
        to: '0xbridge-contract',
        nonce: 46,
        data: '0xbeef',
        value: '100',
        startTimestamp: 1_700_000_004_000,
      };
      const tx = {
        id: 'tx-outgoing',
        type: Operation.EthBridgeOutgoing,
        transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
        payload: { note: 'keep-me' },
      } as any;
      const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
        if (id === tx.id) Object.assign(tx, params);
      });
      const findEthTxBySubmissionFingerprint = vi.fn().mockResolvedValue(null);
      const getBridgeHistoryInstance = vi.fn().mockResolvedValue({ findEthTxBySubmissionFingerprint });
      const ambiguousError = Object.assign(new Error(`Ambiguous ${code} response`), { code });
      const signExternalOutgoing = vi.fn(async (id: string, recordSubmission?: (prepared: typeof evidence) => void) => {
        recordSubmission?.(evidence);
        throw ambiguousError;
      });
      const reducer = createReducer(tx, updateTransaction, { getBridgeHistoryInstance, signExternalOutgoing });
      const controller = new AbortController();

      const processing = reducer.onEvmSubmitted(tx.id, signExternalOutgoing as any, controller.signal);
      const expectation = expect(processing).rejects.toMatchObject({ name: 'AbortError' });

      await vi.waitFor(() => expect(findEthTxBySubmissionFingerprint).toHaveBeenCalledWith(evidence));
      expect(signExternalOutgoing).toHaveBeenCalledTimes(1);
      expect(tx.payload).toEqual({ note: 'keep-me', evmSubmission: evidence });

      controller.abort();
      await expectation;

      expect(tx.payload).toEqual({ note: 'keep-me', evmSubmission: evidence });
    }
  );

  it('clears prepared EVM submission evidence after an ACTION_REJECTED wallet response', async () => {
    const evidence = {
      from: '0xsender',
      to: '0xbridge-contract',
      nonce: 46,
      data: '0xbeef',
      value: '100',
      startTimestamp: 1_700_000_004_000,
    };
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
      payload: { note: 'keep-me', tonswapFunding: 'ethereum-dai-v1' },
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    const findEthTxBySubmissionFingerprint = vi.fn();
    const getBridgeHistoryInstance = vi.fn().mockResolvedValue({ findEthTxBySubmissionFingerprint });
    const rejection = Object.assign(new Error('User rejected request'), { code: 'ACTION_REJECTED' });
    const signExternalOutgoing = vi.fn(async (id: string, recordSubmission?: (prepared: typeof evidence) => void) => {
      recordSubmission?.(evidence);
      throw rejection;
    });
    const reducer = createReducer(tx, updateTransaction, { getBridgeHistoryInstance, signExternalOutgoing });

    await expect(reducer.onEvmSubmitted(tx.id, signExternalOutgoing as any)).rejects.toBe(rejection);

    expect(signExternalOutgoing).toHaveBeenCalledTimes(1);
    expect(findEthTxBySubmissionFingerprint).not.toHaveBeenCalled();
    expect(tx.payload.note).toBe('keep-me');
    expect(tx.payload.tonswapFunding).toBe('ethereum-dai-v1');
    expect(tx.payload.evmSubmission).toBeUndefined();
  });

  it('clears matching evidence when a wallet rejects after tracking was canceled', async () => {
    const evidence = {
      from: '0xsender',
      to: '0xbridge-contract',
      nonce: 47,
      data: '0xfeed',
      value: '125',
      startTimestamp: 1_700_000_005_000,
    };
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
      payload: { note: 'keep-me' },
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    let rejectSigning!: (error: unknown) => void;
    const signExternalOutgoing = vi.fn((id: string, recordSubmission?: (prepared: typeof evidence) => void) => {
      recordSubmission?.(evidence);

      return new Promise((_, reject) => {
        rejectSigning = reject;
      });
    });
    const reducer = createReducer(tx, updateTransaction, {
      signExternalOutgoing,
      isTransactionInProgress: vi.fn(() => true),
    });
    const controller = new AbortController();

    const processing = reducer.onEvmSubmitted(tx.id, signExternalOutgoing as any, controller.signal);
    const expectation = expect(processing).rejects.toMatchObject({ name: 'AbortError' });

    expect(tx.payload.evmSubmission).toEqual(evidence);
    controller.abort();
    await expectation;

    rejectSigning(Object.assign(new Error('User rejected request'), { code: 'ACTION_REJECTED' }));
    await vi.waitFor(() => expect(tx.payload.evmSubmission).toBeUndefined());

    expect(tx.payload.note).toBe('keep-me');
  });

  it('does not clear newer evidence when an older canceled wallet prompt rejects late', async () => {
    const evidence = {
      from: '0xsender',
      to: '0xbridge-contract',
      nonce: 48,
      data: '0xaaaa',
      value: '150',
      startTimestamp: 1_700_000_006_000,
    };
    const replacementEvidence = {
      ...evidence,
      nonce: 49,
      data: '0xbbbb',
      startTimestamp: evidence.startTimestamp + 1_000,
    };
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
      payload: {},
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    let rejectSigning!: (error: unknown) => void;
    const signExternalOutgoing = vi.fn((id: string, recordSubmission?: (prepared: typeof evidence) => void) => {
      recordSubmission?.(evidence);

      return new Promise((_, reject) => {
        rejectSigning = reject;
      });
    });
    const reducer = createReducer(tx, updateTransaction, {
      signExternalOutgoing,
      isTransactionInProgress: vi.fn(() => true),
    });
    const controller = new AbortController();

    const processing = reducer.onEvmSubmitted(tx.id, signExternalOutgoing as any, controller.signal);
    const expectation = expect(processing).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();
    await expectation;
    tx.payload = { evmSubmission: replacementEvidence };

    rejectSigning(Object.assign(new Error('User rejected request'), { code: 'ACTION_REJECTED' }));
    await Promise.resolve();
    await Promise.resolve();

    expect(tx.payload.evmSubmission).toEqual(replacementEvidence);
  });

  it('lets an overlapping replacement tracker sign after the canceled wallet prompt rejects late', async () => {
    vi.useFakeTimers();
    const oldEvidence = {
      from: '0xsender',
      to: '0xbridge-contract',
      nonce: 50,
      data: '0xcccc',
      value: '175',
      startTimestamp: 1_700_000_007_000,
    };
    const newEvidence = {
      ...oldEvidence,
      nonce: 51,
      data: '0xdddd',
      startTimestamp: oldEvidence.startTimestamp + 1_000,
    };
    const tx = {
      id: 'tx-outgoing',
      type: Operation.EthBridgeOutgoing,
      transactionState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
      payload: {},
    } as any;
    const updateTransaction = vi.fn((id: string, params: Record<string, unknown>) => {
      if (id === tx.id) Object.assign(tx, params);
    });
    let rejectOldSigning!: (error: unknown) => void;
    const oldSigning = vi.fn((id: string, recordSubmission?: (prepared: typeof oldEvidence) => void) => {
      recordSubmission?.(oldEvidence);

      return new Promise((_, reject) => {
        rejectOldSigning = reject;
      });
    });
    const oldReducer = createReducer(tx, updateTransaction, {
      signExternalOutgoing: oldSigning,
      isTransactionInProgress: vi.fn(() => true),
    });
    const oldController = new AbortController();
    const oldProcessing = oldReducer.onEvmSubmitted(tx.id, oldSigning as any, oldController.signal);
    const oldExpectation = expect(oldProcessing).rejects.toMatchObject({ name: 'AbortError' });

    oldController.abort();
    await oldExpectation;
    expect(tx.payload.evmSubmission).toEqual(oldEvidence);

    const findEthTxBySubmissionFingerprint = vi.fn().mockResolvedValue(null);
    const getBridgeHistoryInstance = vi.fn().mockResolvedValue({ findEthTxBySubmissionFingerprint });
    const replacementSigning = vi.fn(async (id: string, recordSubmission?: (prepared: typeof newEvidence) => void) => {
      recordSubmission?.(newEvidence);
      return { hash: '0xreplacement-evm-hash' };
    });
    const replacementReducer = createReducer(tx, updateTransaction, {
      getBridgeHistoryInstance,
      signExternalOutgoing: replacementSigning,
    });
    const replacementProcessing = replacementReducer.onEvmSubmitted(tx.id, replacementSigning as any);

    await vi.advanceTimersByTimeAsync(0);
    expect(findEthTxBySubmissionFingerprint).toHaveBeenCalledWith(oldEvidence);
    expect(replacementSigning).not.toHaveBeenCalled();

    rejectOldSigning(Object.assign(new Error('User rejected request'), { code: 'ACTION_REJECTED' }));
    await vi.advanceTimersByTimeAsync(2_000);
    await replacementProcessing;

    expect(replacementSigning).toHaveBeenCalledTimes(1);
    expect(tx.externalHash).toBe('0xreplacement-evm-hash');
    expect(tx.payload.evmSubmission).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
});
