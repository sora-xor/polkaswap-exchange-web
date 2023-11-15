import { defineMutations } from 'direct-vuex';

import type { LimitOrderSide } from '@/consts';
import type { OrderBookDealData, OrderBookStats } from '@/types/orderBook';
import { deserializeKey } from '@/utils/orderBook';

import type { OrderBookState } from './types';
import type { Subscription } from 'rxjs';

const mutations = defineMutations<OrderBookState>()({
  setOrderBooks(state, orderBooks): void {
    state.orderBooks = orderBooks;
  },
  setCurrentOrderBook(state, orderBookId: string): void {
    const { base } = deserializeKey(orderBookId);
    state.currentOrderBook = { [orderBookId]: state.orderBooks[orderBookId] };
    state.baseAssetAddress = base;
  },
  setBaseAssetAddress(state, address: string): void {
    state.baseAssetAddress = address;
  },
  setBaseValue(state, value: string): void {
    state.baseValue = value;
  },
  setQuoteValue(state, value: string): void {
    state.quoteValue = value;
  },
  setSide(state, side: LimitOrderSide): void {
    state.side = side;
  },
  setAsks(state, asks): void {
    state.asks = asks;
  },
  resetAsks(state): void {
    state.asks = [];
  },
  setBids(state, bids): void {
    state.bids = bids;
  },
  resetBids(state): void {
    state.bids = [];
  },
  setDeals(state, deals: OrderBookDealData[]): void {
    state.deals = Object.freeze([...deals]);
  },
  setStats(state, stats: Record<string, OrderBookStats>): void {
    state.orderBooksStats = { ...state.orderBooksStats, ...stats };
  },
  setUserLimitOrders(state, limitOrders): void {
    state.userLimitOrders = limitOrders;
  },
  resetUserLimitOrders(state): void {
    state.userLimitOrders = [];
  },
  setOrderBookUpdates(state, subscriptions: Array<Subscription | VoidFunction>): void {
    state.orderBookUpdates = subscriptions;
  },
  resetOrderBookUpdates(state): void {
    if (state.orderBookUpdates.length) {
      state.orderBookUpdates.forEach((subscription) => {
        if (typeof subscription === 'function') {
          subscription?.();
        } else {
          subscription?.unsubscribe();
        }
      });
    }

    state.orderBookUpdates = [];
  },
  setUserLimitOrderUpdates(state, subscription: Subscription): void {
    state.userLimitOrderUpdates = subscription;
  },
  resetUserLimitOrderUpdates(state): void {
    state.userLimitOrderUpdates?.unsubscribe();
    state.userLimitOrderUpdates = null;
  },
  setPlaceOrderNetworkFee(state, networkFee): void {
    state.placeOrderNetworkFee = networkFee;
  },
});

export default mutations;
