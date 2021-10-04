import map from 'lodash/fp/map';
import fromPairs from 'lodash/fp/fromPairs';
import concat from 'lodash/fp/concat';
import flow from 'lodash/fp/flow';

import { PageNames } from '@/consts';

const types = flow(
  concat(['SET_ROUTE']),
  map((x) => [x, x]),
  fromPairs
)([]);

interface RouterState {
  prev?: Nullable<PageNames>;
  current?: Nullable<PageNames>;
}

function initialState(): RouterState {
  return {
    prev: null,
    current: null,
  };
}

const state = initialState();

const getters = {
  prev(state: RouterState) {
    return state.prev;
  },
  current(state: RouterState) {
    return state.current;
  },
};

const mutations = {
  [types.SET_ROUTE](state: RouterState, params: RouterState) {
    state.prev = params.prev;
    state.current = params.current;
  },
};

const actions = {
  async setRoute({ commit }, params: RouterState) {
    commit(types.SET_ROUTE, params);
  },
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
};
