import { defineGetters } from 'direct-vuex';

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
  accountAddress(...args): string {
    const { rootState } = orderBookGetterContext(args);
    return rootState.wallet.account.address;
  },

  // currentPrice(...args): string {},
  // currentVolume(...args): string {},
  // currenDailyChange(...args): string {},
});

export default getters;
