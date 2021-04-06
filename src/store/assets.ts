import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import { KnownAssets, KnownSymbols, Asset, RegisteredAccountAsset } from '@sora-substrate/util'
import { api } from '@soramitsu/soraneo-wallet-web'

import { findAssetInCollection } from '@/utils'
import { ZeroStringValue } from '@/consts'

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
  tokenXOR (state, getters, rootState, rootGetters) {
    const token = KnownAssets.get(KnownSymbols.XOR)

    return rootGetters['assets/getAssetDataByAddress'](token?.address)
  },
  registeredAssets (state) {
    return state.registeredAssets
  },
  assetsDataTable (state, getters, rootState, rootGetters) {
    const { accountAssets } = rootGetters
    const { assets, registeredAssets } = state

    return assets.reduce((result, asset) => {
      const { externalAddress, externalBalance } = findAssetInCollection(asset, registeredAssets) || {}
      const { balance } = findAssetInCollection(asset, accountAssets) || {}

      const item = {
        ...asset,
        balance,
        externalAddress,
        externalBalance
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
    await dispatch('updateRegisteredAssets')
  },
  async updateRegisteredAssets ({ commit, dispatch }) {
    try {
      const registeredAssets = await api.bridge.getRegisteredAssets()
      const preparedRegisteredAssets = await Promise.all(registeredAssets.map(async item => {
        const accountAsset = { ...item, externalBalance: ZeroStringValue }
        try {
          if (!accountAsset.externalAddress) {
            const externalAddress = await dispatch('web3/getEthTokenAddressByAssetId', { address: item.address }, { root: true })
            accountAsset.externalAddress = externalAddress
          }
          if (accountAsset.externalAddress) {
            const externalBalance = await dispatch('web3/getBalanceByEthAddress', { address: accountAsset.externalAddress }, { root: true })
            accountAsset.externalBalance = externalBalance
          }
        } catch (error) {
          console.error(error)
        }
        return accountAsset
      }))

      commit(types.GET_REGISTERED_ASSETS_SUCCESS, preparedRegisteredAssets)
    } catch (error) {
      console.error(error)
      commit(types.GET_REGISTERED_ASSETS_FAILURE)
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
