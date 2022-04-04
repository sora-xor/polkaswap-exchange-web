import type { Subscription } from '@polkadot/x-rxjs';
import type { CodecString } from '@sora-substrate/util';
import type { RewardInfo, RewardsInfo, AccountMarketMakerInfo } from '@sora-substrate/util/build/rewards/types';

export type RewardsState = {
  fee: CodecString;
  feeFetching: boolean;
  externalRewards: Array<RewardInfo>;
  selectedExternalRewards: Array<RewardInfo>;
  internalRewards: Nullable<RewardInfo>;
  selectedInternalRewards: Nullable<RewardInfo>;
  vestedRewards: Nullable<RewardsInfo>;
  selectedVestedRewards: Nullable<RewardsInfo>;
  crowdloanRewards: Array<RewardInfo>;
  selectedCrowdloanRewards: Array<RewardInfo>;
  rewardsFetching: boolean;
  rewardsClaiming: boolean;
  rewardsRecieved: boolean;
  transactionError: boolean;
  transactionStep: number;
  signature: string;
  accountMarketMakerInfo: Nullable<AccountMarketMakerInfo>;
  accountMarketMakerUpdates: Nullable<Subscription>;
};
