import { XOR, ETH } from '@sora-substrate/util/build/assets/consts';

import { LimitOrderSide } from '@/consts';

import type { OrderBookState } from './types';

function initialState(): OrderBookState {
  return {
    orderBooks: null,
    currentOrderBook: null,
    baseAssetAddress: ETH.address,
    quoteAssetAddress: XOR.address,
    baseValue: '',
    quoteValue: '',
    side: LimitOrderSide.buy,
  };
}

const state = initialState();

export default state;
