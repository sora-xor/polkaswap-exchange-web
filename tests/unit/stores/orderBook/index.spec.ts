import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrderBook, OrderBookId } from '@sora-substrate/liquidity-proxy';

const legacyStoreStub = {
  state: {
    orderBook: {
      orderBooks: {
        foo: { orderBookId: { base: 'a', quote: 'b', dexId: 0 } },
      } as Record<string, OrderBook>,
    },
  },
  getters: {
    orderBook: {
      orderBookId: 'book-1',
      baseAsset: { symbol: 'AAA' },
      quoteAsset: { symbol: 'BBB' },
      currentOrderBook: { orderBookId: { base: 'a', quote: 'b', dexId: 0 } },
      orderBookStats: { spread: '1' },
      orderBookLastDeal: { price: '1', amount: '2' },
    },
  },
  dispatch: {
    orderBook: {
      getOrderBooksInfo: vi.fn(),
    },
  },
  commit: {
    orderBook: {
      setCurrentOrderBook: vi.fn(),
    },
  },
};

vi.mock('@/store', () => ({}));

vi.mock('@/utils/app-store', () => ({
  requireAppStore: () => legacyStoreStub,
}));

describe('useOrderBookStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    legacyStoreStub.dispatch.orderBook.getOrderBooksInfo.mockClear();
    legacyStoreStub.commit.orderBook.setCurrentOrderBook.mockClear();
  });

  it('exposes getters backed by the legacy module', async () => {
    const { useOrderBookStore } = await import('@/stores/orderBook');
    const store = useOrderBookStore();

    expect(store.orderBooks).toEqual(legacyStoreStub.state.orderBook.orderBooks);
    expect(store.orderBookId).toBe('book-1');
    expect(store.baseAsset).toEqual({ symbol: 'AAA' });
    expect(store.quoteAsset).toEqual({ symbol: 'BBB' });
    expect(store.currentOrderBook).toEqual(legacyStoreStub.getters.orderBook.currentOrderBook as OrderBook);
    expect(store.orderBookStats).toEqual({ spread: '1' });
    expect(store.lastDeal).toEqual({ price: '1', amount: '2' });
  });

  it('forwards actions and mutations to the legacy module', async () => {
    const { useOrderBookStore } = await import('@/stores/orderBook');
    const store = useOrderBookStore();

    await store.getOrderBooksInfo();
    expect(legacyStoreStub.dispatch.orderBook.getOrderBooksInfo).toHaveBeenCalledTimes(1);

    store.setCurrentOrderBook({ base: 'x', quote: 'y', dexId: 0 } as OrderBookId);
    expect(legacyStoreStub.commit.orderBook.setCurrentOrderBook).toHaveBeenCalledWith({
      base: 'x',
      quote: 'y',
      dexId: 0,
    });
  });
});
