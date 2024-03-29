import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { DexId } from '@sora-substrate/util/build/dex/consts';

import { LimitOrderType } from '@/consts';

import type { OrderBookState } from './types';

function initialState(): OrderBookState {
  return {
    orderBooks: {},
    dexId: DexId.XOR,
    baseAssetAddress: null,
    quoteAssetAddress: null,
    limitOrderType: LimitOrderType.limit,
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
    pagedUserLimitOrdersSubscription: null,
    ordersToBeCancelled: [],
    baseAssetBalance: null,
  };
}

const state = initialState();

export default state;
