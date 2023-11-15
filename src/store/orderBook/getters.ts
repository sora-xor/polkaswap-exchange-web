import { FPNumber } from '@sora-substrate/util';
import { defineGetters } from 'direct-vuex';

import type { OrderBookStats } from '@/types/orderBook';
import { serializeKey } from '@/utils/orderBook';

import { assetsGetterContext } from '../assets';

import { OrderBookState } from './types';

import { orderBookGetterContext } from '.';

import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

const getters = defineGetters<OrderBookState>()({
  baseAsset(...args): Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = orderBookGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(state.baseAssetAddress);

    return token || null;
  },
  quoteAsset(...args): Nullable<RegisteredAccountAsset> {
    const { rootGetters } = assetsGetterContext(args);

    return rootGetters.assets.xor;
  },
  orderBookId(...args): string {
    const { getters } = orderBookGetterContext(args);
    const { baseAsset, quoteAsset } = getters;

    if (!(baseAsset && quoteAsset)) return '';

    return serializeKey(baseAsset.address, quoteAsset.address);
  },
  accountAddress(...args): string {
    const { rootState } = orderBookGetterContext(args);
    return rootState.wallet.account.address;
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
});

export default getters;
