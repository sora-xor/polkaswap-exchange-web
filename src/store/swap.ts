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
  'GET_TOKEN_XOR',
  'GET_TOKEN_FROM',
  'GET_TOKEN_TO'
])

interface SwapState {
  tokenXOR: Asset | AccountAsset | null;
  tokenFrom: Asset | AccountAsset | null;
  tokenTo: Asset | AccountAsset | null;
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
    tokenFrom: null,
    tokenTo: null,
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
  tokenFrom (state: SwapState) {
    return state.tokenFrom
  },
  tokenTo (state: SwapState) {
    return state.tokenTo
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
  [types.GET_TOKEN_FROM_REQUEST] (state: SwapState) {
    state.tokenFrom = null
  },
  [types.GET_TOKEN_FROM_SUCCESS] (state: SwapState, token: Asset | AccountAsset | null) {
    state.tokenFrom = token
  },
  [types.GET_TOKEN_FROM_FAILURE] (state: SwapState) {
    state.tokenFrom = null
  },
  [types.GET_TOKEN_TO_REQUEST] (state: SwapState) {
    state.tokenTo = null
  },
  [types.GET_TOKEN_TO_SUCCESS] (state: SwapState, token: Asset | AccountAsset | null) {
    state.tokenTo = token
  },
  [types.GET_TOKEN_TO_FAILURE] (state: SwapState) {
    state.tokenTo = null
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
  async setTokenFrom ({ commit, rootGetters }, payload) {
    const token = KnownAssets.get(payload.tokenSymbol) || rootGetters['assets/assets'].find(item => item.symbol === payload.tokenSymbol)
    if (payload.isWalletConnected) {
      commit(types.GET_TOKEN_FROM_REQUEST)
      if (payload.updatedAsset) {
        commit(types.GET_TOKEN_FROM_SUCCESS, payload.updatedAsset)
        return
      }
      try {
        if (token) {
          let tokenFrom = await api.accountAssets.find(asset => asset.address === token.address)
          if (!tokenFrom) {
            tokenFrom = { ...token, balance: ZeroStringValue }
          }
          commit(types.GET_TOKEN_FROM_SUCCESS, tokenFrom)
        } else {
          throw new Error(`There is no ${payload.tokenSymbol} asset`)
        }
      } catch (error) {
        commit(types.GET_TOKEN_FROM_FAILURE)
        throw error
      }
    } else {
      commit(types.GET_TOKEN_FROM_SUCCESS, token)
    }
  },
  async setTokenTo ({ commit, rootGetters }, payload) {
    const token = KnownAssets.get(payload.tokenSymbol) || rootGetters['assets/assets'].find(item => item.symbol === payload.tokenSymbol)
    if (payload.isWalletConnected) {
      commit(types.GET_TOKEN_TO_REQUEST)
      if (payload.updatedAsset) {
        commit(types.GET_TOKEN_TO_SUCCESS, payload.updatedAsset)
        return
      }
      if (!payload.tokenSymbol) {
        return
      }
      try {
        if (token) {
          let tokenTo = await api.accountAssets.find(asset => asset.address === token.address)
          if (!tokenTo) {
            tokenTo = { ...token, balance: ZeroStringValue }
          }
          commit(types.GET_TOKEN_TO_SUCCESS, tokenTo)
        } else {
          throw new Error(`There is no ${payload.tokenSymbol} asset`)
        }
      } catch (error) {
        commit(types.GET_TOKEN_TO_FAILURE)
        throw error
      }
    } else {
      commit(types.GET_TOKEN_TO_SUCCESS, token)
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
  state,
  getters,
  mutations,
  actions
}
