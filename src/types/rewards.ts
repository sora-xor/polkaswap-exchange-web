import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { RewardInfo, RewardsInfo, RewardTypedEvent } from '@sora-substrate/sdk/build/rewards/types';

export interface RewardsAmountHeaderItem {
  asset: Asset;
  amount: string;
}

export interface RewardInfoGroup {
  type: RewardTypedEvent;
  limit?: Array<RewardsAmountHeaderItem>;
  total?: RewardsAmountHeaderItem;
  title?: string;
  rewards?: Array<RewardInfo>;
}

export type SelectedRewards = {
  selectedInternal?: Nullable<RewardInfo>;
  selectedVested?: Nullable<RewardsInfo>;
  selectedCrowdloan?: Record<string, RewardInfo[]>;
  selectedExternal?: RewardInfo[];
};

export type AccountRewards = {
  internalRewards?: Nullable<RewardInfo>;
  vestedRewards?: Nullable<RewardsInfo>;
  crowdloanRewards?: Record<string, RewardInfo[]>;
  externalRewards?: RewardInfo[];
};
