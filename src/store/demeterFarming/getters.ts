import { defineGetters } from 'direct-vuex';
import { FPNumber } from '@sora-substrate/math';
import { XOR } from '@sora-substrate/util/build/assets/consts';

import { demeterFarmingGetterContext } from './index';

import type {
  DemeterPool,
  DemeterAccountPool,
  DemeterRewardToken,
} from '@sora-substrate/util/build/demeterFarming/types';
import type { DemeterFarmingState } from './types';

type Pool = DemeterPool | DemeterAccountPool;

const createPoolsDoubleMap = <T extends Pool>(pools: Array<T>, isFarm = true): DoubleMap<T[]> => {
  return pools.reduce((buffer, pool) => {
    if (pool.isFarm !== isFarm) return buffer;

    if (!buffer[pool.baseAsset]) buffer[pool.baseAsset] = {};
    if (!buffer[pool.baseAsset][pool.poolAsset]) buffer[pool.baseAsset][pool.poolAsset] = [];

    buffer[pool.baseAsset][pool.poolAsset].push(pool);

    return buffer;
  }, {});
};

const getters = defineGetters<DemeterFarmingState>()({
  farmingPools(...args): DoubleMap<DemeterPool[]> {
    const { state } = demeterFarmingGetterContext(args);

    return createPoolsDoubleMap(state.pools, true);
  },
  stakingPools(...args): DoubleMap<DemeterPool[]> {
    const { state } = demeterFarmingGetterContext(args);

    return createPoolsDoubleMap(state.pools, false);
  },
  accountFarmingPools(...args): DoubleMap<DemeterAccountPool[]> {
    const { state } = demeterFarmingGetterContext(args);

    return createPoolsDoubleMap(state.accountPools, true);
  },
  accountStakingPools(...args): DoubleMap<DemeterAccountPool[]> {
    const { state } = demeterFarmingGetterContext(args);

    return createPoolsDoubleMap(state.accountPools, false);
  },
  tokenInfos(...args): DataMap<DemeterRewardToken> {
    const { state } = demeterFarmingGetterContext(args);

    return state.tokens.reduce((buffer, token) => ({ ...buffer, [token.assetId]: token }), {});
  },
  getLockedAmount(...args): (baseAsset: string, poolAsset: string, isFarm: boolean) => FPNumber {
    const { getters } = demeterFarmingGetterContext(args);

    return (baseAsset: string, poolAsset: string, isFarm = true) => {
      const pools = isFarm ? getters.accountFarmingPools : getters.accountStakingPools;

      if (!Array.isArray(pools[baseAsset]?.[poolAsset])) return FPNumber.ZERO;

      return pools[baseAsset][poolAsset].reduce((value, accountPool) => {
        return FPNumber.max(value, accountPool.pooledTokens) as FPNumber;
      }, FPNumber.ZERO);
    };
  },
});

export default getters;
