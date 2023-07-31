import { defineGetters } from 'direct-vuex';

import { assetsGetterContext } from '../assets';

import { OrderBookState } from './types';

import { orderBookGetterContext } from '.';

import type { RegisteredAccountAsset } from '@sora-substrate/util';

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
});

export default getters;
