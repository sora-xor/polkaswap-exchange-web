import type { FPNumber } from '@/lib/substrate/math';
import type { DemeterAccountPool, DemeterPool, DemeterRewardToken } from '@/lib/substrate/sdk/demeterFarming/types';
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
