import map from 'lodash/fp/map'
import flatMap from 'lodash/fp/flatMap'
import fromPairs from 'lodash/fp/fromPairs'
import flow from 'lodash/fp/flow'
import { KnownAssets, KnownSymbols, Asset, RegisteredAccountAsset, isWhitelistAsset } from '@sora-substrate/util'
import { api } from '@soramitsu/soraneo-wallet-web'
import { bridgeApi } from '@/utils/bridge'

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
    assetsLoading: false,
    registeredAssets: [],
    customAssets: []
  }
}

const state = initialState()

const getters = {
  // list of all assets
  assets (state) {
    return state.assets
  },
  whitelistAssets (state, getters, rootState, rootGetters) {
    return state.assets.filter(asset => isWhitelistAsset(asset, rootGetters.whitelist))
  },
  nonWhitelistAssets (state, getters, rootState, rootGetters) {
    return state.assets.filter(asset => !isWhitelistAsset(asset, rootGetters.whitelist))
  },
  nonWhitelistAccountAssets (state, getters, rootState, rootGetters) {
    return rootGetters.accountAssets.filter(asset => !isWhitelistAsset(asset, rootGetters.whitelist))
  },
  tokenXOR (state, getters, rootState, rootGetters) {
    const token = KnownAssets.get(KnownSymbols.XOR)

    return rootGetters['assets/getAssetDataByAddress'](token?.address)
  },
  registeredAssets (state) {
    return state.registeredAssets
  },
  assetsDataTable (state, getters, rootState, rootGetters) {
    const { accountAssetsAddressTable } = rootGetters
    const { assets, registeredAssets } = state

    return assets.reduce((result, asset) => {
      const { externalAddress, externalBalance, externalDecimals } = findAssetInCollection(asset, registeredAssets) || {}
      const { balance } = accountAssetsAddressTable[asset.address] || {}

      const item = {
        ...asset,
        balance,
        externalAddress,
        externalBalance,
        externalDecimals
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
    state.assetsLoading = true
  },
  [types.GET_ASSETS_LIST_SUCCESS] (state, assets: Array<Asset>) {
    state.assets = assets
    state.assetsLoading = false
  },
  [types.GET_ASSETS_LIST_FAILURE] (state) {
    state.assets = []
    state.assetsLoading = false
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
  async getAssets ({ commit, state, rootGetters: { whitelist } }) {
    if (state.assetsLoading) return

    commit(types.GET_ASSETS_LIST_REQUEST)
    try {
      const assets = await api.getAssets(whitelist)

      commit(types.GET_ASSETS_LIST_SUCCESS, assets)
    } catch (error) {
      commit(types.GET_ASSETS_LIST_FAILURE)
    }
  },
  async getRegisteredAssets ({ commit, dispatch }) {
    commit(types.GET_REGISTERED_ASSETS_REQUEST)
    await dispatch('updateRegisteredAssets')
  },
  async updateRegisteredAssets ({ commit, dispatch }) {
    try {
      const registeredAssets = await bridgeApi.getRegisteredAssets()
      const preparedRegisteredAssets = await Promise.all(registeredAssets.map(async item => {
        const accountAsset = { ...item, externalBalance: ZeroStringValue }
        try {
          if (!accountAsset.externalAddress) {
            const externalAddress = await dispatch('web3/getEvmTokenAddressByAssetId', { address: item.address }, { root: true })
            accountAsset.externalAddress = externalAddress
          }
          if (accountAsset.externalAddress) {
            const { value, decimals } = await dispatch('web3/getBalanceByEvmAddress', { address: accountAsset.externalAddress }, { root: true })
            accountAsset.externalBalance = value
            if (!accountAsset.externalDecimals) {
              accountAsset.externalDecimals = decimals
            }
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
