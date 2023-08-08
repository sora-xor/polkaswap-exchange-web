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
});

export default mutations;
