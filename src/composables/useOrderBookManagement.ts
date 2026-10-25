import { computed } from 'vue';

import { useOrderBookStore } from '@/stores/orderBook';

import type { OrderBook, OrderBookId } from '@sora-substrate/liquidity-proxy';

/**
 * Order book management powered by the transitional Pinia store.
 * Exposes helpers for fetching metadata and managing subscriptions without
 * importing the legacy Vuex module directly.
 */
export function useOrderBookManagement() {
  const orderBookStore = useOrderBookStore();

  const orderBooks = computed<Record<string, OrderBook>>(
    () => (orderBookStore.orderBooks as Record<string, OrderBook>) ?? {}
  );

  const setCurrentOrderBook = (id: OrderBookId): void => {
    orderBookStore.setCurrentOrderBook(id);
  };

  const getOrderBooksInfo = async (): Promise<void> => {
    await orderBookStore.getOrderBooksInfo();
  };

  const subscribeToOrderBookStats = async (): Promise<void> => {
    await orderBookStore.subscribeToOrderBookStats();
  };

  const unsubscribeFromOrderBookStats = async (): Promise<void> => {
    await orderBookStore.unsubscribeFromOrderBookStats();
  };

  const unsubscribeFromBidsAndAsks = async (): Promise<void> => {
    await orderBookStore.unsubscribeFromBidsAndAsks();
  };

  const updateBalanceSubscription = async (reset = false): Promise<void> => {
    await orderBookStore.updateBalanceSubscription(reset);
  };

  const updateOrderBooksStats = async (): Promise<void> => {
    await orderBookStore.updateOrderBooksStats();
  };

  return {
    orderBooks,
    setCurrentOrderBook,
    getOrderBooksInfo,
    subscribeToOrderBookStats,
    unsubscribeFromOrderBookStats,
    unsubscribeFromBidsAndAsks,
    updateBalanceSubscription,
    updateOrderBooksStats,
  };
}

export type OrderBookManagementComposable = ReturnType<typeof useOrderBookManagement>;
