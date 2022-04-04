import type { Subscription } from '@polkadot/x-rxjs';

export type ReferralsState = {
  referral: string;
  invitedUsers: Array<string>;
  invitedUsersSubscription: Nullable<Subscription>;
  inputValue: string;
  storageReferral: string;
};
