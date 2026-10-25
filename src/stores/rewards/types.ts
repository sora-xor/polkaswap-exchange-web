import type { RewardsAmountHeaderItem } from '@/types/rewards';

import type { CodecString } from '@sora-substrate/sdk';
import type { RewardInfo, RewardsInfo } from '@sora-substrate/sdk/build/rewards/types';
import type { Subscription } from 'rxjs';

export type RewardsState = {
  fee: CodecString;
  feeFetching: boolean;
  externalRewards: Array<RewardInfo>;
  internalRewards: Nullable<RewardInfo>;
  vestedRewards: Nullable<RewardsInfo>;
  crowdloanRewards: Record<string, RewardInfo[]>;
  selectedExternal: Array<RewardInfo>;
  selectedInternal: Nullable<RewardInfo>;
  selectedVested: Nullable<RewardsInfo>;
  selectedCrowdloan: Record<string, RewardInfo[]>;
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
