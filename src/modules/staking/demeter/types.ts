import type { FPNumber } from '@/lib/substrate/math';
import type { AccountAsset } from '@/lib/substrate/sdk/assets/types';
import type { DemeterPool, DemeterAccountPool, DemeterRewardToken } from '@/lib/substrate/sdk/demeterFarming/types';

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
