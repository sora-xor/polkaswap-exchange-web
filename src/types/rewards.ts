import type { RewardingEvents } from '@sora-substrate/util/build/rewards/consts';
import type { RewardInfo, RewardsInfo } from '@sora-substrate/util/build/rewards/types';
import type { Asset } from '@sora-substrate/util/build/assets/types';

export interface RewardsAmountHeaderItem {
  asset: Asset;
  amount: string;
}

export interface RewardInfoGroup {
  type: RewardingEvents | string;
  limit?: Array<RewardsAmountHeaderItem>;
  total?: RewardsAmountHeaderItem;
  title?: string;
  rewards?: Array<RewardInfo>;
}

export interface RewardsAmountTableItem {
  type?: string;
  title?: string;
  subtitle?: string;
  total?: string | RewardsAmountHeaderItem;
  limit?: Array<RewardsAmountHeaderItem>;
  rewards?: Array<RewardsAmountTableItem>;
}

export type SelectedRewards = {
  selectedInternal?: Nullable<RewardInfo>;
  selectedVested?: Nullable<RewardsInfo>;
  selectedCrowdloan?: Array<RewardInfo>;
  selectedExternal?: Array<RewardInfo>;
};

export type AccountRewards = {
  internalRewards?: Nullable<RewardInfo>;
  vestedRewards?: Nullable<RewardsInfo>;
  crowdloanRewards?: Array<RewardInfo>;
  externalRewards?: Array<RewardInfo>;
};
