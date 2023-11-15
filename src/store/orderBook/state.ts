import { FPNumber } from '@sora-substrate/util';

import { LimitOrderSide, ZeroStringValue } from '@/consts';

import type { OrderBookState } from './types';

function initialState(): OrderBookState {
  return {
    orderBooks: null,
    currentOrderBook: null,
    baseAssetAddress: null,
    quoteAssetAddress: null,
    baseValue: '',
    quoteValue: '',
    orderBooksStats: {},
    deals: [],
    asks: [],
    bids: [],
    userLimitOrders: [],
    side: LimitOrderSide.Buy,
    orderBookUpdates: [],
    userLimitOrderUpdates: null,
    limitOrderConstraints: {
      tickSize: null,
      maxLotSize: null,
      minLotSize: null,
    },
    placeOrderNetworkFee: FPNumber.ZERO,
  };
}

const state = initialState();

export default state;
