import type { Asset } from '@/lib/substrate/sdk/assets/types';
import type { RewardInfo, RewardsInfo, RewardTypedEvent } from '@/lib/substrate/sdk/rewards/types';

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
