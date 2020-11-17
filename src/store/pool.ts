import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import liquidityApi from '@/api/liquidity'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  map(x => [x, x]),
  fromPairs
)([
  'GET_LIQUIDITY'
])

function initialState () {
  return {
    liquidity: null
  }
}

const state = initialState()

const getters = {
  liquidity (state) {
    return state.liquidity
  }
}

const mutations = {
  [types.GET_LIQUIDITY_REQUEST] (state) {
    state.liquidity = null
  },

  [types.GET_LIQUIDITY_SUCCESS] (state, liquidity: number) {
    state.liquidity = liquidity
  },

  [types.GET_LIQUIDITY_FAILURE] (state) {
    state.liquidity = null
  }
}

const actions = {
  async getLiquidity ({ commit }) {
    commit(types.GET_LIQUIDITY_REQUEST)
    try {
      const liquidity = await liquidityApi.getLiquidity()
      commit(types.GET_LIQUIDITY_SUCCESS, liquidity)
    } catch (error) {
      commit(types.GET_LIQUIDITY_FAILURE, error)
    }
  }
}

export default {
  state,
  getters,
  mutations,
  actions
}
