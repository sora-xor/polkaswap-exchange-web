import { RewardInfo, RewardingEvents, CodecString, Asset } from '@sora-substrate/util'

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
