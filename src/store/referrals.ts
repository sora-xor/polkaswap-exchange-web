import map from 'lodash/fp/map';
import omit from 'lodash/fp/omit';
import flatMap from 'lodash/fp/flatMap';
import fromPairs from 'lodash/fp/fromPairs';
import flow from 'lodash/fp/flow';
import concat from 'lodash/fp/concat';
import { api } from '@soramitsu/soraneo-wallet-web';
import type { Subscription } from '@polkadot/x-rxjs';

import storage from '@/utils/storage';

const types = flow(
  flatMap((x) => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_XOR_VALUE',
    'SET_REFERRER',
    'APPROVE_REFERRER',
    'SET_INVITED_USERS_INFO',
    'SET_INVITED_USERS_UPDATES',
    'RESET_INVITED_USERS_UPDATES',
    'RESET_INVITED_USERS_SUBSCRIPTION',
  ]),
  map((x) => [x, x]),
  fromPairs
)(['GET_REFERRER']);

interface ReferralsState {
  referrer: string;
  isReferrerApproved: boolean;
  invitedUsers: Nullable<Array<string>>;
  invitedUsersUpdates: Nullable<Subscription>;
  xorValue: string;
  storageReferrer: string;
}

function initialState(): ReferralsState {
  return {
    referrer: '',
    isReferrerApproved: false,
    invitedUsers: null,
    invitedUsersUpdates: null,
    xorValue: '',
    storageReferrer: storage.get('storageReferrer') || '',
  };
}

const state = initialState();

const getters = {
  referrer(state: ReferralsState) {
    return state.referrer;
  },
  isReferrerApproved(state: ReferralsState) {
    return state.isReferrerApproved;
  },
  invitedUsers(state: ReferralsState) {
    return state.invitedUsers;
  },
  storageReferrer(state: ReferralsState) {
    return state.storageReferrer;
  },
};

const mutations = {
  [types.GET_REFERRER_REQUEST](state: ReferralsState) {
    state.referrer = '';
  },
  [types.GET_REFERRER_SUCCESS](state: ReferralsState, referrer: string) {
    state.referrer = referrer;
  },
  [types.GET_REFERRER_FAILURE](state: ReferralsState) {
    state.referrer = '';
  },

  [types.SET_INVITED_USERS_INFO](state: ReferralsState, info: Nullable<Array<string>>) {
    state.invitedUsers = info;
  },
  [types.SET_INVITED_USERS_UPDATES](state: ReferralsState, subscription: Subscription) {
    state.invitedUsersUpdates = subscription;
  },
  [types.RESET_INVITED_USERS_UPDATES](state: ReferralsState) {
    if (state.invitedUsersUpdates) {
      state.invitedUsersUpdates.unsubscribe();
    }
    state.invitedUsersUpdates = null;
  },

  [types.RESET_INVITED_USERS_SUBSCRIPTION](state: ReferralsState) {
    const s = omit(['invitedUsers', 'invitedUsersUpdates'], initialState());

    Object.keys(s).forEach((key) => {
      state[key] = s[key];
    });
  },

  [types.SET_XOR_VALUE](state: ReferralsState, xorValue: string) {
    state.xorValue = xorValue;
  },

  [types.APPROVE_REFERRER](state: ReferralsState, isReferrerApproved: boolean) {
    state.isReferrerApproved = isReferrerApproved;
  },

  [types.SET_REFERRER](state: ReferralsState, value: string) {
    state.storageReferrer = value;
    storage.set('storageReferrer', value);
  },
};

const actions = {
  async getReferrer({ commit }, invitedUserId: string) {
    commit(types.GET_REFERRER_REQUEST);
    try {
      const referral = await api.referralSystem.getReferrer(invitedUserId);
      commit(types.GET_REFERRER_SUCCESS, referral);
    } catch (error) {
      commit(types.GET_REFERRER_FAILURE);
    }
  },
  async subscribeInvitedUsers({ commit, rootGetters }, referrerId: string) {
    commit(types.RESET_INVITED_USERS_UPDATES);

    if (!rootGetters.isLoggedIn) return;

    const invitedUsersSubscription = api.referralSystem.subscribeOnInvitedUsers(referrerId).subscribe((info) => {
      commit(types.SET_INVITED_USERS_INFO, info);
    });

    commit(types.SET_INVITED_USERS_UPDATES, invitedUsersSubscription);
  },
  unsubscribeInvitedUsers({ commit }) {
    commit(types.RESET_INVITED_USERS_UPDATES);
    commit(types.SET_INVITED_USERS_INFO, null);
  },
  resetInvitedUsersSubscription({ commit }) {
    commit(types.RESET_INVITED_USERS_SUBSCRIPTION);
  },
  setXorValue({ commit }, xorValue: string) {
    commit(types.SET_XOR_VALUE, xorValue);
  },
  setReferrer({ commit }, value: string) {
    commit(types.SET_REFERRER, value);
  },
  approveReferrer({ commit }, value: boolean) {
    commit(types.APPROVE_REFERRER, value);
  },
};

export default {
  namespaced: true,
  types,
  state,
  getters,
  mutations,
  actions,
};
