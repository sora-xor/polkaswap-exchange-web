import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import liquidityAPI from '@/api/liquidity'
import { dexApi } from '@soramitsu/soraneo-wallet-web'

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
  async setFirstToken ({ commit }, token: any) {
    const asset = await dexApi.getAccountAsset(token.address)
    commit(types.GET_FIRST_TOKEN, asset)
  },

  async setSecondToken ({ commit }, token: any) {
    const asset = await dexApi.getAccountAsset(token.address)
    commit(types.GET_SECOND_TOKEN, asset)
  },

  setFirstTokenValue ({ commit }, value: string | number) {
    commit(types.GET_FIRST_TOKEN_VALUE, value)
  },

  setSecondTokenValue ({ commit }, value: string | number) {
    commit(types.GET_SECOND_TOKEN_VALUE, value)
  },

  async addLiquidity ({ commit, getters }) {
    commit(types.ADD_LIQUIDITY_REQUEST)
    const reserve = await dexApi.getLiquidityReserves(getters.firstToken.address, getters.secondToken.address)

    const result = await dexApi.addLiquidity(
      getters.firstToken.address,
      getters.secondToken.address,
      getters.firstTokenValue,
      getters.secondTokenValue
    )

    try {
      commit(types.ADD_LIQUIDITY_SUCCESS, result)
    } catch (error) {
      commit(types.ADD_LIQUIDITY_FAILURE)
    }
  },

  async setDataFromLiquidity ({ commit, dispatch, rootGetters }, { firstAddress, secondAddress }) {
    dispatch('setFirstToken', rootGetters['assets/assets'].find(a => a.address === firstAddress))
    dispatch('setSecondToken', rootGetters['assets/assets'].find(a => a.address === secondAddress))
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
