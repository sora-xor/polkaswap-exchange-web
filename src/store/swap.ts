import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'

import swapApi from '@/api/swap'
import * as storage from '@/utils/storage'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'GET_WALLET_CONNECTED',
    'GET_FROM_VALUE',
    'GET_TO_VAUE',
    'GET_TOKEN_FROM_PRICE',
    'GET_SWAP_CONFIRM'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'GET_TOKEN_FROM',
  'GET_TOKEN_TO'
])

function initialState () {
  return {
    isWalletConnected: false,
    tokenFrom: null,
    tokenTo: null,
    fromValue: 0,
    toValue: 0,
    isTokenFromPrice: true,
    slippageTolerance: 0.5,
    liquidityProviderFee: 0.3,
    isSwapConfirmed: false
  }
}

const state = initialState()

const getters = {
  isWalletConnected (state) {
    return !!storage.getItem('address')
  },
  tokenFrom (state) {
    return state.tokenFrom
  },
  tokenTo (state) {
    return state.tokenTo
  },
  fromValue (state) {
    return state.fromValue
  },
  toValue (state) {
    return state.toValue
  },
  isTokenFromPrice (state) {
    return state.isTokenFromPrice
  },
  slippageTolerance (state) {
    return state.slippageTolerance
  },
  liquidityProviderFee (state) {
    return state.liquidityProviderFee
  },
  isSwapConfirmed (state) {
    return state.isSwapConfirmed
  }
}

const mutations = {
  [types.GET_WALLET_CONNECTED] (state, isWalletConnected: boolean) {
    state.isWalletConnected = isWalletConnected
  },
  [types.GET_TOKEN_FROM_REQUEST] (state) {
    state.tokenFrom = null
  },
  [types.GET_TOKEN_FROM_SUCCESS] (state, tokenFrom: any) {
    state.tokenFrom = tokenFrom
  },
  [types.GET_TOKEN_FROM_FAILURE] (state) {
    state.tokenFrom = null
  },
  [types.GET_TOKEN_TO_REQUEST] (state) {
    state.tokenTo = null
  },
  [types.GET_TOKEN_TO_SUCCESS] (state, tokenTo: any) {
    state.tokenTo = tokenTo
  },
  [types.GET_TOKEN_TO_FAILURE] (state) {
    state.tokenTo = null
  },
  [types.GET_FROM_VALUE] (state, fromValue: string | number) {
    state.fromValue = fromValue
  },
  [types.GET_TO_VAUE] (state, toValue: string | number) {
    state.toValue = toValue
  },
  [types.GET_TOKEN_FROM_PRICE] (state, isTokenFromPrice: boolean) {
    state.isTokenFromPrice = isTokenFromPrice
  },
  [types.GET_SWAP_CONFIRM] (state, isSwapConfirmed: boolean) {
    state.isSwapConfirmed = isSwapConfirmed
  }
}

const actions = {
  connectWallet ({ commit }, address: string) {
    storage.setItem('address', address)
    commit(types.GET_WALLET_CONNECTED, true)
  },
  async getTokenFrom ({ commit }, tokenSymbol: string) {
    commit(types.GET_TOKEN_FROM_REQUEST)
    try {
      const tokens = await swapApi.getTokens()
      commit(types.GET_TOKEN_FROM_SUCCESS, tokens[tokenSymbol])
    } catch (error) {
      commit(types.GET_TOKEN_FROM_FAILURE)
    }
  },
  async getTokenTo ({ commit }, tokenSymbol: string) {
    commit(types.GET_TOKEN_TO_REQUEST)
    try {
      const tokens = await swapApi.getTokens()
      commit(types.GET_TOKEN_TO_SUCCESS, tokens[tokenSymbol])
    } catch (error) {
      commit(types.GET_TOKEN_TO_FAILURE)
    }
  },
  setFromValue ({ commit }, fromValue: string | number) {
    commit(types.GET_FROM_VALUE, fromValue)
  },
  setToValue ({ commit }, toValue: string | number) {
    commit(types.GET_TO_VAUE, toValue)
  },
  setTokenFromPrice ({ commit }, isTokenFromPrice: boolean) {
    commit(types.GET_TOKEN_FROM_PRICE, isTokenFromPrice)
  },
  setSwapConfirm ({ commit }, isSwapConfirmed: boolean) {
    commit(types.GET_SWAP_CONFIRM, isSwapConfirmed)
  }
}

export default {
  state,
  getters,
  mutations,
  actions
}
