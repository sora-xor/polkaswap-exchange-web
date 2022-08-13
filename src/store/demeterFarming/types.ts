import type { Subscription } from 'rxjs';
import type { FPNumber } from '@sora-substrate/math';
import type {
  DemeterPool,
  DemeterAccountPool,
  DemeterRewardToken,
} from '@sora-substrate/util/build/demeterFarming/types';

export type DemeterLiquidityParams = {
  pool: DemeterPool;
  accountPool: DemeterAccountPool;
  value: FPNumber;
};

export type DemeterFarmingState = {
  pools: Array<DemeterPool>;
  poolsUpdates: Nullable<Subscription>;
  tokens: Array<DemeterRewardToken>;
  tokensUpdates: Nullable<Subscription>;
  accountPools: Array<DemeterAccountPool>;
  accountPoolsUpdates: Nullable<Subscription>;
};
