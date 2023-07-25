import type { FPNumber } from '@sora-substrate/math';
import type { Subscription } from 'rxjs';

// TODO: move to @sora-substrate/util
export declare type StakingPool = {
  baseAsset: string;
  poolAsset: string;
  rewardAsset: string;
  // multiplier: number;
  // depositFee: number;
  // totalTokensInPool: FPNumber;
  // rewards: FPNumber;
  // rewardsToBeDistributed: FPNumber;
};

export declare type StakingAccountPool = {
  isFarm: boolean;
  baseAsset: string;
  poolAsset: string;
  pooledTokens: FPNumber;
  rewardAsset: string;
  rewards: FPNumber;
};

export declare type StakingRewardToken = {
  assetId: string;
  tokenPerBlock: FPNumber;
  farmsTotalMultiplier: number;
  stakingTotalMultiplier: number;
  farmsAllocation: FPNumber;
  stakingAllocation: FPNumber;
  teamAllocation: FPNumber;
};

// export type StakingParams = {
//   pool: StakingPool;
//   accountPool: StakingAccountPool;
//   value: FPNumber;
// };

export type StakingState = {
  pools: readonly StakingPool[];
  // tokens: readonly StakingRewardToken[];
  // tokensUpdates: Nullable<Subscription>;
  accountPools: readonly StakingAccountPool[];
};
