import { defineGetters } from 'direct-vuex';

import { demeterFarmingGetterContext } from './index';

import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';
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
});

export default getters;
