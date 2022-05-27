import type { FPNumber, CodecString } from '@sora-substrate/math';
import type { Subscription } from '@polkadot/x-rxjs';

export type DemeterPool = {
  [key: string]: any;
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

export type DemeterFarmingState = {
  pools: Array<DemeterPool>;
  tokens: Array<DemeterRewardToken>;
  accountPools: Array<any>;
  accountPoolsUpdates: Nullable<Subscription>;
};
