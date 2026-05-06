import { of } from 'rxjs';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LimitOrderType } from '@/consts';
import { useOrderBookStore } from '@/stores/orderBook';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';

const shared = vi.hoisted(() => {
  const walletStore = {
    isLoggedIn: true,
    address: '5abc',
    account: { address: '5abc' as string },
    whitelist: {
      'base-1': { address: 'base-1' },
      'quote-1': { address: 'quote-1' },
    },
    accountAssetsAddressTable: {} as Record<string, unknown>,
  };

  const assetsStore = {
    assetDataByAddress: vi.fn((address?: string) => (address ? null : null)),
  };

  const settingsStore = {
    appConnection: {
      connection: {
        api: {
          isReady: Promise.resolve(),
          query: {
            orderBook: {
              orderBooks: {
                entries: vi.fn(async () => []),
              },
              aggregatedAsks: vi.fn(async () => new Map()),
              aggregatedBids: vi.fn(async () => new Map()),
            },
          },
        },
      },
    },
  };

  const asksUnsubscribe = vi.fn();
  const bidsUnsubscribe = vi.fn();
  const userOrdersUnsubscribe = vi.fn();
  const pagedOrdersUnsubscribe = vi.fn();
  const statsUnsubscribe = vi.fn();
  const balanceAdd = vi.fn();
  const balanceRemove = vi.fn();
  const balanceReset = vi.fn();

  const getOrderBooks = vi.fn(async () => ({}));
  const serializeKey = vi.fn((base: string, quote: string) => `${base},${quote}`);
  const getAggregatedAsks = vi.fn(async () => [] as unknown[]);
  const getAggregatedBids = vi.fn(async () => [] as unknown[]);
  const subscribeOnAggregatedAsks = vi.fn(() => ({
    subscribe: (callback: (value: unknown[]) => void) => {
      callback(['ask-live']);
      return { unsubscribe: asksUnsubscribe };
    },
  }));
  const subscribeOnAggregatedBids = vi.fn(() => ({
    subscribe: (callback: (value: unknown[]) => void) => {
      callback(['bid-live']);
      return { unsubscribe: bidsUnsubscribe };
    },
  }));
  const getUserLimitOrdersIds = vi.fn(async () => []);
  const subscribeOnUserLimitOrdersIds = vi.fn(() => ({
    subscribe: ({ next }: { next: (ids: number[]) => Promise<void> }) => {
      void next([101, 202]);
      return { unsubscribe: userOrdersUnsubscribe };
    },
  }));
  const getLimitOrder = vi.fn(async () => null);
  const subscribeOnLimitOrder = vi.fn((_: string, __: string, id: number) => of({ id, status: 'updated' }));

  const fetchOrderBooks = vi.fn(async () => []);
  const subscribeOnOrderBookUpdates = vi.fn(async (_id: string, handler: (data: Record<string, unknown>) => void) => {
    handler({
      id: { base: 'base-1', quote: 'quote-1', dexId: 7 },
      stats: { price: '5' },
      deals: [{ price: '5', amount: '1' }],
    });
    return statsUnsubscribe;
  });

  return {
    walletStore,
    assetsStore,
    settingsStore,
    asksUnsubscribe,
    bidsUnsubscribe,
    userOrdersUnsubscribe,
    pagedOrdersUnsubscribe,
    statsUnsubscribe,
    balanceAdd,
    balanceRemove,
    balanceReset,
    getOrderBooks,
    serializeKey,
    getAggregatedAsks,
    getAggregatedBids,
    subscribeOnAggregatedAsks,
    subscribeOnAggregatedBids,
    getUserLimitOrdersIds,
    subscribeOnUserLimitOrdersIds,
    getLimitOrder,
    subscribeOnLimitOrder,
    fetchOrderBooks,
    subscribeOnOrderBookUpdates,
  };
});

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => shared.walletStore,
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => shared.assetsStore,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => shared.settingsStore,
}));

vi.mock('@/utils/subscriptions', () => ({
  TokenBalanceSubscriptions: class {
    add = shared.balanceAdd;
    remove = shared.balanceRemove;
    resetSubscriptions = shared.balanceReset;
  },
}));

vi.mock('@/indexer/queries/orderBook/orderBooks', () => ({
  fetchOrderBooks: shared.fetchOrderBooks,
}));

vi.mock('@/indexer/queries/orderBook/orderBook', () => ({
  subscribeOnOrderBookUpdates: shared.subscribeOnOrderBookUpdates,
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');

  return createWalletMock({
    api: {
      orderBook: {
        getOrderBooks: shared.getOrderBooks,
        serializeKey: shared.serializeKey,
        getAggregatedAsks: shared.getAggregatedAsks,
        getAggregatedBids: shared.getAggregatedBids,
        subscribeOnAggregatedAsks: shared.subscribeOnAggregatedAsks,
        subscribeOnAggregatedBids: shared.subscribeOnAggregatedBids,
        getUserLimitOrdersIds: shared.getUserLimitOrdersIds,
        subscribeOnUserLimitOrdersIds: shared.subscribeOnUserLimitOrdersIds,
        getLimitOrder: shared.getLimitOrder,
        subscribeOnLimitOrder: shared.subscribeOnLimitOrder,
      },
    },
  });
});

describe('useOrderBookStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    shared.walletStore.isLoggedIn = true;
    shared.walletStore.address = '5abc';
    shared.walletStore.account = { address: '5abc' };
    shared.walletStore.whitelist = {
      'base-1': { address: 'base-1' },
      'quote-1': { address: 'quote-1' },
    };
    shared.walletStore.accountAssetsAddressTable = {};
    shared.assetsStore.assetDataByAddress.mockReset();
    shared.assetsStore.assetDataByAddress.mockImplementation((address?: string) => {
      if (address === 'base-1') {
        return { address: 'base-1', symbol: 'AAA', decimals: 18 };
      }

      if (address === 'quote-1') {
        return { address: 'quote-1', symbol: 'BBB', decimals: 18 };
      }

      return null;
    });
    shared.settingsStore.appConnection.connection.api.query.orderBook.aggregatedAsks.mockReset();
    shared.settingsStore.appConnection.connection.api.query.orderBook.aggregatedBids.mockReset();
    shared.settingsStore.appConnection.connection.api.query.orderBook.orderBooks.entries.mockReset();
    shared.settingsStore.appConnection.connection.api.isReady = Promise.resolve();
    shared.settingsStore.appConnection.connection.api.query.orderBook.orderBooks.entries.mockResolvedValue([]);
    shared.settingsStore.appConnection.connection.api.query.orderBook.aggregatedAsks.mockResolvedValue(new Map());
    shared.settingsStore.appConnection.connection.api.query.orderBook.aggregatedBids.mockResolvedValue(new Map());
    shared.asksUnsubscribe.mockClear();
    shared.bidsUnsubscribe.mockClear();
    shared.userOrdersUnsubscribe.mockClear();
    shared.pagedOrdersUnsubscribe.mockClear();
    shared.statsUnsubscribe.mockClear();
    shared.balanceAdd.mockClear();
    shared.balanceRemove.mockClear();
    shared.balanceReset.mockClear();
    shared.getOrderBooks.mockReset();
    shared.serializeKey.mockClear();
    shared.getAggregatedAsks.mockReset();
    shared.getAggregatedBids.mockReset();
    shared.subscribeOnAggregatedAsks.mockReset();
    shared.subscribeOnAggregatedBids.mockReset();
    shared.getUserLimitOrdersIds.mockReset();
    shared.subscribeOnUserLimitOrdersIds.mockReset();
    shared.getLimitOrder.mockReset();
    shared.subscribeOnLimitOrder.mockReset();
    shared.fetchOrderBooks.mockReset();
    shared.subscribeOnOrderBookUpdates.mockReset();
  });

  it('derives selected order-book data from native Pinia state', () => {
    const store = useOrderBookStore();
    const book = {
      orderBookId: { base: 'base-1', quote: 'quote-1', dexId: 7 },
      tickSize: { toString: () => '0.1' },
      stepLotSize: { toString: () => '0.001' },
      status: 'Trade',
    } as unknown as OrderBook;

    store.setOrderBooks({ 'base-1,quote-1': book });
    store.setCurrentOrderBook({ base: 'base-1', quote: 'quote-1', dexId: 7 } as any);
    store.setStats({ 'base-1,quote-1': { price: '5' } as any });
    store.setDeals([{ price: '5', amount: '2' } as any]);
    store.setBaseValue('1.23');
    store.setQuoteValue('4.56');
    store.setAmountSliderValue(25);
    store.setSide('sell' as any);
    store.setLimitOrderType(LimitOrderType.market);
    store.setBaseAssetBalance({ transferable: '100' } as any);

    expect(store.orderBookId).toBe('base-1,quote-1');
    expect(store.baseAsset).toEqual({
      address: 'base-1',
      symbol: 'AAA',
      decimals: 18,
      balance: { transferable: '100' },
    });
    expect(store.quoteAsset).toEqual({ address: 'quote-1', symbol: 'BBB', decimals: 18 });
    expect(store.currentOrderBook).toBe(book);
    expect(store.orderBookStats).toEqual({ price: '5' });
    expect(store.lastDeal).toEqual({ price: '5', amount: '2' });
    expect(store.orderBookDecimals).toBe(3);
    expect(store.baseValue).toBe('1.23');
    expect(store.quoteValue).toBe('4.56');
    expect(store.amountSliderValue).toBe(25);
    expect(store.side).toBe('sell');
    expect(store.limitOrderType).toBe(LimitOrderType.market);
  });

  it('loads whitelist-filtered books and updates the base balance subscription through Pinia', async () => {
    const store = useOrderBookStore();

    shared.getOrderBooks.mockResolvedValue({
      accepted: { orderBookId: { base: 'base-1', quote: 'quote-1', dexId: 0 }, status: 'Trade' },
      rejected: { orderBookId: { base: 'base-2', quote: 'quote-2', dexId: 0 }, status: 'Trade' },
    });

    await store.getOrderBooksInfo();
    store.setCurrentOrderBook({ base: 'base-1', quote: 'quote-1', dexId: 0 } as any);
    await store.updateBalanceSubscription();
    await store.updateBalanceSubscription(true);

    expect(store.orderBooks).toEqual({
      accepted: { orderBookId: { base: 'base-1', quote: 'quote-1', dexId: 0 }, status: 'Trade' },
    });
    expect(shared.balanceAdd).toHaveBeenCalledWith(
      'order-book-base-balance',
      expect.objectContaining({ token: expect.objectContaining({ address: 'base-1' }) })
    );
    expect(shared.balanceRemove).toHaveBeenCalledWith('order-book-base-balance');
    expect(shared.balanceReset).toHaveBeenCalledTimes(1);
  });

  it('waits for the order-book query to be ready before loading books on first route load', async () => {
    vi.useFakeTimers();

    try {
      const store = useOrderBookStore();
      const api = shared.settingsStore.appConnection.connection.api;

      shared.getOrderBooks.mockResolvedValue({
        accepted: { orderBookId: { base: 'base-1', quote: 'quote-1', dexId: 0 }, status: 'Trade' },
      });

      api.query.orderBook.orderBooks.entries = undefined as unknown as typeof api.query.orderBook.orderBooks.entries;
      api.isReady = Promise.resolve();

      const pending = store.getOrderBooksInfo();

      await Promise.resolve();
      expect(shared.getOrderBooks).not.toHaveBeenCalled();

      setTimeout(() => {
        api.query.orderBook.orderBooks.entries = vi.fn(async () => []);
      }, 50);

      await vi.advanceTimersByTimeAsync(200);
      await pending;

      expect(shared.getOrderBooks).toHaveBeenCalledTimes(1);
      expect(store.orderBooks).toEqual({
        accepted: { orderBookId: { base: 'base-1', quote: 'quote-1', dexId: 0 }, status: 'Trade' },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('syncs order-book subscriptions and user orders through the native store actions', async () => {
    const store = useOrderBookStore();

    store.setCurrentOrderBook({ base: 'base-1', quote: 'quote-1', dexId: 7 } as any);
    store.setUserLimitOrders([
      { id: 101, status: 'initial' },
      { id: 202, status: 'initial' },
    ] as any);

    shared.getAggregatedAsks.mockResolvedValue(['ask-1', 'ask-2']);
    shared.getAggregatedBids.mockResolvedValue(['bid-1', 'bid-2']);
    shared.subscribeOnAggregatedAsks.mockReturnValue({
      subscribe: (callback: (value: unknown[]) => void) => {
        callback(['ask-live']);
        return { unsubscribe: shared.asksUnsubscribe };
      },
    });
    shared.subscribeOnAggregatedBids.mockReturnValue({
      subscribe: (callback: (value: unknown[]) => void) => {
        callback(['bid-live']);
        return { unsubscribe: shared.bidsUnsubscribe };
      },
    });
    shared.fetchOrderBooks.mockResolvedValue([
      {
        id: { base: 'base-1', quote: 'quote-1', dexId: 7 },
        stats: { price: '10' },
      },
    ]);
    shared.subscribeOnOrderBookUpdates.mockImplementation(
      async (_id: string, handler: (data: Record<string, unknown>) => void) => {
        handler({
          id: { base: 'base-1', quote: 'quote-1', dexId: 7 },
          stats: { price: '11' },
          deals: [{ price: '11', amount: '1' }],
        });
        return shared.statsUnsubscribe;
      }
    );
    shared.getUserLimitOrdersIds.mockResolvedValue([101, 202]);
    shared.getLimitOrder.mockImplementation(async (_base: string, _quote: string, id: number) => {
      if (id === 101) return null;

      return {
        id,
        amount: { toString: () => '12.34' },
        originalAmount: { toString: () => '56.78' },
      };
    });
    shared.subscribeOnUserLimitOrdersIds.mockReturnValue({
      subscribe: ({ next }: { next: (ids: number[]) => Promise<void> }) => {
        void next([101, 202]);
        return { unsubscribe: shared.userOrdersUnsubscribe };
      },
    });
    shared.subscribeOnLimitOrder.mockImplementation((_base: string, _quote: string, id: number) =>
      of({ id, status: 'updated' })
    );

    await store.subscribeToBidsAndAsks();
    await store.updateOrderBooksStats();
    await store.subscribeToOrderBookStats();
    await store.subscribeToUserLimitOrders();
    await store.subscribeOnLimitOrders([101, 202]);

    expect(shared.getAggregatedAsks).toHaveBeenCalledWith('base-1', 'quote-1', 7);
    expect(shared.getAggregatedBids).toHaveBeenCalledWith('base-1', 'quote-1', 7);
    expect(store.asks).toEqual(['ask-live']);
    expect(store.bids).toEqual(['bid-live']);
    expect(store.orderBooksStats['base-1,quote-1']).toEqual({ price: '11' });
    expect(store.lastDeal).toEqual({ price: '11', amount: '1' });
    expect(store.userLimitOrders).toEqual([
      expect.objectContaining({
        id: 202,
        amountStr: '12.34',
        originalAmountStr: '56.78',
        status: 'updated',
      }),
    ]);
    expect(store.userLimitOrderUpdates).toEqual(expect.objectContaining({ unsubscribe: shared.userOrdersUnsubscribe }));
    expect(store.pagedUserLimitOrdersSubscription).toBeTruthy();

    store.unsubscribeFromBidsAndAsks();
    store.unsubscribeFromOrderBookStats();
    store.unsubscribeFromUserLimitOrders();
    store.resetPagedUserLimitOrdersSubscription();

    expect(store.asks).toEqual([]);
    expect(store.bids).toEqual([]);
    expect(store.deals).toEqual([]);
    expect(shared.asksUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.bidsUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.userOrdersUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
