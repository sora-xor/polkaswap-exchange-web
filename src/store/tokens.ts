import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import tokensApi from '@/api/tokens'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  map(x => [x, x]),
  fromPairs
)([
  'GET_TOKENS_LIST'
])

function initialState () {
  return {
    tokens: []
  }
}

const state = initialState()

const getters = {
  tokens (state) {
    return state.tokens
  }
}

const mutations = {
  [types.GET_TOKENS_LIST_REQUEST] (state) {
    state.tokens = null
  },

  [types.GET_TOKENS_LIST_SUCCESS] (state, tokens) {
    state.tokens = tokens
  },

  [types.GET_TOKENS_LIST_FAILURE] (state) {
    state.tokens = null
  }
}

const actions = {
  async getTokens ({ commit }) {
    commit(types.GET_TOKENS_LIST_REQUEST)
    try {
      const tokens = await tokensApi.getTokens()
      commit(types.GET_TOKENS_LIST_SUCCESS, tokens)
    } catch (error) {
      commit(types.GET_TOKENS_LIST_FAILURE, error)
    }
  }
}

export default {
  types,
  state,
  getters,
  mutations,
  actions
}
