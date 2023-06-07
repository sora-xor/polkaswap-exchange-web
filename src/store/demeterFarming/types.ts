import type { FPNumber } from '@sora-substrate/math';
import type {
  DemeterPool,
  DemeterAccountPool,
  DemeterRewardToken,
} from '@sora-substrate/util/build/demeterFarming/types';
import type { Subscription } from 'rxjs';

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
