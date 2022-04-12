import omit from 'lodash/fp/omit';
import { defineMutations } from 'direct-vuex';
import type { Subscription } from '@polkadot/x-rxjs';

import storage from '@/utils/storage';
import { initialState } from './state';
import type { ReferralsState } from './types';

const mutations = defineMutations<ReferralsState>()({
  resetReferrer(state): void {
    state.referrer = '';
  },
  setReferrer(state, value: string): void {
    state.referrer = value;
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
  resetAmount(state): void {
    state.amount = '';
  },
  setAmount(state, value: string): void {
    state.amount = value;
  },
  setStorageReferrer(state, value: string): void {
    state.storageReferrer = value;
    storage.set('storageReferral', value);
  },
  resetStorageReferrer(state): void {
    state.storageReferrer = '';
    storage.set('storageReferral', '');
  },
  reset(state): void {
    const s = omit(['invitedUsers', 'invitedUsersSubscription'], initialState());

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
