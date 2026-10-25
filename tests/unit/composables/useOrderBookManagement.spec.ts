import { reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrderBook, OrderBookId } from '@sora-substrate/liquidity-proxy';

const orderBookStoreStub = (() => {
  const orderBook = {
    orderBookId: { base: 'base', quote: 'quote', dexId: 0 },
    status: 'Trade',
  } as unknown as OrderBook;

  return {
    orderBooks: reactive({
      'book-1': orderBook,
    }),
    setCurrentOrderBook: vi.fn(),
    getOrderBooksInfo: vi.fn(async () => undefined),
    subscribeToOrderBookStats: vi.fn(async () => undefined),
    unsubscribeFromOrderBookStats: vi.fn(async () => undefined),
    subscribeToBidsAndAsks: vi.fn(async () => undefined),
    unsubscribeFromBidsAndAsks: vi.fn(async () => undefined),
    updateBalanceSubscription: vi.fn(async () => undefined),
    updateOrderBooksStats: vi.fn(async () => undefined),
  };
})();

vi.mock('@/stores/orderBook', () => ({
  useOrderBookStore: () => orderBookStoreStub,
}));

describe('useOrderBookManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('exposes reactive order book maps and forwards actions', async () => {
    const module = await import('@/composables/useOrderBookManagement');
    const composable = module.useOrderBookManagement();

    expect(composable.orderBooks.value).toEqual(orderBookStoreStub.orderBooks);

    composable.setCurrentOrderBook({ base: 'a', quote: 'b', dexId: 1 } as OrderBookId);
    expect(orderBookStoreStub.setCurrentOrderBook).toHaveBeenCalled();

    await composable.getOrderBooksInfo();
    expect(orderBookStoreStub.getOrderBooksInfo).toHaveBeenCalled();

    await composable.subscribeToOrderBookStats();
    expect(orderBookStoreStub.subscribeToOrderBookStats).toHaveBeenCalled();

    await composable.unsubscribeFromOrderBookStats();
    expect(orderBookStoreStub.unsubscribeFromOrderBookStats).toHaveBeenCalled();

    await composable.unsubscribeFromBidsAndAsks();
    expect(orderBookStoreStub.unsubscribeFromBidsAndAsks).toHaveBeenCalled();

    await composable.updateBalanceSubscription(true);
    expect(orderBookStoreStub.updateBalanceSubscription).toHaveBeenCalledWith(true);

    await composable.updateOrderBooksStats();
    expect(orderBookStoreStub.updateOrderBooksStats).toHaveBeenCalled();
  });
});
