import type { FPNumber } from '@sora-substrate/math';
import type { Subscription } from '@polkadot/x-rxjs';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

export type DemeterPool = {
  poolAsset: string;
  rewardAsset: string;
  multiplier: number;
  isCore: boolean;
  isFarm: boolean;
  isRemoved: boolean;
  depositFee: number;
  totalTokensInPool: FPNumber;
  rewards: FPNumber;
  rewardsToBeDistributed: FPNumber;
};

export type DemeterAccountPool = {
  isFarm: boolean;
  poolAsset: string;
  pooledTokens: FPNumber;
  rewardAsset: string;
  rewards: FPNumber;
};

export type DemeterRewardToken = {
  assetId: string;
  tokenPerBlock: FPNumber;
  farmsTotalMultiplier: number;
  stakingTotalMultiplier: number;
  farmsAllocation: FPNumber;
  stakingAllocation: FPNumber;
  teamAllocation: FPNumber;
};

export type DemeterLiquidityParams = {
  pool: DemeterPool;
  accountPool: DemeterAccountPool;
  liquidity: AccountLiquidity;
  value: number;
};

export type DemeterFarmingState = {
  pools: Array<DemeterPool>;
  tokens: Array<DemeterRewardToken>;
  accountPools: Array<any>;
  accountPoolsUpdates: Nullable<Subscription>;
};
