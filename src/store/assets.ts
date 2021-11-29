import map from 'lodash/fp/map';
import flatMap from 'lodash/fp/flatMap';
import fromPairs from 'lodash/fp/fromPairs';
import flow from 'lodash/fp/flow';
import { KnownAssets, KnownSymbols, Asset, isWhitelistAsset } from '@sora-substrate/util';
import { api } from '@soramitsu/soraneo-wallet-web';

import { findAssetInCollection } from '@/utils';

const types = flow(
  flatMap((x) => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  map((x) => [x, x]),
  fromPairs
)(['GET_ASSETS_LIST', 'GET_ASSET', 'GET_ACCOUNT_ASSETS']);

function initialState() {
  return {
    assets: [],
    registeredAssets: [],
    customAssets: [],
  };
}

const state = initialState();

const getters = {
  // list of all assets
  assets(state) {
    return state.assets;
  },
  whitelistAssets(state, getters, rootState, rootGetters) {
    return state.assets.filter((asset) => isWhitelistAsset(asset, rootGetters.whitelist));
  },
  nonWhitelistAssets(state, getters, rootState, rootGetters) {
    return state.assets.filter((asset) => !isWhitelistAsset(asset, rootGetters.whitelist));
  },
  nonWhitelistAccountAssets(state, getters, rootState, rootGetters) {
    return rootGetters.accountAssets.filter((asset) => !isWhitelistAsset(asset, rootGetters.whitelist));
  },
  registeredAssets(state) {
    return state.registeredAssets;
  },
  assetsDataTable(state, getters, rootState, rootGetters) {
    const { accountAssetsAddressTable } = rootGetters;
    const { assets, registeredAssets } = state;

    return assets.reduce((result, asset) => {
      const { externalAddress, externalBalance, externalDecimals } =
        findAssetInCollection(asset, registeredAssets) || {};
      const { balance } = accountAssetsAddressTable[asset.address] || {};

      const item = {
        ...asset,
        balance,
        externalAddress,
        externalBalance,
        externalDecimals,
      };

      return {
        ...result,
        [asset.address]: item,
      };
    }, {});
  },
  getAssetDataByAddress(state, getters) {
    return (address?: string) => {
      if (!address) return undefined;

      return getters.assetsDataTable[address];
    };
  },
};

const mutations = {
  [types.GET_ASSETS_LIST_REQUEST](state) {
    state.assets = [];
  },
  [types.GET_ASSETS_LIST_SUCCESS](state, assets: Array<Asset>) {
    state.assets = assets;
  },
  [types.GET_ASSETS_LIST_FAILURE](state) {
    state.assets = [];
  },

  [types.GET_ASSET_REQUEST](state) {},
  [types.GET_ASSET_SUCCESS](state) {},
  [types.GET_ASSET_FAILURE](state) {},
};

const actions = {
  async getAssets({ commit, rootGetters: { whitelist } }) {
    commit(types.GET_ASSETS_LIST_REQUEST);
    try {
      const assets = await api.getAssets(whitelist);

      commit(types.GET_ASSETS_LIST_SUCCESS, assets);
    } catch (error) {
      commit(types.GET_ASSETS_LIST_FAILURE);
    }
  },
  async getAsset({ commit }, { address }) {
    commit(types.GET_ASSET_REQUEST);
    try {
      const assets = await api.getAssets();
      const asset = assets.find((asset) => asset.address === address);
      commit(types.GET_ASSET_SUCCESS);
      return asset;
    } catch (error) {
      commit(types.GET_ASSET_FAILURE);
    }
  },
};

export default {
  namespaced: true,
  types,
  state,
  getters,
  mutations,
  actions,
};
