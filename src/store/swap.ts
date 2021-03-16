import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'
import { KnownAssets, KnownSymbols, Asset, AccountAsset, CodecString } from '@sora-substrate/util'

import { ZeroStringValue } from '@/consts'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'SET_TOKEN_FROM_ADDRESS',
    'RESET_TOKEN_FROM_ADDRESS',
    'SET_TOKEN_TO_ADDRESS',
    'RESET_TOKEN_TO_ADDRESS',
    'SET_FROM_VALUE',
    'SET_TO_VALUE',
    'SET_TOKEN_FROM_PRICE',
    'SET_MIN_MAX_RECEIVED',
    'SET_EXCHANGE_B',
    'SET_LIQUIDITY_PROVIDER_FEE',
    'SET_NETWORK_FEE',
    'GET_SWAP_CONFIRM'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'GET_TOKEN_XOR'
])

interface SwapState {
  tokenXOR: Asset | AccountAsset | null;
  tokenFromAddress: string | null;
  tokenToAddress: string | null;
  fromValue: string;
  toValue: string;
  isTokenFromPrice: boolean;
  minMaxReceived: CodecString;
  isExchangeB: boolean;
  liquidityProviderFee: CodecString;
  networkFee: CodecString;
}

function initialState (): SwapState {
  return {
    tokenXOR: null,
    tokenFromAddress: null,
    tokenToAddress: null,
    fromValue: '',
    toValue: '',
    isTokenFromPrice: true,
    minMaxReceived: '',
    isExchangeB: false,
    liquidityProviderFee: '',
    networkFee: ''
  }
}

const state = initialState()

const getters = {
  tokenXOR (state: SwapState) {
    return state.tokenXOR
  },
  tokenFrom (state: SwapState, getters, rootState, rootGetters) {
    return rootGetters['assets/getAssetDataByAddress'](state.tokenFromAddress)
  },
  tokenTo (state: SwapState, getters, rootState, rootGetters) {
    return rootGetters['assets/getAssetDataByAddress'](state.tokenToAddress)
  },
  fromValue (state: SwapState) {
    return state.fromValue
  },
  toValue (state: SwapState) {
    return state.toValue
  },
  isTokenFromPrice (state: SwapState) {
    return state.isTokenFromPrice
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
  }
}

const mutations = {
  [types.GET_TOKEN_XOR_REQUEST] (state: SwapState) {
    state.tokenXOR = null
  },
  [types.GET_TOKEN_XOR_SUCCESS] (state: SwapState, token: Asset | AccountAsset | null) {
    state.tokenXOR = token
  },
  [types.GET_TOKEN_XOR_FAILURE] (state: SwapState) {
    state.tokenXOR = null
  },
  [types.SET_TOKEN_FROM_ADDRESS] (state: SwapState, address: string) {
    state.tokenFromAddress = address
  },
  [types.RESET_TOKEN_FROM_ADDRESS] (state: SwapState) {
    state.tokenFromAddress = null
  },
  [types.SET_TOKEN_TO_ADDRESS] (state: SwapState, address: string) {
    state.tokenToAddress = address
  },
  [types.RESET_TOKEN_TO_ADDRESS] (state: SwapState) {
    state.tokenToAddress = null
  },
  [types.SET_FROM_VALUE] (state: SwapState, fromValue: string) {
    state.fromValue = fromValue
  },
  [types.SET_TO_VALUE] (state: SwapState, toValue: string) {
    state.toValue = toValue
  },
  [types.SET_TOKEN_FROM_PRICE] (state: SwapState, isTokenFromPrice: boolean) {
    state.isTokenFromPrice = isTokenFromPrice
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
  async getTokenXOR ({ commit }) {
    const token = KnownAssets.get(KnownSymbols.XOR)
    commit(types.GET_TOKEN_XOR_REQUEST)
    try {
      if (token) {
        const tokenFrom = await api.accountAssets.find(asset => asset.address === token.address)
        if (tokenFrom) {
          commit(types.GET_TOKEN_XOR_SUCCESS, { ...tokenFrom })
        }
      } else {
        throw new Error(`There is no ${KnownSymbols.XOR} asset`)
      }
    } catch (error) {
      commit(types.GET_TOKEN_XOR_FAILURE)
      throw error
    }
  },

  async setTokenFromAddress ({ commit, rootGetters }, address?: string) {
    try {
      if (!address) {
        commit(types.RESET_TOKEN_FROM_ADDRESS)
        return
      }

      const token = KnownAssets.get(address) || rootGetters['assets/assetsDataTable'][address]

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

      const token = KnownAssets.get(address) || rootGetters['assets/assetsDataTable'][address]

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
  setTokenFromPrice ({ commit }, isTokenFromPrice: boolean) {
    commit(types.SET_TOKEN_FROM_PRICE, isTokenFromPrice)
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
