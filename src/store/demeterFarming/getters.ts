import { defineGetters } from 'direct-vuex';
import { FPNumber } from '@sora-substrate/math';

import { demeterFarmingGetterContext } from './index';

import type { DemeterFarmingState } from './types';

const getters = defineGetters<DemeterFarmingState>()({
  getLockedAmount(...args): (baseAsset: string, poolAsset: string, isFarm: boolean) => FPNumber {
    const { state } = demeterFarmingGetterContext(args);

    return (baseAsset: string, poolAsset: string, isFarm = true) => {
      return state.accountPools.reduce((value, accountPool) => {
        if (
          accountPool.baseAsset === baseAsset &&
          accountPool.poolAsset === poolAsset &&
          accountPool.isFarm === isFarm
        ) {
          return FPNumber.max(value, accountPool.pooledTokens) as FPNumber;
        }
        return value;
      }, FPNumber.ZERO);
    };
  },
});

export default getters;
