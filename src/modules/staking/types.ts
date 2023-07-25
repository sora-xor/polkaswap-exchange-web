import { StakingAccountPool, StakingPool, StakingRewardToken } from '@/store/staking/types';

import type { FPNumber } from '@sora-substrate/math';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type {
  DemeterPool,
  DemeterAccountPool,
  DemeterRewardToken,
} from '@sora-substrate/util/build/demeterFarming/types';

export type StakingAsset = AccountAsset & {
  price: FPNumber;
};

export type StakingPoolDerived = {
  pool: StakingPool;
  accountPool: Nullable<StakingAccountPool>;
};

export type StakingPoolDerivedData = StakingPoolDerived & {
  tokenInfo: StakingRewardToken;
  baseAsset: StakingAsset;
  poolAsset: StakingAsset;
  rewardAsset: StakingAsset;
  emission: FPNumber;
  tvl: string;
  apr: string;
};

export type DemeterAsset = AccountAsset & {
  price: FPNumber;
};

export type DemeterPoolDerived = {
  pool: DemeterPool;
  accountPool: Nullable<DemeterAccountPool>;
};

export type DemeterPoolDerivedData = DemeterPoolDerived & {
  tokenInfo: DemeterRewardToken;
  baseAsset: DemeterAsset;
  poolAsset: DemeterAsset;
  rewardAsset: DemeterAsset;
  emission: FPNumber;
  tvl: string;
  apr: string;
};
