import { defineGetters } from 'direct-vuex';

import { KusdAddress } from '@/modules/vault/consts';
import { vaultGetterContext } from '@/store/vault';

import type { VaultState } from './types';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

const getters = defineGetters<VaultState>()({
  kusdToken(...args): Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = vaultGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(KusdAddress);
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
});

export default getters;
