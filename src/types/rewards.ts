import { KnownSymbols, RewardInfo, RewardingEvents, CodecString, Asset } from '@sora-substrate/util'

export interface RewardsAmountHeaderItem {
  amount: string;
  symbol: KnownSymbols;
}

export interface RewardInfoGroup {
  type: RewardingEvents | string;
  asset: Asset;
  amount: CodecString;
  rewards?: Array<RewardInfo>;
}

export interface RewardsAmountTableItem extends RewardsAmountHeaderItem {
  title?: string;
}
