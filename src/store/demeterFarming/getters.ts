import { defineGetters } from 'direct-vuex';
import { FPNumber } from '@sora-substrate/math';

import { demeterFarmingGetterContext } from './index';

import type {
  DemeterPool,
  DemeterAccountPool,
  DemeterRewardToken,
} from '@sora-substrate/util/build/demeterFarming/types';
import type { DemeterFarmingState } from './types';

type Pool = DemeterPool | DemeterAccountPool;

const createPoolsMap = <T extends Pool>(pools: Array<T>, isFarm = true): DataMap<T[]> => {
  return pools.reduce((buffer, pool) => {
    if (pool.isFarm !== isFarm) return buffer;

    if (!buffer[pool.poolAsset]) buffer[pool.poolAsset] = [];
    buffer[pool.poolAsset].push(pool);

    return buffer;
  }, {});
};

const getters = defineGetters<DemeterFarmingState>()({
  farmingPools(...args): DataMap<DemeterPool[]> {
    const { state } = demeterFarmingGetterContext(args);

    return createPoolsMap(state.pools, true);
  },
  stakingPools(...args): DataMap<DemeterPool[]> {
    const { state } = demeterFarmingGetterContext(args);

    return createPoolsMap(state.pools, false);
  },
  accountFarmingPools(...args): DataMap<DemeterAccountPool[]> {
    const { state } = demeterFarmingGetterContext(args);

    return createPoolsMap(state.accountPools, true);
  },
  accountStakingPools(...args): DataMap<DemeterAccountPool[]> {
    const { state } = demeterFarmingGetterContext(args);

    return createPoolsMap(state.accountPools, false);
  },
  tokenInfos(...args): DataMap<DemeterRewardToken> {
    const { state } = demeterFarmingGetterContext(args);

    return state.tokens.reduce((buffer, token) => ({ ...buffer, [token.assetId]: token }), {});
  },
  getLockedAmount(...args): (poolAsset: string, isFarm: boolean) => FPNumber {
    const { getters } = demeterFarmingGetterContext(args);

    return (poolAsset: string, isFarm = true) => {
      const pools = isFarm ? getters.accountFarmingPools : getters.accountStakingPools;

      if (!pools[poolAsset]) return FPNumber.ZERO;

      return pools[poolAsset].reduce((value, accountPool) => {
        return value.add(accountPool.pooledTokens);
      }, FPNumber.ZERO);
    };
  },
});

export default getters;
