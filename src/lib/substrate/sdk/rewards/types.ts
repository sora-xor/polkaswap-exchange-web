import type { CodecString } from '@sora-substrate/math';

import type { Asset } from '../assets/types';
import type { RewardingEvents, RewardType } from './consts';
import type { History } from '../types';

// for tagged crowdloans
export type RewardTypedEvent = [RewardType, RewardingEvents | string];

export interface RewardsInfo {
  limit: CodecString;
  total: CodecString;
  rewards: Array<RewardInfo>;
}

export interface RewardInfo {
  type: RewardTypedEvent;
  asset: Asset;
  amount: CodecString;
  total?: CodecString;
}

export interface RewardClaimHistory extends History {
  externalAddress?: string;
  rewards?: Array<RewardInfo | RewardsInfo>;
}
