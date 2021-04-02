import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { KnownAssets, CodecString } from '@sora-substrate/util'
import { isXorAccountAsset } from '@/utils'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_TOKEN_FROM_ADDRESS',
    'RESET_TOKEN_FROM_ADDRESS',
    'SET_TOKEN_TO_ADDRESS',
    'RESET_TOKEN_TO_ADDRESS',
    'SET_FROM_VALUE',
    'SET_TO_VALUE',
    'SET_MIN_MAX_RECEIVED',
    'SET_EXCHANGE_B',
    'SET_LIQUIDITY_PROVIDER_FEE',
    'SET_NETWORK_FEE',
    'GET_SWAP_CONFIRM'
  ]),
  map(x => [x, x]),
  fromPairs
)([])

interface SwapState {
  tokenFromAddress: string | null;
  tokenToAddress: string | null;
  fromValue: string;
  toValue: string;
  minMaxReceived: CodecString;
  isExchangeB: boolean;
  liquidityProviderFee: CodecString;
  networkFee: CodecString;
}

function initialState (): SwapState {
  return {
    tokenFromAddress: '',
    tokenToAddress: '',
    fromValue: '',
    toValue: '',
    minMaxReceived: '',
    isExchangeB: false,
    liquidityProviderFee: '',
    networkFee: ''
  }
}

const state = initialState()

const getters = {
  tokenFrom (state: SwapState, getters, rootState, rootGetters) {
    return rootGetters['assets/getAssetDataByAddress'](state.tokenFromAddress)
  },
  tokenTo (state: SwapState, getters, rootState, rootGetters) {
    return rootGetters['assets/getAssetDataByAddress'](state.tokenToAddress)
  },
  isXorAssetUsed (state: SwapState, getters) {
    return isXorAccountAsset(getters.tokenFrom) || isXorAccountAsset(getters.tokenTo)
  },
  fromValue (state: SwapState) {
    return state.fromValue
  },
  toValue (state: SwapState) {
    return state.toValue
  },
  minMaxReceived (state: SwapState) {
    return state.minMaxReceived
  },
  isExchangeB (state: SwapState) {
    return state.isExchangeB
  },
  liquidityProviderFee (state: SwapState) {
    return state.liquidityProviderFee
  },
  networkFee (state: SwapState) {
    return state.networkFee
  },
  swapLiquiditySource (state, getters, rootState, rootGetters) {
    if (!getters.isXorAssetUsed) return undefined

    return rootGetters.liquiditySource
  }
}

const mutations = {
  [types.SET_TOKEN_FROM_ADDRESS] (state: SwapState, address: string) {
    state.tokenFromAddress = address
  },
  [types.RESET_TOKEN_FROM_ADDRESS] (state: SwapState) {
    state.tokenFromAddress = ''
  },
  [types.SET_TOKEN_TO_ADDRESS] (state: SwapState, address: string) {
    state.tokenToAddress = address
  },
  [types.RESET_TOKEN_TO_ADDRESS] (state: SwapState) {
    state.tokenToAddress = ''
  },
  [types.SET_FROM_VALUE] (state: SwapState, fromValue: string) {
    state.fromValue = fromValue
  },
  [types.SET_TO_VALUE] (state: SwapState, toValue: string) {
    state.toValue = toValue
  },
  [types.SET_MIN_MAX_RECEIVED] (state: SwapState, minMaxReceived: CodecString) {
    state.minMaxReceived = minMaxReceived
  },
  [types.SET_EXCHANGE_B] (state: SwapState, isExchangeB: boolean) {
    state.isExchangeB = isExchangeB
  },
  [types.SET_LIQUIDITY_PROVIDER_FEE] (state: SwapState, liquidityProviderFee: CodecString) {
    state.liquidityProviderFee = liquidityProviderFee
  },
  [types.SET_NETWORK_FEE] (state: SwapState, networkFee: CodecString) {
    state.networkFee = networkFee
  }
}

const actions = {
  async setTokenFromAddress ({ commit, rootGetters }, address?: string) {
    try {
      if (!address) {
        commit(types.RESET_TOKEN_FROM_ADDRESS)
        return
      }

      const token = KnownAssets.get(address) || rootGetters['assets/getAssetDataByAddress'](address)

      if (token) {
        commit(types.SET_TOKEN_FROM_ADDRESS, address)
      } else {
        throw new Error(`There is no ${address} asset`)
      }
    } catch (error) {
      commit(types.RESET_TOKEN_FROM_ADDRESS)
      throw error
    }
  },

  async setTokenToAddress ({ commit, rootGetters }, address?: string) {
    try {
      if (!address) {
        commit(types.RESET_TOKEN_TO_ADDRESS)
        return
      }

      const token = KnownAssets.get(address) || rootGetters['assets/getAssetDataByAddress'](address)

      if (token) {
        commit(types.SET_TOKEN_TO_ADDRESS, address)
      } else {
        throw new Error(`There is no ${address} asset`)
      }
    } catch (error) {
      commit(types.RESET_TOKEN_TO_ADDRESS)
      throw error
    }
  },

  setFromValue ({ commit }, fromValue: string | number) {
    commit(types.SET_FROM_VALUE, fromValue)
  },
  setToValue ({ commit }, toValue: string | number) {
    commit(types.SET_TO_VALUE, toValue)
  },
  setMinMaxReceived ({ commit }, minMaxReceived) {
    commit(types.SET_MIN_MAX_RECEIVED, minMaxReceived)
  },
  setExchangeB ({ commit }, flag: boolean) {
    commit(types.SET_EXCHANGE_B, flag)
  },
  setLiquidityProviderFee ({ commit }, liquidityProviderFee: string) {
    commit(types.SET_LIQUIDITY_PROVIDER_FEE, liquidityProviderFee)
  },
  setNetworkFee ({ commit }, networkFee: string) {
    commit(types.SET_NETWORK_FEE, networkFee)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
