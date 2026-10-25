import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrderBook, OrderBookId } from '@sora-substrate/liquidity-proxy';
import type { OrderBookStats } from '@/types/orderBook';

const storeMocks = vi.hoisted(() => ({
  orderBooks: {
    'order-book-1': { orderBookId: { base: 'base', quote: 'quote', dexId: 0 } } as unknown as OrderBook,
  } as Record<string, OrderBook>,
  orderBooksStats: {
    'order-book-1': {} as unknown as OrderBookStats,
  } as Record<string, OrderBookStats>,
  setCurrentOrderBook: vi.fn<(id: OrderBookId) => void>(),
}));

vi.mock('@/stores/orderBook', () => ({
  useOrderBookStore: () => ({
    orderBooks: storeMocks.orderBooks,
    orderBooksStats: storeMocks.orderBooksStats,
    setCurrentOrderBook: (id: OrderBookId) => storeMocks.setCurrentOrderBook(id),
  }),
}));

describe('useOrderBookPairList', () => {
  beforeEach(() => {
    storeMocks.setCurrentOrderBook.mockClear();
  });

  it('exposes order book metadata from the store', async () => {
    const { useOrderBookPairList } = await import('@/composables/useOrderBookPairList');
    const { orderBooks, orderBooksStats } = useOrderBookPairList();

    expect(orderBooks.value).toBe(storeMocks.orderBooks);
    expect(orderBooksStats.value).toBe(storeMocks.orderBooksStats);
  });

  it('selects an order book via the store commit helper', async () => {
    const { useOrderBookPairList } = await import('@/composables/useOrderBookPairList');
    const { selectOrderBook } = useOrderBookPairList();
    const id = { base: 'base', quote: 'quote', dexId: 0 } as unknown as OrderBookId;

    selectOrderBook(id);

    expect(storeMocks.setCurrentOrderBook).toHaveBeenCalledTimes(1);
    expect(storeMocks.setCurrentOrderBook).toHaveBeenCalledWith(id);
  });
});
