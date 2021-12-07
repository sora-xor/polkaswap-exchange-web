import map from 'lodash/fp/map';
import flatMap from 'lodash/fp/flatMap';
import fromPairs from 'lodash/fp/fromPairs';
import flow from 'lodash/fp/flow';
import concat from 'lodash/fp/concat';
import { api } from '@soramitsu/soraneo-wallet-web';

const types = flow(
  flatMap((x) => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat(['SET_BOND', 'SET_XOR_VALUE']),
  map((x) => [x, x]),
  fromPairs
)(['GET_REFERRAL', 'GET_INVITED_USERS']);

interface ReferralsState {
  referral: string;
  invitedUsers: Array<string>;
  isBond: boolean;
  xorValue: string;
}

function initialState(): ReferralsState {
  return {
    referral: '',
    invitedUsers: [],
    isBond: true,
    xorValue: '',
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

  [types.GET_INVITED_USERS_REQUEST](state: ReferralsState) {
    state.invitedUsers = [];
  },
  [types.GET_INVITED_USERS_SUCCESS](state: ReferralsState, invitedUsers: Array<string>) {
    state.invitedUsers = invitedUsers;
  },
  [types.GET_INVITED_USERS_FAILURE](state: ReferralsState) {
    state.invitedUsers = [];
  },

  [types.SET_BOND](state: ReferralsState, isBond: boolean) {
    state.isBond = isBond;
  },

  [types.SET_XOR_VALUE](state: ReferralsState, xorValue: string) {
    state.xorValue = xorValue;
  },
};

const actions = {
  async getReferral({ commit }, invitedUserId: string) {
    commit(types.GET_REFERRAL_REQUEST);
    try {
      const referral = await api.getReferral(invitedUserId);
      commit(types.GET_REFERRAL_SUCCESS, referral);
    } catch (error) {
      commit(types.GET_REFERRAL_FAILURE);
    }
  },
  async getInvitedUsers({ commit }, referralId: string) {
    commit(types.GET_INVITED_USERS_REQUEST);
    try {
      const invitedUsers = await api.getInvitedUsers(referralId);
      commit(types.GET_INVITED_USERS_SUCCESS, invitedUsers);
    } catch (error) {
      commit(types.GET_INVITED_USERS_FAILURE);
    }
  },
  setBound({ commit }, isBound: boolean) {
    commit(types.SET_BOND, isBound);
  },
  setXorValue({ commit }, xorValue: string) {
    commit(types.SET_XOR_VALUE, xorValue);
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
