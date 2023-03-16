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
  pools: readonly DemeterPool[];
  poolsUpdates: Nullable<Subscription>;
  tokens: readonly DemeterRewardToken[];
  tokensUpdates: Nullable<Subscription>;
  accountPools: readonly DemeterAccountPool[];
  accountPoolsUpdates: Nullable<Subscription>;
};
