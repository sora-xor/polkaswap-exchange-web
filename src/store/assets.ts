import map from 'lodash/fp/map';
import flatMap from 'lodash/fp/flatMap';
import fromPairs from 'lodash/fp/fromPairs';
import flow from 'lodash/fp/flow';
import { Asset, RegisteredAccountAsset, isWhitelistAsset, XOR } from '@sora-substrate/util';
import { api } from '@soramitsu/soraneo-wallet-web';
import { bridgeApi } from '@/utils/bridge';

import { findAssetInCollection } from '@/utils';
import { ZeroStringValue } from '@/consts';

const DISABLED_ASSETS_FOR_BRIDGE = [
  '0x0083a6b3fbc6edae06f115c8953ddd7cbfba0b74579d6ea190f96853073b76f4', // USDT
  '0x000974185b33df1db9beae5df570d68b8db8b517bb3d5c509eea906a81414c91', // OMG
  '0x00e16b53b05b8a7378f8f3080bef710634f387552b1d1916edc578bda89d49e5', // BAT
  '0x009749fbd2661866f0151e367365b7c5cc4b2c90070b4f745d0bb84f2ffb3b33', // HT
  '0x007d998d3d13fbb74078fb58826e3b7bc154004c9cef6f5bccb27da274f02724', // CHSB
  '0x00d69fbc298e2e27c3deaee4ef0802501e98c338baa11634f08f5c04b9eebdc0', // cUSDC
];

const types = flow(
  flatMap((x) => [x + '_REQUEST', x + '_SUCCESS', x + '_FAILURE']),
  map((x) => [x, x]),
  fromPairs
)(['GET_ASSETS_LIST', 'GET_ASSET', 'GET_ACCOUNT_ASSETS', 'GET_REGISTERED_ASSETS']);

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
  tokenXOR(state, getters, rootState, rootGetters) {
    return rootGetters['assets/getAssetDataByAddress'](XOR.address);
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

  [types.GET_REGISTERED_ASSETS_REQUEST](state) {
    state.registeredAssets = [];
  },
  [types.GET_REGISTERED_ASSETS_SUCCESS](state, registeredAssets: Array<RegisteredAccountAsset>) {
    state.registeredAssets = registeredAssets;
  },
  [types.GET_REGISTERED_ASSETS_FAILURE](state) {
    state.registeredAssets = [];
  },
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
  async getRegisteredAssets({ commit, dispatch }) {
    commit(types.GET_REGISTERED_ASSETS_REQUEST);
    await dispatch('updateRegisteredAssets');
  },
  async updateRegisteredAssets({ commit, dispatch }) {
    try {
      const registeredAssets = await bridgeApi.getRegisteredAssets();
      const enabledRegisteredAssets = registeredAssets.filter(
        (item) => !DISABLED_ASSETS_FOR_BRIDGE.includes(item.address)
      );
      const preparedRegisteredAssets = await Promise.all(
        enabledRegisteredAssets.map(async (item) => {
          const accountAsset = { ...item, externalBalance: ZeroStringValue };
          try {
            if (!accountAsset.externalAddress) {
              const externalAddress = await dispatch(
                'web3/getEvmTokenAddressByAssetId',
                { address: item.address },
                { root: true }
              );
              accountAsset.externalAddress = externalAddress;
            }
            if (accountAsset.externalAddress) {
              const { value, decimals } = await dispatch(
                'web3/getBalanceByEvmAddress',
                { address: accountAsset.externalAddress },
                { root: true }
              );
              accountAsset.externalBalance = value;
              if (!accountAsset.externalDecimals) {
                accountAsset.externalDecimals = decimals;
              }
            }
          } catch (error) {
            console.error(error);
          }
          return accountAsset;
        })
      );

      commit(types.GET_REGISTERED_ASSETS_SUCCESS, preparedRegisteredAssets);
    } catch (error) {
      console.error(error);
      commit(types.GET_REGISTERED_ASSETS_FAILURE);
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
