import { Operation } from '@sora-substrate/sdk';
import { BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('continues restored outgoing transfers without waiting for the volatile SDK status', async () => {
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
    ethBridgeApiMock.getApprovedRequest.mockResolvedValue({ to: '0xrecipient' });

    await reducer.changeState(tx);

    expect(waitForTransactionStatus).not.toHaveBeenCalled();
    expect(tx.transactionState).toBe(ETH_BRIDGE_STATES.EVM_SUBMITTED);
  });

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
    expect(signExternalOutgoing).toHaveBeenCalledWith(tx.id);
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
    expect(signExternalOutgoing).toHaveBeenCalledWith(tx.id);
    expect(tx.externalHash).toBe('0xretry-evm-hash');
  });
});
