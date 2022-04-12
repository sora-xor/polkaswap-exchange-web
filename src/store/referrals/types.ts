import type { Subscription } from '@polkadot/x-rxjs';

export type ReferralsState = {
  referrer: string;
  invitedUsers: Array<string>;
  invitedUsersSubscription: Nullable<Subscription>;
  amount: string;
  storageReferrer: string;
};
