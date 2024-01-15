import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { DexId } from '@sora-substrate/util/build/dex/consts';

import type { OrderBookState } from './types';

function initialState(): OrderBookState {
  return {
    orderBooks: {},
    dexId: DexId.XOR,
    baseAssetAddress: null,
    quoteAssetAddress: null,
    baseValue: '',
    quoteValue: '',
    orderBooksStats: {},
    deals: [],
    asks: [],
    bids: [],
    userLimitOrders: [],
    side: PriceVariant.Buy,
    orderBookUpdates: [],
    orderBookStatsUpdates: null,
    userLimitOrderUpdates: null,
    ordersToBeCancelled: [],
    amountSliderValue: 0,
  };
}

const state = initialState();

export default state;
