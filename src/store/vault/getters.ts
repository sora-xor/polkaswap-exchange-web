import { KUSD } from '@sora-substrate/util/build/assets/consts';
import { defineGetters } from 'direct-vuex';

import { vaultGetterContext } from '@/store/vault';

import type { VaultState } from './types';
import type { FPNumber } from '@sora-substrate/math';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

const getters = defineGetters<VaultState>()({
  kusdToken(...args): Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = vaultGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(KUSD.address);
    const balance = state.kusdTokenBalance;
    if (balance) {
      return { ...token, balance } as RegisteredAccountAsset;
    }
    return token;
  },
  collateralToken(...args): Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = vaultGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(state.collateralAddress);
    const balance = state.collateralTokenBalance;
    if (balance) {
      return { ...token, balance } as RegisteredAccountAsset;
    }
    return token;
  },
  averageCollateralPrice(...args): Nullable<FPNumber> {
    const { state } = vaultGetterContext(args);
    const { averageCollateralPrices, collateralAddress } = state;
    return averageCollateralPrices[collateralAddress];
  },
});

export default getters;
