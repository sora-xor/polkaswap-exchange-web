import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import liquidityApi from '@/api/liquidity'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_REMOVE_PART'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'GET_LIQUIDITY'
])

function initialState () {
  return {
    liquidity: null,
    removePart: 0
  }
}

const state = initialState()

const getters = {
  liquidity (state) {
    return state.liquidity
  },
  firstToken (state, getters, rootState) {
    return state.liquidity && rootState.tokens.tokens ? rootState.tokens.tokens.find(t => t.symbol === state.liquidity.firstToken) : {}
  },
  secondToken (state, getters, rootState) {
    return state.liquidity && rootState.tokens.tokens ? rootState.tokens.tokens.find(t => t.symbol === state.liquidity.secondToken) : {}
  },
  removePart (state) {
    return state.removePart
  },
  removeAmount (state) {
    return state.liquidity ? state.removePart * state.liquidity.balance / 100 : 0
  },
  firstTokenAmount (state) {
    return state.liquidity ? state.liquidity.firstTokenAmount : 0
  },
  firstTokenRemoveAmount (state, getters) {
    return state.removePart * getters.firstTokenAmount / 100
  },
  secondTokenAmount (state) {
    return state.liquidity ? state.liquidity.secondTokenAmount : 0
  },
  secondTokenRemoveAmount (state, getters) {
    return state.removePart * getters.secondTokenAmount / 100
  }
}

const mutations = {
  [types.GET_LIQUIDITY_REQUEST] (state) {
  },
  [types.GET_LIQUIDITY_SUCCESS] (state, liquidity) {
    state.liquidity = liquidity
  },
  [types.GET_LIQUIDITY_FAILURE] (state, error) {
  },
  [types.SET_REMOVE_PART] (state, removePart) {
    state.removePart = removePart
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
  },
  setRemovePart ({ commit }, removePart) {
    commit(types.SET_REMOVE_PART, Number(removePart))
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
