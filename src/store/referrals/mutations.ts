import { defineMutations } from 'direct-vuex';
import omit from 'lodash/fp/omit';

import type { ReferrerRewards } from '@/indexer/queries/referrals';
import storage from '@/utils/storage';

import { initialState } from './state';

import type { ReferralsState } from './types';
import type { Subscription } from 'rxjs';

const mutations = defineMutations<ReferralsState>()({
  resetReferrer(state): void {
    state.referrer = '';
  },
  setReferrer(state, value: string): void {
    state.referrer = value;
  },
  setReferrerSubscription(state, subscription: Subscription): void {
    state.referrerSubscription = subscription;
  },
  resetReferrerSubscription(state): void {
    state.referrerSubscription?.unsubscribe();
    state.referrerSubscription = null;
  },
  approveReferrer(state, value: boolean): void {
    state.isReferrerApproved = value;
  },
  resetInvitedUsers(state): void {
    state.invitedUsers = [];
  },
  setInvitedUsers(state, value: Array<string>): void {
    state.invitedUsers = value;
  },
  resetInvitedUsersSubscription(state): void {
    state.invitedUsersSubscription?.unsubscribe();
    state.invitedUsersSubscription = null;
  },
  setInvitedUsersSubscription(state, subscription: Subscription): void {
    state.invitedUsersSubscription = subscription;
  },
  resetAmount(state): void {
    state.amount = '';
  },
  setAmount(state, value: string): void {
    state.amount = value;
  },
  setStorageReferrer(state, value: string): void {
    state.storageReferrer = value;
    storage.set('storageReferral', value); // storageReferrer
  },
  resetStorageReferrer(state): void {
    state.storageReferrer = '';
    storage.set('storageReferral', ''); // storageReferrer
  },
  reset(state): void {
    const s = omit(['invitedUsers', 'invitedUsersSubscription'], initialState());

    Object.keys(s).forEach((key) => {
      state[key] = s[key];
    });
  },
  setReferralRewards(state, referralRewards: ReferrerRewards): void {
    state.referralRewards = referralRewards;
  },
  clearReferralRewards(state): void {
    state.referralRewards = null;
  },
  unsubscribeFromInvitedUsers(state): void {
    state.invitedUsersSubscription?.unsubscribe();
    state.invitedUsersSubscription = null;
    state.invitedUsers = [];
  },
});

export default mutations;
