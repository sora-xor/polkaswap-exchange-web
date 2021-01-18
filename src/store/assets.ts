import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import { Asset, KnownSymbols } from '@sora-substrate/util'
import { dexApi } from '@soramitsu/soraneo-wallet-web'

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  map(x => [x, x]),
  fromPairs
)([
  'GET_ASSETS_LIST',
  'GET_ACCOUNT_ASSETS_LIST'
])

function initialState () {
  return {
    assets: [],
    accountAssets: []
  }
}

const state = initialState()

const getters = {
  assets (state) {
    return state.assets
  },
  accountAssets (state) {
    return state.accountAssets
  },
  xorAsset (state) {
    return state.accountAssets.find(a => a.symbol === KnownSymbols.XOR) || {}
  },
  xorBalance (state, getters) {
    return getters.xorAsset.balance || 0
  }
}

const mutations = {
  [types.GET_ASSETS_LIST_REQUEST] (state) {
    state.assets = []
  },

  [types.GET_ASSETS_LIST_SUCCESS] (state, assets: Array<Asset>) {
    state.assets = assets
  },

  [types.GET_ASSETS_LIST_FAILURE] (state) {
    state.assets = []
  },

  [types.GET_ACCOUNT_ASSETS_LIST_REQUEST] (state) {
    state.assets = []
  },

  [types.GET_ACCOUNT_ASSETS_LIST_SUCCESS] (state, accountAssets: Array<Asset>) {
    state.accountAssets = accountAssets
  },

  [types.GET_ACCOUNT_ASSETS_LIST_FAILURE] (state) {
    state.assets = []
  }
}

const actions = {
  async getAssets ({ commit }) {
    commit(types.GET_ASSETS_LIST_REQUEST)
    try {
      const assets = await dexApi.getAssets()

      commit(types.GET_ASSETS_LIST_SUCCESS, assets)
    } catch (error) {
      commit(types.GET_ASSETS_LIST_FAILURE)
    }
  },

  getAccountAssets ({ commit }) {
    commit(types.GET_ACCOUNT_ASSETS_LIST_REQUEST)
    try {
      commit(types.GET_ACCOUNT_ASSETS_LIST_SUCCESS, dexApi.accountAssets.filter(asset => asset.symbol !== 'XYKPOOL'))
    } catch (error) {
      commit(types.GET_ACCOUNT_ASSETS_LIST_FAILURE)
    }
  }
}

export default {
  namespaced: true,
  types,
  state,
  getters,
  mutations,
  actions
}
