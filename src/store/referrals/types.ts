import type { ReferrerRewards } from '@/indexer/queries/referrals';

import type { Subscription } from 'rxjs';

export type ReferralsState = {
  referrer: string;
  referrerSubscription: Nullable<Subscription>;
  referralRewards: Nullable<ReferrerRewards>;
  invitedUsers: Array<string>;
  invitedUsersSubscription: Nullable<Subscription>;
  amount: string;
  storageReferrer: string;
  isReferrerApproved: boolean;
};
