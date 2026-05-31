import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Operation, TransactionStatus } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { BridgeNetworkType, BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

const historyElementsFilterMock = vi.hoisted(() => vi.fn((value) => value));
const getHistoryPagedMock = vi.hoisted(() => vi.fn());
const parseTransactionAsHistoryItemMock = vi.hoisted(() => vi.fn());

const subBridgeApiMock = vi.hoisted(() => {
  const state = {
    history: {} as Record<string, any>,
    storage: {} as Record<string, string>,
  };

  return {
    state,
    api: {},
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
    getUserTransactions: vi.fn(),
    saveHistory: vi.fn((item: Record<string, any>) => {
      state.history[item.id] = item;
    }),
    generateHistoryItem: vi.fn((item: Record<string, any>) => {
      state.history[item.id] = item;
      return item;
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

vi.mock('@/utils/bridge/sub/api', () => ({
  subBridgeApi: subBridgeApiMock,
}));

vi.mock('@/utils/bridge/sub/classes/adapter', () => ({
  SubNetworksConnector: class {
    public stop = vi.fn();
  },
}));

vi.mock('@/utils/bridge/common/utils', () => ({
  getBlockEventsByTxIndex: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    system: {},
  },
}));

import { SubBridgeHistory } from '@/utils/bridge/sub/classes/history';

describe('SubBridgeHistory', () => {
  const assetDataByAddress = vi.fn((address?: string | null) =>
    address === XOR.address ? { address: XOR.address, symbol: XOR.symbol, decimals: XOR.decimals } : null
  );

  beforeEach(() => {
    vi.clearAllMocks();
    subBridgeApiMock.history = {};
    subBridgeApiMock.state.storage = {};
    subBridgeApiMock.getUserTransactions.mockResolvedValue([]);
    getHistoryPagedMock.mockResolvedValue({
      edges: [],
      pageInfo: { hasNextPage: false, endCursor: '' },
    });
    parseTransactionAsHistoryItemMock.mockReset();
  });

  it('restores Liberland bridge history from Polkaswap indexer rows even when live bridge storage is empty', async () => {
    const updateCallback = vi.fn();

    getHistoryPagedMock.mockResolvedValueOnce({
      edges: [{ node: { id: '0xliberland', timestamp: 100 } }],
      pageInfo: { hasNextPage: false, endCursor: '' },
    });
    parseTransactionAsHistoryItemMock.mockResolvedValueOnce({
      id: '0xliberland',
      txId: '0xliberland',
      hash: '0xrequest',
      type: Operation.SubstrateOutgoing,
      status: TransactionStatus.Finalized,
      externalNetwork: SubNetworkId.Liberland,
      assetAddress: XOR.address,
      amount: '7',
      from: 'sora-address',
      to: 'liberland-address',
    });

    await new SubBridgeHistory().updateAccountHistory(
      SubNetworkId.Liberland,
      'sora-address',
      [XOR.address],
      {},
      assetDataByAddress,
      updateCallback
    );

    expect(historyElementsFilterMock).toHaveBeenCalledWith({
      address: 'sora-address',
      operations: [Operation.SubstrateOutgoing, Operation.SubstrateIncoming],
      timestamp: 0,
    });
    expect(subBridgeApiMock.getUserTransactions).toHaveBeenCalledWith('sora-address', SubNetworkId.Liberland);
    expect(subBridgeApiMock.saveHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '0xliberland',
        externalNetwork: SubNetworkId.Liberland,
        externalNetworkType: BridgeNetworkType.Sub,
        transactionState: BridgeTxStatus.Done,
      })
    );
    expect(updateCallback).toHaveBeenCalled();
    expect(subBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('subBridgeHistorySyncTimestamp:Liberland', 100);
  });

  it('skips cross-network, in-progress, finalized, and hidden-asset indexer rows', async () => {
    const updateCallback = vi.fn();

    subBridgeApiMock.history = {
      inProgress: { id: 'inProgress', hash: '0xinprogress', externalNetwork: SubNetworkId.Liberland },
      done: {
        id: 'done',
        hash: '0xdone',
        externalNetwork: SubNetworkId.Liberland,
        transactionState: BridgeTxStatus.Done,
      },
    };
    getHistoryPagedMock.mockResolvedValueOnce({
      edges: [
        { node: { id: 'wrong-operation', timestamp: 104 } },
        { node: { id: 'wrong-network', timestamp: 103 } },
        { node: { id: 'in-progress-row', timestamp: 102 } },
        { node: { id: 'done-row', timestamp: 101 } },
        { node: { id: 'hidden-asset', timestamp: 100 } },
        { node: { id: 'fresh', timestamp: 99 } },
      ],
      pageInfo: { hasNextPage: false, endCursor: '' },
    });
    parseTransactionAsHistoryItemMock
      .mockResolvedValueOnce({
        id: 'wrong-operation',
        type: Operation.EvmOutgoing,
        externalNetwork: SubNetworkId.Liberland,
        assetAddress: XOR.address,
      })
      .mockResolvedValueOnce({
        id: 'wrong-network',
        type: Operation.SubstrateOutgoing,
        externalNetwork: SubNetworkId.Kusama,
        assetAddress: XOR.address,
      })
      .mockResolvedValueOnce({
        id: 'in-progress-row',
        hash: '0xinprogress',
        type: Operation.SubstrateOutgoing,
        externalNetwork: SubNetworkId.Liberland,
        assetAddress: XOR.address,
      })
      .mockResolvedValueOnce({
        id: 'done-row',
        hash: '0xdone',
        type: Operation.SubstrateIncoming,
        externalNetwork: SubNetworkId.Liberland,
        assetAddress: XOR.address,
      })
      .mockResolvedValueOnce({
        id: 'hidden-asset',
        type: Operation.SubstrateIncoming,
        externalNetwork: SubNetworkId.Liberland,
        assetAddress: 'hidden',
      })
      .mockResolvedValueOnce({
        id: 'fresh',
        type: Operation.SubstrateIncoming,
        status: TransactionStatus.Error,
        externalNetwork: SubNetworkId.Liberland,
        assetAddress: XOR.address,
      });

    await new SubBridgeHistory().updateAccountHistory(
      SubNetworkId.Liberland,
      'sora-address',
      [XOR.address],
      { inProgress: true },
      assetDataByAddress,
      updateCallback
    );

    expect(subBridgeApiMock.saveHistory).toHaveBeenCalledTimes(1);
    expect(subBridgeApiMock.saveHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'fresh',
        transactionState: BridgeTxStatus.Failed,
      })
    );
    expect(updateCallback).toHaveBeenCalledTimes(1);
  });

  it('clears indexer-restored sync state with network history', async () => {
    subBridgeApiMock.history = {
      remove: { id: 'remove', externalNetwork: SubNetworkId.Liberland },
      keep: { id: 'keep', externalNetwork: SubNetworkId.Kusama },
    };

    await new SubBridgeHistory().clearHistory(SubNetworkId.Liberland, {}, vi.fn());

    expect(subBridgeApiMock.history).toEqual({
      keep: { id: 'keep', externalNetwork: SubNetworkId.Kusama },
    });
    expect(subBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('subBridgeHistorySyncTimestamp:Liberland', 0);
  });
});
