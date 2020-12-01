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
  'GET_LIQUIDITIES'
])

function initialState () {
  return {
    liquidities: []
  }
}

const state = initialState()

const getters = {
  liquidities (state) {
    return state.liquidities
  }
}

const mutations = {
  [types.GET_LIQUIDITIES_REQUEST] (state) {
  },

  [types.GET_LIQUIDITIES_SUCCESS] (state, liquidities) {
    state.liquidities = liquidities
  },

  [types.GET_LIQUIDITIES_FAILURE] (state) {
  }
}

const actions = {
  async getLiquidities ({ commit }) {
    commit(types.GET_LIQUIDITIES_REQUEST)
    try {
      const liquidities = await liquidityApi.getLiquidities()
      commit(types.GET_LIQUIDITIES_SUCCESS, liquidities)
    } catch (error) {
      commit(types.GET_LIQUIDITIES_FAILURE, error)
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
