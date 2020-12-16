import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import concat from 'lodash/fp/concat'
import { dexApi } from '@soramitsu/soraneo-wallet-web'
import { KnownAssets, KnownSymbols, Asset } from '@sora-substrate/util'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  concat([
    'GET_TOKEN_FROM',
    'GET_TOKEN_TO',
    'GET_FROM_VALUE',
    'GET_TO_VALUE',
    'GET_TOKEN_FROM_PRICE',
    'GET_LIQUIDITY_PROVIDER_FEE',
    'GET_SWAP_CONFIRM'
  ]),
  map(x => [x, x]),
  fromPairs
)([
  'GET_ACCOUNT_TOKEN_FROM',
  'GET_ACCOUNT_TOKEN_TO'
])

// TODO 4 alexnatalia: Set XOR token for connected variant (with balance)
function initialState () {
  return {
    tokenFrom: KnownAssets.find(({ symbol }) => KnownSymbols.XOR),
    tokenTo: null,
    fromValue: 0,
    toValue: 0,
    isTokenFromPrice: true,
    liquidityProviderFee: 0
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
  liquidityProviderFee (state) {
    return state.liquidityProviderFee
  }
}

const mutations = {

  [types.GET_TOKEN_FROM] (state, tokenFrom: any) {
    state.tokenFrom = tokenFrom
  },
  [types.GET_ACCOUNT_TOKEN_FROM_REQUEST] (state) {
    state.tokenFrom = null
  },
  [types.GET_ACCOUNT_TOKEN_FROM_SUCCESS] (state, token: Asset) {
    state.tokenFrom = token
  },
  [types.GET_ACCOUNT_TOKEN_FROM_FAILURE] (state) {
    state.tokenFrom = null
  },
  [types.GET_TOKEN_TO] (state, tokenTo: any) {
    state.tokenTo = tokenTo
  },
  [types.GET_ACCOUNT_TOKEN_TO_REQUEST] (state) {
    state.tokenTo = null
  },
  [types.GET_ACCOUNT_TOKEN_TO_SUCCESS] (state, token: Asset) {
    state.tokenTo = token
  },
  [types.GET_ACCOUNT_TOKEN_TO_FAILURE] (state) {
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
  [types.GET_LIQUIDITY_PROVIDER_FEE] (state, liquidityProviderFee: string) {
    state.liquidityProviderFee = liquidityProviderFee
  }
}

const actions = {
  setTokenFrom ({ commit }, token: any) {
    commit(types.GET_TOKEN_FROM, token)
  },
  async setAccountTokenFrom ({ commit }, token: Asset) {
    commit(types.GET_ACCOUNT_TOKEN_FROM_REQUEST)
    try {
      const tokenFrom = await dexApi.getAccountAsset(token.address)
      console.log('tokenFrom: ', tokenFrom)
      commit(types.GET_ACCOUNT_TOKEN_FROM_SUCCESS, tokenFrom)
    } catch (error) {
      commit(types.GET_ACCOUNT_TOKEN_FROM_FAILURE)
    }
  },
  setTokenTo ({ commit }, token: any) {
    commit(types.GET_TOKEN_TO, token)
  },
  async setAccountTokenTo ({ commit }, token: Asset) {
    commit(types.GET_ACCOUNT_TOKEN_TO_REQUEST)
    try {
      const tokenTo = await dexApi.getAccountAsset(token.address)
      console.log('tokenFrom: ', tokenTo)
      commit(types.GET_ACCOUNT_TOKEN_TO_SUCCESS, tokenTo)
    } catch (error) {
      commit(types.GET_ACCOUNT_TOKEN_TO_FAILURE)
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
