import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'GET_FIRST_TOKEN',
    'GET_SECOND_TOKEN',
    'GET_FIRST_TOKEN_VALUE',
    'GET_SECOND_TOKEN_VALUE'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'ADD_LIQUIDITY'
])

function initialState () {
  return {
    firstToken: null,
    secondToken: null,
    firstTokenValue: 0,
    secondTokenValue: 0
  }
}

const state = initialState()

const getters = {
  firstToken (state) {
    return state.firstToken
  },
  secondToken (state) {
    return state.secondToken
  },
  firstTokenValue (state) {
    return state.firstTokenValue
  },
  secondTokenValue (state) {
    return state.secondTokenValue
  }
}

const mutations = {
  [types.GET_FIRST_TOKEN] (state, firstToken: any) {
    state.firstToken = firstToken
  },
  [types.GET_SECOND_TOKEN] (state, secondToken: any) {
    state.secondToken = secondToken
  },
  [types.GET_FIRST_TOKEN_VALUE] (state, firstTokenValue: string | number) {
    state.firstTokenValue = firstTokenValue
  },
  [types.GET_SECOND_TOKEN_VALUE] (state, secondTokenValue: string | number) {
    state.secondTokenValue = secondTokenValue
  },
  [types.ADD_LIQUIDITY_REQUEST] (state) {
  },
  [types.ADD_LIQUIDITY_SUCCESS] (state) {
    state.firstToken = null
    state.secondToken = null
    state.firstTokenValue = 0
    state.secondTokenValue = 0
  },
  [types.ADD_LIQUIDITY_FAILURE] (state, error) {
  }
}

const actions = {
  setFirstToken ({ commit }, token: any) {
    commit(types.GET_FIRST_TOKEN, token)
  },
  setSecondToken ({ commit }, token: any) {
    commit(types.GET_SECOND_TOKEN, token)
  },
  setFirstTokenValue ({ commit }, fromValue: string | number) {
    commit(types.GET_FIRST_TOKEN_VALUE, fromValue)
  },
  setSecondTokenValue ({ commit }, toValue: string | number) {
    commit(types.GET_SECOND_TOKEN_VALUE, toValue)
  },
  addLiquidity ({ commit }) {
    commit(types.ADD_LIQUIDITY_REQUEST)

    try {
      commit(types.ADD_LIQUIDITY_SUCCESS)
    } catch (error) {
      commit(types.ADD_LIQUIDITY_FAILURE)
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
