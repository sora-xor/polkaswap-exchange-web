import { computed } from 'vue';

import { useOrderBookStore } from '@/stores/orderBook';
import type { OrderBookStats } from '@/types/orderBook';

import type { OrderBook, OrderBookId } from '@sora-substrate/liquidity-proxy';

/**
 * Exposes reactive order-book metadata used across the pair list popover.
 * Consumers can render the whitelist table and trigger order book selection without
 * coupling directly to the Vuex store.
 */
export function useOrderBookPairList() {
  const orderBookStore = useOrderBookStore();

  const orderBooks = computed<Record<string, OrderBook>>(
    () => (orderBookStore.orderBooks as Record<string, OrderBook>) ?? {}
  );

  const orderBooksStats = computed<Record<string, OrderBookStats>>(
    () => (orderBookStore.orderBooksStats as Record<string, OrderBookStats>) ?? {}
  );

  const selectOrderBook = (id: OrderBookId): void => {
    orderBookStore.setCurrentOrderBook(id);
  };

  return {
    orderBooks,
    orderBooksStats,
    selectOrderBook,
  };
}
