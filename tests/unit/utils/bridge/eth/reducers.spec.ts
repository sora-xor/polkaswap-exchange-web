import { Operation } from '@sora-substrate/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';

const getTransactionEventsMock = vi.hoisted(() => vi.fn());
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
});
