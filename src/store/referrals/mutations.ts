import omit from 'lodash/fp/omit';
import { defineMutations } from 'direct-vuex';
import type { Subscription } from '@polkadot/x-rxjs';

import storage from '@/utils/storage';
import { initialState } from './state';
import type { ReferralsState } from './types';

const mutations = defineMutations<ReferralsState>()({
  resetReferral(state): void {
    state.referral = '';
  },
  setReferral(state, value: string): void {
    state.referral = value;
  },
  resetInvitedUsers(state): void {
    state.invitedUsers = [];
  },
  setInvitedUsers(state, value: Array<string>): void {
    state.invitedUsers = value;
  },
  resetInvitedUsersSubscription(state): void {
    if (state.invitedUsersSubscription) {
      state.invitedUsersSubscription.unsubscribe();
    }
    state.invitedUsersSubscription = null;
  },
  setInvitedUsersSubscription(state, subscription: Subscription): void {
    state.invitedUsersSubscription = subscription;
  },
  resetInputValue(state, value: string): void {
    state.inputValue = value;
  },
  setInputValue(state, value: string): void {
    state.inputValue = value;
  },
  setStorageReferral(state, value: string): void {
    state.storageReferral = value;
    storage.set('storageReferral', value);
  },
  reset(state): void {
    const s = omit(['invitedUsers', 'invitedUsersUpdates'], initialState());

    Object.keys(s).forEach((key) => {
      state[key] = s[key];
    });
  },
  unsubscribeFromInvitedUsers(state): void {
    if (state.invitedUsersSubscription) {
      state.invitedUsersSubscription.unsubscribe();
    }
    state.invitedUsersSubscription = null;
    state.invitedUsers = [];
  },
});

export default mutations;
