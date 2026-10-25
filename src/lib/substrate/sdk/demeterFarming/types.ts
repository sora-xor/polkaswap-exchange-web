import type { FPNumber } from '@sora-substrate/math';

export type DemeterPool = {
  baseAsset: string;
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
  baseAsset: string;
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
