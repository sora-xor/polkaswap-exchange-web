import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { dexApi } from '@soramitsu/soraneo-wallet-web'
import { KnownAssets, Asset, AccountAsset } from '@sora-substrate/util'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'GET_FROM_VALUE',
    'GET_TO_VALUE',
    'GET_TOKEN_FROM_PRICE',
    'GET_MIN_MAX_RECEIVED',
    'GET_LIQUIDITY_PROVIDER_FEE',
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
    tokenFrom: null,
    tokenTo: null,
    fromValue: 0,
    toValue: 0,
    isTokenFromPrice: true,
    minMaxReceived: '',
    liquidityProviderFee: ''
  }
}

const state = initialState()

const getters = {
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
  liquidityProviderFee (state) {
    return state.liquidityProviderFee
  }
}

const mutations = {
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
  [types.GET_LIQUIDITY_PROVIDER_FEE] (state, liquidityProviderFee: string) {
    state.liquidityProviderFee = liquidityProviderFee
  }
}

const actions = {
  async setTokenFrom ({ commit }, payload) {
    if (payload.isWalletConnected) {
      commit(types.GET_TOKEN_FROM_REQUEST)
      try {
        const token = KnownAssets.get(payload.tokenSymbol)
        if (token) {
          const tokenFrom = await dexApi.getAccountAsset(token.address)
          commit(types.GET_TOKEN_FROM_SUCCESS, tokenFrom)
        } else {
          throw new Error(`There is no ${payload.tokenSymbol} asset`)
        }
      } catch (error) {
        commit(types.GET_TOKEN_FROM_FAILURE)
        throw error
      }
    } else {
      commit(types.GET_TOKEN_FROM_SUCCESS, KnownAssets.get(payload.tokenSymbol))
    }
  },
  async setTokenTo ({ commit }, payload) {
    if (payload.isWalletConnected) {
      commit(types.GET_TOKEN_TO_REQUEST)
      try {
        const token = KnownAssets.get(payload.tokenSymbol)
        if (token) {
          const tokenTo = await dexApi.getAccountAsset(token.address)
          commit(types.GET_TOKEN_TO_SUCCESS, tokenTo)
        } else {
          throw new Error(`There is no ${payload.tokenSymbol} asset`)
        }
      } catch (error) {
        commit(types.GET_TOKEN_TO_FAILURE)
        throw error
      }
    } else {
      commit(types.GET_TOKEN_TO_SUCCESS, KnownAssets.get(payload.tokenSymbol))
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
  setMinMaxReceived ({ commit }, minMaxReceived: string) {
    commit(types.GET_MIN_MAX_RECEIVED, minMaxReceived)
  },
  setLiquidityProviderFee ({ commit }, liquidityProviderFee: string) {
    commit(types.GET_LIQUIDITY_PROVIDER_FEE, liquidityProviderFee)
  }
}

export default {
  state,
  getters,
  mutations,
  actions
}
