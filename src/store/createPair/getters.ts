import { defineGetters } from 'direct-vuex';
import type { CodecString } from '@sora-substrate/util';

import { createPairGetterContext } from '@/store/createPair';
import { ZeroStringValue } from '@/consts';
import type { CreatePairState } from './types';
import type { RegisteredAccountAssetWithDecimals } from '../assets/types';

const getters = defineGetters<CreatePairState>()({
  firstToken(...args): Nullable<RegisteredAccountAssetWithDecimals> {
    const { state, rootGetters } = createPairGetterContext(args);
    return rootGetters.assets.assetDataByAddress(state.firstTokenAddress);
  },
  secondToken(...args): Nullable<RegisteredAccountAssetWithDecimals> {
    const { state, rootGetters } = createPairGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(state.secondTokenAddress);
    const balance = state.secondTokenBalance;
    if (balance) {
      return { ...token, balance } as RegisteredAccountAssetWithDecimals;
    }
    return token;
  },
  minted(...args): CodecString {
    const { state } = createPairGetterContext(args);
    return state.minted || ZeroStringValue;
  },
});

export default getters;
