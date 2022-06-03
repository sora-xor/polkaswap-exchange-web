import { defineGetters } from 'direct-vuex';

import { demeterFarmingGetterContext } from './index';

import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';
import type { DemeterFarmingState } from './types';

const createPoolsMap = (pools: DemeterPool[], isFarm = true): DataMap<DemeterPool[]> => {
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
  accountFarmingPools(...args): Array<DemeterAccountPool> {
    const { state } = demeterFarmingGetterContext(args);

    return state.accountPools.filter((pool) => !!pool.isFarm);
  },
  accountStakingPools(...args): Array<DemeterAccountPool> {
    const { state } = demeterFarmingGetterContext(args);

    return state.accountPools.filter((pool) => !pool.isFarm);
  },
});

export default getters;
