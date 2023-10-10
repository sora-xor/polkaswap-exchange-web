import { XOR, ETH } from '@sora-substrate/util/build/assets/consts';

import { LimitOrderSide } from '@/consts';

import type { OrderBookState } from './types';

function initialState(): OrderBookState {
  return {
    orderBooks: null,
    currentOrderBook: null,
    baseAssetAddress: null,
    quoteAssetAddress: null,
    baseValue: '',
    quoteValue: '',
    asks: [],
    bids: [],
    userLimitOrders: [],
    side: LimitOrderSide.Buy,
    orderBookUpdates: [],
    userLimitOrderUpdates: null,
  };
}

const state = initialState();

export default state;
