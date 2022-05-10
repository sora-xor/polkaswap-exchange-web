import map from 'lodash/fp/map';
import flatMap from 'lodash/fp/flatMap';
import fromPairs from 'lodash/fp/fromPairs';
import flow from 'lodash/fp/flow';
import { api } from '@soramitsu/soraneo-wallet-web';
import type { Asset } from '@sora-substrate/util/build/assets/types';

const types = flow(
  flatMap((x) => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  map((x) => [x, x]),
  fromPairs
)(['GET_ASSETS_LIST', 'GET_ASSET', 'GET_ACCOUNT_ASSETS']);

function initialState() {
  return {
    assets: [],
    customAssets: [],
  };
}

const state = initialState();

const getters = {
  assetsDataTable(state, rootGetters) {
    const { accountAssetsAddressTable } = rootGetters;
    const { assets } = state;

    return assets.reduce((result, asset) => {
      const { balance } = accountAssetsAddressTable[asset.address] || {};

      const item = {
        ...asset,
        balance,
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

export default {
  namespaced: true,
  types,
  state,
  getters,
  mutations,
};
