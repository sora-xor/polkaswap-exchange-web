import type { Subscription } from '@polkadot/x-rxjs';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type {
  DemeterPool,
  DemeterAccountPool,
  DemeterRewardToken,
} from '@sora-substrate/util/build/demeterFarming/types';

export type DemeterLiquidityParams = {
  pool: DemeterPool;
  accountPool: DemeterAccountPool;
  liquidity: AccountLiquidity;
  value: number;
};

export type DemeterFarmingState = {
  pools: Array<DemeterPool>;
  poolsUpdates: Nullable<Subscription>;
  tokens: Array<DemeterRewardToken>;
  tokensUpdates: Nullable<Subscription>;
  accountPools: Array<DemeterAccountPool>;
  accountPoolsUpdates: Nullable<Subscription>;
};
