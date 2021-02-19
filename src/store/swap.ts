import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { api } from '@soramitsu/soraneo-wallet-web'
import { KnownAssets, KnownSymbols, Asset, AccountAsset } from '@sora-substrate/util'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'GET_FROM_VALUE',
    'GET_TO_VALUE',
    'GET_TOKEN_FROM_PRICE',
    'GET_MIN_MAX_RECEIVED',
    'GET_EXCHANGE_B',
    'GET_LIQUIDITY_PROVIDER_FEE',
    'GET_NETWORK_FEE',
    'GET_SWAP_CONFIRM'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'GET_TOKEN_XOR',
  'GET_TOKEN_FROM',
  'GET_TOKEN_TO'
])

function initialState () {
  return {
    tokenXOR: null,
    tokenFrom: null,
    tokenTo: null,
    fromValue: 0,
    toValue: 0,
    isTokenFromPrice: true,
    minMaxReceived: '',
    isExchangeB: false,
    liquidityProviderFee: '',
    networkFee: ''
  }
}

const state = initialState()

const getters = {
  tokenXOR (state) {
    return state.tokenXOR
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
  minMaxReceived (state) {
    return state.minMaxReceived
  },
  isExchangeB (state) {
    return state.isExchangeB
  },
  liquidityProviderFee (state) {
    return state.liquidityProviderFee
  },
  networkFee (state) {
    return state.networkFee
  }
}

const mutations = {
  [types.GET_TOKEN_XOR_REQUEST] (state) {
    state.tokenXOR = null
  },
  [types.GET_TOKEN_XOR_SUCCESS] (state, token: Asset | AccountAsset | null) {
    state.tokenXOR = token
  },
  [types.GET_TOKEN_XOR_FAILURE] (state) {
    state.tokenXOR = null
  },
  [types.GET_TOKEN_FROM_REQUEST] (state) {
    state.tokenFrom = null
  },
  [types.GET_TOKEN_FROM_SUCCESS] (state, token: Asset | AccountAsset | null) {
    state.tokenFrom = token
  },
  [types.GET_TOKEN_FROM_FAILURE] (state) {
    state.tokenFrom = null
  },
  [types.GET_TOKEN_TO_REQUEST] (state) {
    state.tokenTo = null
  },
  [types.GET_TOKEN_TO_SUCCESS] (state, token: Asset | AccountAsset | null) {
    state.tokenTo = token
  },
  [types.GET_TOKEN_TO_FAILURE] (state) {
    state.tokenTo = null
  },
  [types.GET_FROM_VALUE] (state, fromValue: string | number) {
    state.fromValue = fromValue
  },
  [types.GET_TO_VALUE] (state, toValue: string | number) {
    state.toValue = toValue
  },
  [types.GET_TOKEN_FROM_PRICE] (state, isTokenFromPrice: boolean) {
    state.isTokenFromPrice = isTokenFromPrice
  },
  [types.GET_MIN_MAX_RECEIVED] (state, minMaxReceived: string) {
    state.minMaxReceived = minMaxReceived
  },
  [types.GET_EXCHANGE_B] (state, isExchangeB: boolean) {
    state.isExchangeB = isExchangeB
  },
  [types.GET_LIQUIDITY_PROVIDER_FEE] (state, liquidityProviderFee: string) {
    state.liquidityProviderFee = liquidityProviderFee
  },
  [types.GET_NETWORK_FEE] (state, networkFee: string) {
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
      try {
        if (token) {
          let tokenFrom = await api.accountAssets.find(asset => asset.address === token.address)
          if (!tokenFrom) {
            tokenFrom = { ...token, balance: '0' }
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
      if (!payload.tokenSymbol) {
        return
      }
      try {
        if (token) {
          let tokenTo = await api.accountAssets.find(asset => asset.address === token.address)
          if (!tokenTo) {
            tokenTo = { ...token, balance: '0' }
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
    commit(types.GET_FROM_VALUE, fromValue)
  },
  setToValue ({ commit }, toValue: string | number) {
    commit(types.GET_TO_VALUE, toValue)
  },
  setTokenFromPrice ({ commit }, isTokenFromPrice: boolean) {
    commit(types.GET_TOKEN_FROM_PRICE, isTokenFromPrice)
  },
  setMinMaxReceived ({ commit }, payload) {
    commit(types.GET_MIN_MAX_RECEIVED, payload.minMaxReceived)
    commit(types.GET_EXCHANGE_B, !!payload.isExchangeB)
  },
  setLiquidityProviderFee ({ commit }, liquidityProviderFee: string) {
    commit(types.GET_LIQUIDITY_PROVIDER_FEE, liquidityProviderFee)
  },
  setNetworkFee ({ commit }, networkFee: string) {
    commit(types.GET_NETWORK_FEE, networkFee)
  }
}

export default {
  state,
  getters,
  mutations,
  actions
}
