import { XOR, ETH } from '@sora-substrate/util/build/assets/consts';

import type { OrderBookState } from './types';

function initialState(): OrderBookState {
  return {
    orderBooks: null,
    currentOrderBook: null,
    baseAssetAddress: ETH.address,
    quoteAssetAddress: XOR.address,
    baseValue: '',
    quoteValue: '',
  };
}

const state = initialState();

export default state;
