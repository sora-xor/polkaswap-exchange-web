import type { Subscription } from 'rxjs';
import type { CodecString } from '@sora-substrate/util';
import type { RewardInfo, RewardsInfo, AccountMarketMakerInfo } from '@sora-substrate/util/build/rewards/types';
import type { RewardsAmountHeaderItem } from '@/types/rewards';

export type RewardsState = {
  // fee
  fee: CodecString;
  feeFetching: boolean;
  // rewards
  externalRewards: Array<RewardInfo>;
  internalRewards: Nullable<RewardInfo>;
  vestedRewards: Nullable<RewardsInfo>;
  crowdloanRewards: Array<RewardInfo>;
  // selected
  selectedExternal: Array<RewardInfo>;
  selectedInternal: Nullable<RewardInfo>;
  selectedVested: Nullable<RewardsInfo>;
  selectedCrowdloan: Array<RewardInfo>;
  // flags
  rewardsFetching: boolean;
  rewardsClaiming: boolean;
  transactionError: boolean;
  receivedRewards: RewardsAmountHeaderItem[];
  transactionStep: number;
  signature: string;
  accountMarketMakerInfo: Nullable<AccountMarketMakerInfo>;
  accountMarketMakerUpdates: Nullable<Subscription>;
  liquidityProvisionRewardsSubscription: Nullable<Subscription>;
  vestedRewardsSubscription: Nullable<Subscription>;
  crowdloanRewardsSubscription: Nullable<Subscription>;
};

export type ClaimRewardsParams = Partial<{
  internalAddress: string;
  externalAddress: string;
}>;
