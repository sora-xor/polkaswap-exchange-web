import { defineMutations } from 'direct-vuex';

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
});

export default mutations;
