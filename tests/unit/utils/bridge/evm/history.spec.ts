import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Operation, TransactionStatus } from '@sora-substrate/sdk';
import { BridgeNetworkType, BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';

const historyElementsFilterMock = vi.hoisted(() => vi.fn((value) => value));
const getHistoryPagedMock = vi.hoisted(() => vi.fn());
const parseTransactionAsHistoryItemMock = vi.hoisted(() => vi.fn());

const evmBridgeApiMock = vi.hoisted(() => {
  const state = {
    history: {} as Record<string, any>,
    storage: {} as Record<string, string>,
  };

  return {
    state,
    get history() {
      return state.history;
    },
    set history(value: Record<string, any>) {
      state.history = value;
    },
    get historyList() {
      return Object.values(state.history);
    },
    accountStorage: {
      get: vi.fn((key: string) => state.storage[key]),
      set: vi.fn((key: string, value: number) => {
        state.storage[key] = String(value);
      }),
    },
    saveHistory: vi.fn((item: Record<string, any>) => {
      state.history[item.id] = item;
    }),
    removeHistory: vi.fn((...ids: string[]) => {
      ids.forEach((id) => {
        delete state.history[id];
      });
    }),
  };
});

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => ({
    historyElementsFilter: historyElementsFilterMock,
    services: {
      explorer: {
        account: {
          getHistoryPaged: getHistoryPagedMock,
        },
      },
      dataParser: {
        parseTransactionAsHistoryItem: parseTransactionAsHistoryItemMock,
      },
    },
  }),
}));

vi.mock('@/utils/bridge/evm/api', () => ({
  evmBridgeApi: evmBridgeApiMock,
}));

import { EvmBridgeHistory, updateEvmBridgeHistory } from '@/utils/bridge/evm/classes/history';

describe('EvmBridgeHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    evmBridgeApiMock.history = {};
    evmBridgeApiMock.state.storage = {};
    getHistoryPagedMock.mockResolvedValue({
      edges: [],
      pageInfo: { hasNextPage: false, endCursor: '' },
    });
    parseTransactionAsHistoryItemMock.mockReset();
  });

  it('restores EVM bridge history from Polkaswap indexer bridgeProxy records', async () => {
    const updateCallback = vi.fn();

    getHistoryPagedMock.mockResolvedValueOnce({
      edges: [{ node: { id: 'tx-1', timestamp: 10 } }],
      pageInfo: { hasNextPage: false, endCursor: '' },
    });
    parseTransactionAsHistoryItemMock.mockResolvedValueOnce({
      id: 'tx-1',
      txId: 'tx-1',
      type: Operation.EvmOutgoing,
      status: TransactionStatus.Finalized,
      externalNetwork: 111,
    });

    await new EvmBridgeHistory().updateAccountHistory('sora-address', 111, {}, updateCallback);

    expect(historyElementsFilterMock).toHaveBeenCalledWith({
      address: 'sora-address',
      operations: [Operation.EvmOutgoing, Operation.EvmIncoming],
      timestamp: 0,
    });
    expect(evmBridgeApiMock.saveHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tx-1',
        externalNetwork: 111,
        externalNetworkType: BridgeNetworkType.Evm,
        transactionState: BridgeTxStatus.Done,
      })
    );
    expect(updateCallback).toHaveBeenCalled();
    expect(evmBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('evmBridgeHistorySyncTimestamp', 10);
  });

  it('paginates restore results and ignores malformed or non-EVM records', async () => {
    const updateCallback = vi.fn();

    getHistoryPagedMock
      .mockResolvedValueOnce({
        edges: [
          { node: { id: 'tx-1', timestamp: 20 } },
          { node: { id: 'malformed', timestamp: 19 } },
        ],
        pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
      })
      .mockResolvedValueOnce({
        edges: [{ node: { id: 'wrong-operation', timestamp: 18 } }],
        pageInfo: { hasNextPage: false, endCursor: '' },
      });
    parseTransactionAsHistoryItemMock
      .mockResolvedValueOnce({
        id: 'tx-1',
        txId: 'tx-1',
        type: Operation.EvmIncoming,
        status: TransactionStatus.Error,
        externalNetwork: 111,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'wrong-operation',
        type: Operation.Swap,
        status: TransactionStatus.Finalized,
        externalNetwork: 111,
      });

    await new EvmBridgeHistory().updateAccountHistory('sora-address', 111, {}, updateCallback);

    expect(getHistoryPagedMock).toHaveBeenNthCalledWith(1, {
      after: '',
      filter: {
        address: 'sora-address',
        operations: [Operation.EvmOutgoing, Operation.EvmIncoming],
        timestamp: 0,
      },
      first: 100,
    });
    expect(getHistoryPagedMock).toHaveBeenNthCalledWith(2, {
      after: 'cursor-1',
      filter: {
        address: 'sora-address',
        operations: [Operation.EvmOutgoing, Operation.EvmIncoming],
        timestamp: 0,
      },
      first: 100,
    });
    expect(evmBridgeApiMock.saveHistory).toHaveBeenCalledTimes(1);
    expect(evmBridgeApiMock.saveHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tx-1',
        transactionState: BridgeTxStatus.Failed,
      })
    );
    expect(updateCallback).toHaveBeenCalledTimes(1);
    expect(evmBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('evmBridgeHistorySyncTimestamp', 20);
  });

  it('stops pagination cleanly when the indexer response disappears mid-restore', async () => {
    getHistoryPagedMock
      .mockResolvedValueOnce({
        edges: [{ node: { id: 'tx-1', timestamp: 15 } }],
        pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
      })
      .mockResolvedValueOnce(null);

    const history = await new EvmBridgeHistory().fetchHistoryElements('sora-address', 12);

    expect(history).toEqual([{ id: 'tx-1', timestamp: 15 }]);
    expect(getHistoryPagedMock).toHaveBeenNthCalledWith(2, {
      after: 'cursor-1',
      filter: {
        address: 'sora-address',
        operations: [Operation.EvmOutgoing, Operation.EvmIncoming],
        timestamp: 12,
      },
      first: 100,
    });
  });

  it('skips cross-network, in-progress, and finalized local bridge history', async () => {
    const updateCallback = vi.fn();

    evmBridgeApiMock.history = {
      pendingLocal: { id: 'pendingLocal', hash: '0xpending-request', externalNetwork: 111 },
      doneLocal: {
        id: 'doneLocal',
        hash: '0xdone-request',
        externalNetwork: 111,
        transactionState: BridgeTxStatus.Done,
      },
    };
    getHistoryPagedMock.mockResolvedValueOnce({
      edges: [
        { node: { id: 'other-network', timestamp: 31 } },
        { node: { id: 'pending-indexer', timestamp: 30 } },
        { node: { id: 'done-indexer', timestamp: 29 } },
        { node: { id: 'fresh', timestamp: 28 } },
      ],
      pageInfo: { hasNextPage: false, endCursor: '' },
    });
    parseTransactionAsHistoryItemMock
      .mockResolvedValueOnce({
        id: 'other-network',
        type: Operation.EvmOutgoing,
        status: TransactionStatus.Finalized,
        externalNetwork: 222,
      })
      .mockResolvedValueOnce({
        id: 'pending-indexer',
        type: Operation.EvmOutgoing,
        hash: '0xpending-request',
        status: TransactionStatus.Finalized,
        externalNetwork: 111,
      })
      .mockResolvedValueOnce({
        id: 'done-indexer',
        type: Operation.EvmIncoming,
        hash: '0xdone-request',
        status: TransactionStatus.Finalized,
        externalNetwork: 111,
      })
      .mockResolvedValueOnce({
        id: 'fresh',
        type: Operation.EvmIncoming,
        status: TransactionStatus.Finalized,
        externalNetwork: 111,
      });

    await new EvmBridgeHistory().updateAccountHistory(
      'sora-address',
      111,
      { pendingLocal: true },
      updateCallback
    );

    expect(evmBridgeApiMock.saveHistory).toHaveBeenCalledTimes(1);
    expect(evmBridgeApiMock.saveHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'fresh',
        externalNetwork: 111,
        transactionState: BridgeTxStatus.Done,
      })
    );
    expect(evmBridgeApiMock.history).toEqual({
      pendingLocal: { id: 'pendingLocal', hash: '0xpending-request', externalNetwork: 111 },
      doneLocal: {
        id: 'doneLocal',
        hash: '0xdone-request',
        externalNetwork: 111,
        transactionState: BridgeTxStatus.Done,
      },
      fresh: expect.objectContaining({ id: 'fresh' }),
    });
    expect(updateCallback).toHaveBeenCalledTimes(1);
  });

  it('deduplicates repeated indexer records from the same restore batch', async () => {
    const updateCallback = vi.fn();

    getHistoryPagedMock.mockResolvedValueOnce({
      edges: [
        { node: { id: 'first-copy', timestamp: 41 } },
        { node: { id: 'duplicate-copy', timestamp: 40 } },
      ],
      pageInfo: { hasNextPage: false, endCursor: '' },
    });
    parseTransactionAsHistoryItemMock
      .mockResolvedValueOnce({
        id: 'first-copy',
        txId: 'first-copy',
        hash: '0xsame-request',
        type: Operation.EvmOutgoing,
        status: TransactionStatus.Finalized,
        externalNetwork: 111,
      })
      .mockResolvedValueOnce({
        id: 'duplicate-copy',
        txId: 'duplicate-copy',
        hash: '0xsame-request',
        type: Operation.EvmOutgoing,
        status: TransactionStatus.Finalized,
        externalNetwork: 111,
      });

    await new EvmBridgeHistory().updateAccountHistory('sora-address', 111, {}, updateCallback);

    expect(evmBridgeApiMock.saveHistory).toHaveBeenCalledTimes(1);
    expect(evmBridgeApiMock.saveHistory).toHaveBeenCalledWith(expect.objectContaining({ id: 'first-copy' }));
    expect(evmBridgeApiMock.history).toEqual({
      'first-copy': expect.objectContaining({
        id: 'first-copy',
        hash: '0xsame-request',
      }),
    });
    expect(updateCallback).toHaveBeenCalledTimes(1);
  });

  it('clears only selected-network restored history and preserves in-progress transactions', async () => {
    evmBridgeApiMock.history = {
      keepProgress: { id: 'keepProgress', externalNetwork: 111 },
      remove: { id: 'remove', externalNetwork: 111 },
      otherNetwork: { id: 'otherNetwork', externalNetwork: 222 },
    };

    await new EvmBridgeHistory().clearHistory(111, { keepProgress: true });

    expect(evmBridgeApiMock.removeHistory).toHaveBeenCalledWith('remove');
    expect(evmBridgeApiMock.history).toEqual({
      keepProgress: { id: 'keepProgress', externalNetwork: 111 },
      otherNetwork: { id: 'otherNetwork', externalNetwork: 222 },
    });
  });

  it('wires the bridge action context into account history restoration', async () => {
    const updateHistorySpy = vi.spyOn(EvmBridgeHistory.prototype, 'updateAccountHistory').mockResolvedValue(undefined);

    await updateEvmBridgeHistory({
      rootState: {
        wallet: { account: { address: 'sora-address' } },
        web3: { networkSelected: 111 },
        bridge: { inProgressIds: { pending: true } },
      },
    } as any)(false);

    expect(updateHistorySpy).toHaveBeenCalledWith('sora-address', 111, { pending: true }, undefined);

    updateHistorySpy.mockRestore();
  });
});
