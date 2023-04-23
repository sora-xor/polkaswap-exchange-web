import type { Subscription } from 'rxjs';
import type { CodecString } from '@sora-substrate/util';
import type { RewardInfo, RewardsInfo } from '@sora-substrate/util/build/rewards/types';
import type { RewardsAmountHeaderItem } from '@/types/rewards';

export type RewardsState = {
  // fee
  fee: CodecString;
  feeFetching: boolean;
  // rewards
  externalRewards: Array<RewardInfo>;
  internalRewards: Nullable<RewardInfo>;
  vestedRewards: Nullable<RewardsInfo>;
  crowdloanRewards: Record<string, RewardInfo[]>;
  // selected
  selectedExternal: Array<RewardInfo>;
  selectedInternal: Nullable<RewardInfo>;
  selectedVested: Nullable<RewardsInfo>;
  selectedCrowdloan: Record<string, RewardInfo[]>;
  // flags
  rewardsFetching: boolean;
  rewardsClaiming: boolean;
  transactionError: boolean;
  receivedRewards: RewardsAmountHeaderItem[];
  transactionStep: number;
  signature: string;
  liquidityProvisionRewardsSubscription: Nullable<Subscription>;
  vestedRewardsSubscription: Nullable<Subscription>;
  crowdloanRewardsSubscription: Nullable<Subscription>;
};

export type ClaimRewardsParams = Partial<{
  internalAddress: string;
  externalAddress: string;
}>;
