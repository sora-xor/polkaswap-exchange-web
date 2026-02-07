import { computed } from 'vue';
import { OrderBookStatus } from '@sora-substrate/liquidity-proxy';

import { useOrderBookStore } from '@/stores/orderBook';
import { useSettingsStore } from '@/stores/settings';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';
import type { Nullable } from '@/types/common';

/**
 * Thin wrapper around the transitional Pinia order book store for user-specific order data.
 * Consolidates the remaining legacy store access so components can rely on a stable API.
 */
export function useOrderBookUserOrders() {
  const orderBookStore = useOrderBookStore();
  const settingsStore = useSettingsStore();

  const userLimitOrders = computed<LimitOrder[]>(() => (orderBookStore.userLimitOrders as LimitOrder[]) ?? []);
  const ordersToBeCancelled = computed<LimitOrder[]>(() => (orderBookStore.ordersToBeCancelled as LimitOrder[]) ?? []);
  const currentOrderBook = computed<Nullable<OrderBook>>(
    () => (orderBookStore.currentOrderBook as Nullable<OrderBook>) ?? null
  );

  const nodeIsConnected = computed<boolean>(() => settingsStore.nodeIsConnected);
  const isBookStopped = computed<boolean>(
    () => !currentOrderBook.value || currentOrderBook.value.status === OrderBookStatus.Stop
  );

  const subscribeToUserLimitOrders = async (): Promise<void> => {
    await orderBookStore.subscribeToUserLimitOrders();
  };

  const unsubscribeFromUserLimitOrders = async (): Promise<void> => {
    await orderBookStore.unsubscribeFromUserLimitOrders();
  };

  const subscribeOnLimitOrders = async (ids: Array<number | string>): Promise<void> => {
    await orderBookStore.subscribeOnLimitOrders(ids);
  };

  const resetPagedUserLimitOrdersSubscription = (): void => {
    orderBookStore.resetPagedUserLimitOrdersSubscription();
  };

  const setOrdersToBeCancelled = (orders: LimitOrder[]): void => {
    orderBookStore.setOrdersToBeCancelled(orders);
  };

  return {
    userLimitOrders,
    ordersToBeCancelled,
    currentOrderBook,
    nodeIsConnected,
    isBookStopped,
    subscribeToUserLimitOrders,
    unsubscribeFromUserLimitOrders,
    subscribeOnLimitOrders,
    resetPagedUserLimitOrdersSubscription,
    setOrdersToBeCancelled,
  };
}

export type OrderBookUserOrdersComposable = ReturnType<typeof useOrderBookUserOrders>;
