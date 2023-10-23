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
    volume: '',
    userLimitOrders: [],
    side: LimitOrderSide.Buy,
    orderBookUpdates: [],
    userLimitOrderUpdates: null,
    limitOrderConstraints: {
      tickSize: null,
      maxLotSize: null,
      minLotSize: null,
    },
  };
}

const state = initialState();

export default state;
