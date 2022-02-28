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
    'SET_BOND',
    'SET_XOR_VALUE',
    'SET_REFERRAL',
    'SET_INVITED_USERS_INFO',
    'SET_INVITED_USERS_UPDATES',
    'RESET_INVITED_USERS_UPDATES',
    'RESET_INVITED_USERS_SUBSCRIPTION',
  ]),
  map((x) => [x, x]),
  fromPairs
)(['GET_REFERRAL']);

interface ReferralsState {
  referral: string;
  invitedUsers: Nullable<Array<string>>;
  invitedUsersUpdates: Nullable<Subscription>;
  isBond: boolean;
  xorValue: string;
  storageReferral: string;
}

function initialState(): ReferralsState {
  return {
    referral: '',
    invitedUsers: null,
    invitedUsersUpdates: null,
    isBond: true,
    xorValue: '',
    storageReferral: storage.get('storageReferral') || '',
  };
}

const state = initialState();

const getters = {
  referral(state: ReferralsState) {
    return state.referral;
  },
  invitedUsers(state: ReferralsState) {
    return state.invitedUsers;
  },
  isBond(state: ReferralsState) {
    return state.isBond;
  },
  storageReferral(state: ReferralsState) {
    return state.storageReferral;
  },
};

const mutations = {
  [types.GET_REFERRAL_REQUEST](state: ReferralsState) {
    state.referral = '';
  },
  [types.GET_REFERRAL_SUCCESS](state: ReferralsState, referral: string) {
    state.referral = referral;
  },
  [types.GET_REFERRAL_FAILURE](state: ReferralsState) {
    state.referral = '';
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

  [types.SET_BOND](state: ReferralsState, isBond: boolean) {
    state.isBond = isBond;
  },

  [types.SET_XOR_VALUE](state: ReferralsState, xorValue: string) {
    state.xorValue = xorValue;
  },

  [types.SET_REFERRAL](state: ReferralsState, value: string) {
    state.storageReferral = value;
    storage.set('storageReferral', value);
  },
};

const actions = {
  async getReferral({ commit }, invitedUserId: string) {
    commit(types.GET_REFERRAL_REQUEST);
    try {
      const referral = await api.referralSystem.getReferral(invitedUserId);
      commit(types.GET_REFERRAL_SUCCESS, referral);
    } catch (error) {
      commit(types.GET_REFERRAL_FAILURE);
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
  setBound({ commit }, isBound: boolean) {
    commit(types.SET_BOND, isBound);
  },
  setXorValue({ commit }, xorValue: string) {
    commit(types.SET_XOR_VALUE, xorValue);
  },
  setReferral({ commit }, value: string) {
    commit(types.SET_REFERRAL, value);
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
