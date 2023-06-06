import { FPNumber } from '@sora-substrate/math';
import { defineGetters } from 'direct-vuex';

import { poolGetterContext } from './index';

import type { PoolState } from './types';

const getters = defineGetters<PoolState>()({
  getLockedAmount(...args): (baseAsset: string, poolAsset: string) => FPNumber {
    const { state } = poolGetterContext(args);

    return (baseAsset: string, poolAsset: string) => {
      return state.accountLockedLiquidity.reduce((value, accountLockedPool) => {
        if (accountLockedPool.assetA === baseAsset && accountLockedPool.assetB === poolAsset) {
          return value.add(accountLockedPool.poolTokens);
        }
        return value;
      }, FPNumber.ZERO);
    };
  },
});

export default getters;
