import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import { Asset, AccountAsset, RegisteredAsset } from '@sora-substrate/util'
import { api } from '@soramitsu/soraneo-wallet-web'

import { isXorAccountAsset } from '@/utils'

export interface RegisteredAccountAsset extends RegisteredAsset {
  balance: string;
  externalBalance: string;
}

const types = flow(
  flatMap(x => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  map(x => [x, x]),
  fromPairs
)([
  'GET_ASSETS_LIST',
  'GET_ASSET',
  'GET_ACCOUNT_ASSETS',
  'GET_REGISTERED_ASSETS'
])

function initialState () {
  return {
    assets: [],
    registeredAssets: []
  }
}

const state = initialState()

const getters = {
  // list of all assets
  assets (state) {
    return state.assets
  },
  xorAsset (state) {
    return api.accountAssets.find(a => isXorAccountAsset(a)) || {}
  },
  xorBalance (state, getters) {
    return getters.xorAsset.balance || 0
  },
  registeredAssets (state) {
    return state.registeredAssets
  },
  assetsDataTable (state, getters, rootState, rootGetters) {
    const { accountAssets } = rootGetters
    const { assets, registeredAssets } = state
    const findByAddress = (address, assets) => assets.find(item => item.address === address)

    return assets.reduce((result, asset) => {
      const registeredAsset = findByAddress(asset.address, registeredAssets)
      const accountAsset = findByAddress(asset.address, accountAssets)

      const item = {
        ...asset,
        ...registeredAsset,
        ...accountAsset
      }

      return {
        ...result,
        [asset.address]: item
      }
    }, {})
  },
  getAssetDataByAddress (state, getters) {
    return (address?: string) => {
      if (!address) return undefined

      return getters.assetsDataTable[address]
    }
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

  [types.GET_ASSET_REQUEST] (state) {},
  [types.GET_ASSET_SUCCESS] (state) {},
  [types.GET_ASSET_FAILURE] (state) {},

  [types.GET_REGISTERED_ASSETS_REQUEST] (state) {
    state.registeredAssets = []
  },
  [types.GET_REGISTERED_ASSETS_SUCCESS] (state, registeredAssets: Array<RegisteredAccountAsset>) {
    state.registeredAssets = registeredAssets
  },
  [types.GET_REGISTERED_ASSETS_FAILURE] (state) {
    state.registeredAssets = []
  }
}

const actions = {
  async getAssets ({ commit }) {
    commit(types.GET_ASSETS_LIST_REQUEST)
    try {
      const assets = await api.getAssets()

      commit(types.GET_ASSETS_LIST_SUCCESS, assets)
    } catch (error) {
      commit(types.GET_ASSETS_LIST_FAILURE)
    }
  },
  async getAsset ({ commit }, { address }) {
    commit(types.GET_ASSET_REQUEST)
    try {
      const assets = await api.getAssets()
      const asset = assets.find(asset => asset.address === address)
      commit(types.GET_ASSET_SUCCESS)
      return asset
    } catch (error) {
      commit(types.GET_ASSET_FAILURE)
    }
  },
  async getRegisteredAssets ({ commit, dispatch }) {
    commit(types.GET_REGISTERED_ASSETS_REQUEST)
    try {
      const registeredAssets = await Promise.all((await api.bridge.getRegisteredAssets()).map(async item => {
        const accountAsset = item as RegisteredAccountAsset
        try {
          if (!accountAsset.externalAddress) {
            const externalAddress = await dispatch('web3/getEthTokenAddressByAssetId', { address: item.address }, { root: true })
            accountAsset.externalAddress = externalAddress
          }
          const externalBalance = await dispatch('web3/getBalanceByEthAddress', { address: item.externalAddress }, { root: true })
          accountAsset.externalBalance = externalBalance
          const asset = api.accountAssets.find(item => item.symbol === accountAsset.symbol)
          accountAsset.balance = asset ? asset.balance : ''
        } catch (error) {
          accountAsset.externalBalance = '-'
          throw new Error(error)
        }
        return accountAsset
      }))
      commit(types.GET_REGISTERED_ASSETS_SUCCESS, registeredAssets)
    } catch (error) {
      commit(types.GET_REGISTERED_ASSETS_FAILURE)
    }
  },
  async updateRegisteredAssetsExternalBalance ({ commit, dispatch, state }) {
    try {
      if (!Array.isArray(state.registeredAssets) || state.registeredAssets.length === 0) return

      // modify registeredAssets by link to save reactivity to getters['assets/asset']
      state.registeredAssets.forEach(async item => {
        if (!item.externalAddress) return

        item.externalBalance = await dispatch('web3/getBalanceByEthAddress', { address: item.externalAddress }, { root: true })
      })
    } catch (error) {
      console.error(error)
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
