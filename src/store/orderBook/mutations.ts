import { defineMutations } from 'direct-vuex';

import type { LimitOrderSide } from '@/consts';

import type { OrderBookState } from './types';

const mutations = defineMutations<OrderBookState>()({
  setOrderBooks(state, orderBooks): void {
    state.orderBooks = orderBooks;
  },
  setCurrentOrderBook(state, book: any): void {
    state.currentOrderBook = book;
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
  setUserLimitOrders(state, limitOrders): void {
    state.userLimitOrders = limitOrders;
  },
  resetUserLimitOrders(state): void {
    state.userLimitOrders = [];
  },
  setOrderBookUpdates(state, subscriptions): void {
    state.limitOrderUpdates = subscriptions;
  },
  resetOrderBookUpdates(state): void {
    if (state.limitOrderUpdates.length) {
      state.limitOrderUpdates.forEach((limitOrderUpdate) => {
        limitOrderUpdate?.unsubscribe();
      });
    }

    state.limitOrderUpdates = [];
  },
  setUserLimitOrderUpdates(state, subscription): void {},
  resetUserLimitOrderUpdates(state): void {},
});

export default mutations;
