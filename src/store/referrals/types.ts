import type { Subscription } from 'rxjs';

export type ReferralsState = {
  referrer: string;
  referrerSubscription: Nullable<Subscription>;
  invitedUsers: Array<string>;
  invitedUsersSubscription: Nullable<Subscription>;
  amount: string;
  storageReferrer: string;
  isReferrerApproved: boolean;
};
