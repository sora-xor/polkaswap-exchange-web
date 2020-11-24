import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import liquidityApi from '@/api/liquidity'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
  ]),
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
  },
  [types.GET_LIQUIDITY_SUCCESS] (state, liquidity) {
    state.liquidity = liquidity
  },
  [types.GET_LIQUIDITY_FAILURE] (state, error) {
  }
}

const actions = {
  async getLiquidity ({ commit }, id) {
    commit(types.GET_LIQUIDITY_REQUEST)

    try {
      const liquidity = await liquidityApi.getLiquidityById(id)
      commit(types.GET_LIQUIDITY_SUCCESS, liquidity)
    } catch (error) {
      commit(types.GET_LIQUIDITY_FAILURE)
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
