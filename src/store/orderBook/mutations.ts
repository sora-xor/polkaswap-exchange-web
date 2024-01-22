import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { defineMutations } from 'direct-vuex';

import type { OrderBookDealData, OrderBookStats } from '@/types/orderBook';

import type { OrderBookState } from './types';
import type { OrderBookId, OrderBookPriceVolume, OrderBook } from '@sora-substrate/liquidity-proxy';
import type { LimitOrder } from '@sora-substrate/util/build/orderBook/types';
import type { Subscription } from 'rxjs';

const mutations = defineMutations<OrderBookState>()({
  setOrderBooks(state, orderBooks: Record<string, OrderBook>): void {
    state.orderBooks = orderBooks;
  },
  setCurrentOrderBook(state, { dexId, base, quote }: OrderBookId): void {
    state.dexId = dexId;
    state.baseAssetAddress = base;
    state.quoteAssetAddress = quote;
  },
  setBaseValue(state, value: string): void {
    state.baseValue = value;
  },
  setQuoteValue(state, value: string): void {
    state.quoteValue = value;
  },
  setSide(state, side: PriceVariant): void {
    state.side = side;
  },
  setAsks(state, asks: readonly OrderBookPriceVolume[] = []): void {
    state.asks = Object.freeze([...asks]);
  },
  setBids(state, bids: readonly OrderBookPriceVolume[] = []): void {
    state.bids = Object.freeze([...bids]);
  },
  setDeals(state, deals: readonly OrderBookDealData[] = []): void {
    state.deals = Object.freeze([...deals]);
  },
  setStats(state, stats: Record<string, OrderBookStats>): void {
    state.orderBooksStats = Object.freeze({ ...state.orderBooksStats, ...stats });
  },
  setUserLimitOrders(state, limitOrders: LimitOrder[] = []): void {
    state.userLimitOrders = Object.freeze([...limitOrders]);
  },
  setOrderBookUpdates(state, subscriptions: Array<Subscription>): void {
    state.orderBookUpdates = subscriptions;
  },
  resetOrderBookUpdates(state): void {
    state.orderBookUpdates?.forEach((subscription) => subscription?.unsubscribe());
    state.orderBookUpdates = [];
  },
  setOrderBookStatsUpdates(state, subscription: VoidFunction): void {
    state.orderBookStatsUpdates = subscription;
  },
  resetOrderBookStatsUpdates(state): void {
    state.orderBookStatsUpdates?.();
    state.orderBookStatsUpdates = null;
  },
  setUserLimitOrderUpdates(state, subscription: Subscription): void {
    state.userLimitOrderUpdates = subscription;
  },
  resetUserLimitOrderUpdates(state): void {
    state.userLimitOrderUpdates?.unsubscribe();
    state.userLimitOrderUpdates = null;
  },
  setOrdersToBeCancelled(state, orders): void {
    state.ordersToBeCancelled = orders;
  },
  setAmountSliderValue(state, percent: number) {
    state.amountSliderValue = percent;
  },
});

export default mutations;
