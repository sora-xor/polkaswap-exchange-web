import type { RewardingEvents } from '@sora-substrate/util/build/rewards/consts';
import type { RewardInfo } from '@sora-substrate/util/build/rewards/types';
import type { Asset } from '@sora-substrate/util/build/assets/types';

export interface RewardsAmountHeaderItem {
  asset: Asset;
  amount: string;
}

export interface RewardInfoGroup {
  type: RewardingEvents | string;
  limit: Array<RewardsAmountHeaderItem>;
  total?: RewardsAmountHeaderItem;
  title?: string;
  rewards?: Array<RewardInfo>;
}

export interface RewardsAmountTableItem {
  type?: string;
  title?: string;
  subtitle?: string;
  total?: RewardsAmountHeaderItem;
  limit?: Array<RewardsAmountHeaderItem>;
  rewards?: Array<RewardsAmountTableItem>;
}
