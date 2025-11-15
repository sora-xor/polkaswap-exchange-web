import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store';
import { Module } from '@/store/consts';
import { useAssetsStore } from '@/stores/assets';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';

import type { Asset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Nullable } from '@/types/common';

import type { AssetsState, BridgeRegisteredAsset } from './types';

const buildInitialState = (): AssetsState => ({
  registeredAssets: {},
  registeredAssetsFetching: false,
});

const state: AssetsState = buildInitialState();

const getAssetsStore = () => useAssetsStore();

const syncStateFromPinia = (storeState: AssetsState): void => {
  const assetsStore = getAssetsStore();

  storeState.registeredAssets = Object.freeze({ ...assetsStore.registeredAssets });
  storeState.registeredAssetsFetching = assetsStore.registeredAssetsFetching;
};

const getters = {
  assetDataByAddress:
    (_storeState: AssetsState) =>
    (address?: Nullable<string>): Nullable<RegisteredAccountAsset> => {
      if (!address) return null;

      return (getAssetsStore().assetDataByAddress(address) as Nullable<RegisteredAccountAsset>) ?? null;
    },
  whitelistAssets(): Array<Asset> {
    return getAssetsStore().whitelistAssets;
  },
  xor(): Nullable<RegisteredAccountAsset> {
    return (getAssetsStore().assetDataByAddress(XOR.address) as Nullable<RegisteredAccountAsset>) ?? null;
  },
  registeredAssets: (storeState: AssetsState): AssetsState['registeredAssets'] => storeState.registeredAssets,
  registeredAssetsFetching: (storeState: AssetsState): boolean => storeState.registeredAssetsFetching,
};

const mutations = {
  setRegisteredAssets(storeState: AssetsState, assets: Record<string, BridgeRegisteredAsset> = {}): void {
    const assetsStore = getAssetsStore();
    assetsStore.setRegisteredAssets(assets);
    syncStateFromPinia(storeState);
  },
  setRegisteredAssetsFetching(storeState: AssetsState, value: boolean): void {
    const assetsStore = getAssetsStore();
    assetsStore.setRegisteredAssetsFetching(value);
    syncStateFromPinia(storeState);
  },
  reset(storeState: AssetsState): void {
    const assetsStore = getAssetsStore();
    assetsStore.reset();
    Object.assign(storeState, buildInitialState());
    syncStateFromPinia(storeState);
  },
};

const actions = {
  async getRegisteredAssets(context): Promise<void> {
    const { state: moduleState } = assetsActionContext(context);
    const assetsStore = getAssetsStore();

    assetsStore.setRegisteredAssetsFetching(true);
    syncStateFromPinia(moduleState);

    try {
      await assetsStore.getRegisteredAssets();
    } finally {
      syncStateFromPinia(moduleState);
    }
  },
  async updateRegisteredAssets(context, assets?: Record<string, BridgeRegisteredAsset>): Promise<void> {
    const { state: moduleState } = assetsActionContext(context);
    const assetsStore = getAssetsStore();

    if (assets) {
      assetsStore.setRegisteredAssets(assets);
      syncStateFromPinia(moduleState);
    }

    assetsStore.setRegisteredAssetsFetching(true);
    syncStateFromPinia(moduleState);

    try {
      await assetsStore.updateRegisteredAssets();
    } finally {
      syncStateFromPinia(moduleState);
    }
  },
};

const assets = defineModule({
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
});

const assetsGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.Assets, assets);
const assetsActionContext = (context: any) => localActionContext(context, Module.Assets, assets);

export { assetsGetterContext, assetsActionContext };
export default assets;
