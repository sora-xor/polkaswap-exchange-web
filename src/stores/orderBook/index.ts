import { defineStore } from 'pinia';

import '@/store';

import { PriceVariant } from '@sora-substrate/liquidity-proxy';

import type {
  OrderBook,
  OrderBookDealData,
  OrderBookId,
  OrderBookPriceVolume,
  OrderBookStats,
} from '@sora-substrate/liquidity-proxy';
import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';
import type { Subscription } from 'rxjs';

import { LimitOrderType } from '@/consts';
import { requireLegacyStore, type LegacyStore } from '@/utils/legacy-store';
import type { OrderBookState } from '@/store/orderBook/types';
import type { Nullable } from '@/types/common';

type LegacyOrderBookGetters = Record<string, unknown>;

const WARN_PREFIX = '[orderBookStore]';
let warnedMissingModule = false;

const getLegacyStore = (): LegacyStore | null => {
  const legacyStore = requireLegacyStore();
  if (!legacyStore?.state?.orderBook) {
    if (!warnedMissingModule) {
      console.warn(`${WARN_PREFIX} Legacy order book module is not ready yet.`);
      warnedMissingModule = true;
    }
    return null;
  }

  warnedMissingModule = false;
  return legacyStore;
};

const readOrderBookState = (): OrderBookState | null => {
  const legacyStore = getLegacyStore();
  if (!legacyStore) return null;

  const state = legacyStore.state?.orderBook as OrderBookState | undefined;
  if (!state) {
    console.warn(`${WARN_PREFIX} Legacy order book state is unavailable.`);
    return null;
  }

  return state;
};

const readOrderBookGetters = (): LegacyOrderBookGetters | null => {
  const legacyStore = getLegacyStore();
  if (!legacyStore) return null;

  const getters = legacyStore.getters?.orderBook as LegacyOrderBookGetters | undefined;
  if (!getters) {
    console.warn(`${WARN_PREFIX} Legacy order book getters are unavailable.`);
    return null;
  }

  return getters;
};

const accessState = <T>(selector: (state: OrderBookState) => T, fallback: T): T => {
  const state = readOrderBookState();
  if (!state) return fallback;

  try {
    return selector(state);
  } catch (error) {
    console.warn(`${WARN_PREFIX} Failed to access legacy state.`, error);
    return fallback;
  }
};

const accessGetter = <T>(selector: (getters: LegacyOrderBookGetters) => T, fallback: T): T => {
  const getters = readOrderBookGetters();
  if (!getters) return fallback;

  try {
    return selector(getters);
  } catch (error) {
    console.warn(`${WARN_PREFIX} Failed to access legacy getters.`, error);
    return fallback;
  }
};

const callLegacyMethod = (kind: 'dispatch' | 'commit', method: string, args: unknown[] = []): unknown => {
  const legacyStore = getLegacyStore();
  if (!legacyStore) return undefined;

  const container = legacyStore[kind]?.orderBook as Record<string, unknown> | undefined;
  const handler = container?.[method];

  if (typeof handler !== 'function') {
    console.warn(`${WARN_PREFIX} Legacy ${kind}.orderBook.${method} is not available.`);
    return undefined;
  }

  return handler(...args);
};

/**
 * Transitional Pinia facade for the legacy order book Vuex module.
 * Provides a Pinia `$id` for telemetry and a thin compatibility layer
 * so callers can begin depending on Pinia APIs before the module is
 * fully migrated away from Vuex.
 */
export const useOrderBookStore = defineStore('orderBook', {
  state: () => ({}) as Record<string, never>,
  getters: {
    orderBooks: () => accessState((state) => state.orderBooks, {} as Record<string, OrderBook>),
    orderBookId: () => accessGetter((getters) => (getters.orderBookId as string) ?? '', ''),
    dexId: () => accessState((state) => state.dexId, null),
    baseAsset: () =>
      accessGetter(
        (getters) => (getters.baseAsset as Nullable<RegisteredAccountAsset>) ?? null,
        null as Nullable<RegisteredAccountAsset>
      ),
    quoteAsset: () =>
      accessGetter(
        (getters) => (getters.quoteAsset as Nullable<RegisteredAccountAsset>) ?? null,
        null as Nullable<RegisteredAccountAsset>
      ),
    currentOrderBook: () =>
      accessGetter((getters) => (getters.currentOrderBook as Nullable<OrderBook>) ?? null, null as Nullable<OrderBook>),
    orderBookStats: () =>
      accessGetter(
        (getters) => (getters.orderBookStats as Nullable<OrderBookStats>) ?? null,
        null as Nullable<OrderBookStats>
      ),
    lastDeal: () =>
      accessGetter(
        (getters) => (getters.orderBookLastDeal as Nullable<OrderBookDealData>) ?? null,
        null as Nullable<OrderBookDealData>
      ),
    deals: () => accessState((state) => state.deals, []),
    asks: () => accessState((state) => state.asks, []),
    bids: () => accessState((state) => state.bids, []),
    limitOrderType: () =>
      accessState((state) => (state.limitOrderType as LimitOrderType) ?? LimitOrderType.limit, LimitOrderType.limit),
    baseValue: () => accessState((state) => state.baseValue, ''),
    quoteValue: () => accessState((state) => state.quoteValue, ''),
    amountSliderValue: () => accessState((state) => state.amountSliderValue, 0),
    side: () => accessState((state) => state.side, PriceVariant.Buy),
    baseAssetAddress: () => accessState((state) => state.baseAssetAddress, null),
    quoteAssetAddress: () => accessState((state) => state.quoteAssetAddress, null),
    baseAssetBalance: () => accessState((state) => state.baseAssetBalance, null),
    orderBooksStats: () => accessState((state) => state.orderBooksStats, {} as Record<string, OrderBookStats>),
    userLimitOrders: () => accessState((state) => state.userLimitOrders as LimitOrder[], []),
    ordersToBeCancelled: () => accessState((state) => state.ordersToBeCancelled as LimitOrder[], []),
    orderBookUpdates: () => accessState((state) => state.orderBookUpdates as Array<Subscription>, []),
    orderBookStatsUpdates: () => accessState((state) => state.orderBookStatsUpdates as Nullable<VoidFunction>, null),
    userLimitOrderUpdates: () => accessState((state) => state.userLimitOrderUpdates as Nullable<Subscription>, null),
    pagedUserLimitOrdersSubscription: () =>
      accessState((state) => state.pagedUserLimitOrdersSubscription as Nullable<Subscription>, null),
  },
  actions: {
    async getOrderBooksInfo(): Promise<void> {
      await callLegacyMethod('dispatch', 'getOrderBooksInfo');
    },
    async subscribeToOrderBookStats(): Promise<void> {
      await callLegacyMethod('dispatch', 'subscribeToOrderBookStats');
    },
    async unsubscribeFromOrderBookStats(): Promise<void> {
      await callLegacyMethod('dispatch', 'unsubscribeFromOrderBookStats');
    },
    async subscribeToBidsAndAsks(): Promise<void> {
      await callLegacyMethod('dispatch', 'subscribeToBidsAndAsks');
    },
    async unsubscribeFromBidsAndAsks(): Promise<void> {
      await callLegacyMethod('dispatch', 'unsubscribeFromBidsAndAsks');
    },
    async updateBalanceSubscription(reset = false): Promise<void> {
      await callLegacyMethod('dispatch', 'updateBalanceSubscription', [reset]);
    },
    async updateOrderBooksStats(): Promise<void> {
      await callLegacyMethod('dispatch', 'updateOrderBooksStats');
    },
    async subscribeToUserLimitOrders(): Promise<void> {
      await callLegacyMethod('dispatch', 'subscribeToUserLimitOrders');
    },
    async unsubscribeFromUserLimitOrders(): Promise<void> {
      await callLegacyMethod('dispatch', 'unsubscribeFromUserLimitOrders');
    },
    async subscribeOnLimitOrders(ids: Array<number | string>): Promise<void> {
      await callLegacyMethod('dispatch', 'subscribeOnLimitOrders', [ids]);
    },
    setCurrentOrderBook(orderBookId: OrderBookId): void {
      callLegacyMethod('commit', 'setCurrentOrderBook', [orderBookId]);
    },
    setBaseValue(value: string): void {
      callLegacyMethod('commit', 'setBaseValue', [value]);
    },
    setQuoteValue(value: string): void {
      callLegacyMethod('commit', 'setQuoteValue', [value]);
    },
    setAmountSliderValue(value: number): void {
      callLegacyMethod('commit', 'setAmountSliderValue', [value]);
    },
    setLimitOrderType(value: LimitOrderType): void {
      callLegacyMethod('commit', 'setLimitOrderType', [value]);
    },
    setSide(value: PriceVariant): void {
      callLegacyMethod('commit', 'setSide', [value]);
    },
    setOrdersToBeCancelled(orders: LimitOrder[]): void {
      callLegacyMethod('commit', 'setOrdersToBeCancelled', [orders]);
    },
    resetPagedUserLimitOrdersSubscription(): void {
      callLegacyMethod('commit', 'resetPagedUserLimitOrdersSubscription');
    },
  },
});
