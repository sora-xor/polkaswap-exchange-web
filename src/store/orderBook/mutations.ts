import { defineMutations } from 'direct-vuex';

import type { LimitOrderSide } from '@/consts';

import type { OrderBookState } from './types';

function deserializeKey(key: string) {
  const [base, quote] = key.split(',');
  return { base, quote };
}

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
  setVolume(state, volume: string): void {
    state.volume = volume;
  },
  setUserLimitOrders(state, limitOrders): void {
    state.userLimitOrders = limitOrders;
  },
  resetUserLimitOrders(state): void {
    state.userLimitOrders = [];
  },
  setOrderBookUpdates(state, subscriptions): void {
    state.orderBookUpdates = subscriptions;
  },
  resetOrderBookUpdates(state): void {
    if (state.orderBookUpdates.length) {
      state.orderBookUpdates.forEach((limitOrderUpdate) => {
        limitOrderUpdate?.unsubscribe();
      });
    }

    state.orderBookUpdates = [];
  },
  setUserLimitOrderUpdates(state, subscription): void {
    state.userLimitOrderUpdates = subscription;
  },
  resetUserLimitOrderUpdates(state): void {
    state.userLimitOrderUpdates?.unsubscribe();
    state.userLimitOrderUpdates = null;
  },
});

export default mutations;
