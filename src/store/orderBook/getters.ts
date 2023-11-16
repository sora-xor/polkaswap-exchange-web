import { OrderBook } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/util';
import { defineGetters } from 'direct-vuex';

import type { OrderBookStats, OrderBookDealData } from '@/types/orderBook';
import { serializeKey } from '@/utils/orderBook';

import { OrderBookState } from './types';

import { orderBookGetterContext } from '.';

import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

const getters = defineGetters<OrderBookState>()({
  baseAsset(...args): Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = orderBookGetterContext(args);
    if (!state.baseAssetAddress) return null;
    return rootGetters.assets.assetDataByAddress(state.baseAssetAddress);
  },
  quoteAsset(...args): Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = orderBookGetterContext(args);
    if (!state.quoteAssetAddress) return null;
    return rootGetters.assets.assetDataByAddress(state.quoteAssetAddress);
  },
  orderBookId(...args): string {
    const { getters } = orderBookGetterContext(args);
    const { baseAsset, quoteAsset } = getters;

    if (!(baseAsset && quoteAsset)) return '';

    return serializeKey(baseAsset.address, quoteAsset.address);
  },
  currentOrderBook(...args): Nullable<OrderBook> {
    const { getters, state } = orderBookGetterContext(args);

    if (!getters.orderBookId) return null;

    return state.orderBooks[getters.orderBookId];
  },
  orderBookStats(...args): Nullable<OrderBookStats> {
    const { getters, state } = orderBookGetterContext(args);

    if (!getters.orderBookId) return null;

    return state.orderBooksStats[getters.orderBookId];
  },
  orderBookPrice(...args): FPNumber {
    const { getters } = orderBookGetterContext(args);

    return getters.orderBookStats?.price ?? FPNumber.ZERO;
  },
  orderBookPriceChange(...args): FPNumber {
    const { getters } = orderBookGetterContext(args);

    return getters.orderBookStats?.priceChange ?? FPNumber.ZERO;
  },
  orderBookVolume(...args): FPNumber {
    const { getters } = orderBookGetterContext(args);

    return getters.orderBookStats?.volume ?? FPNumber.ZERO;
  },
  orderBookLastDeal(...args): Nullable<OrderBookDealData> {
    const { state } = orderBookGetterContext(args);

    return state.deals[0] ?? null;
  },
  accountAddress(...args): string {
    const { rootState } = orderBookGetterContext(args);
    return rootState.wallet.account.address;
  },
});

export default getters;
