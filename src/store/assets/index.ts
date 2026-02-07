import { defineModule } from 'direct-vuex';
import { getActivePinia, type Pinia } from 'pinia';

import { localActionContext, localGetterContext } from '@/store/context';
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

const PINIA_SCOPE_TOKEN = '__PS_ACTIVE_PINIA__';

const resolveActivePinia = (): Pinia | null => {
  return (
    getActivePinia() ??
    ((globalThis as Record<string, unknown> | undefined)?.[PINIA_SCOPE_TOKEN] as Pinia | undefined) ??
    null
  );
};

const getAssetsStore = () => {
  const pinia = resolveActivePinia();

  if (!pinia) {
    console.warn('[assets] Pinia store not ready yet');
    return null;
  }

  try {
    return useAssetsStore(pinia);
  } catch (error) {
    console.warn('[assets] Pinia store not ready yet', error);
    return null;
  }
};

const syncStateFromPinia = (storeState: AssetsState): void => {
  const assetsStore = getAssetsStore();

  if (!assetsStore) return;

  storeState.registeredAssets = Object.freeze({ ...assetsStore.registeredAssets });
  storeState.registeredAssetsFetching = assetsStore.registeredAssetsFetching;
};

const getters = {
  assetDataByAddress:
    (_storeState: AssetsState) =>
    (address?: Nullable<string>): Nullable<RegisteredAccountAsset> => {
      if (!address) return null;

      const assetsStore = getAssetsStore();
      if (!assetsStore) return null;

      return (assetsStore.assetDataByAddress(address) as Nullable<RegisteredAccountAsset>) ?? null;
    },
  whitelistAssets(): Array<Asset> {
    return getAssetsStore()?.whitelistAssets ?? [];
  },
  xor(): Nullable<RegisteredAccountAsset> {
    const assetsStore = getAssetsStore();
    return (assetsStore?.assetDataByAddress(XOR.address) as Nullable<RegisteredAccountAsset>) ?? null;
  },
  registeredAssets: (storeState: AssetsState): AssetsState['registeredAssets'] => storeState.registeredAssets,
  registeredAssetsFetching: (storeState: AssetsState): boolean => storeState.registeredAssetsFetching,
};

const mutations = {
  setRegisteredAssets(storeState: AssetsState, assets: Record<string, BridgeRegisteredAsset> = {}): void {
    const assetsStore = getAssetsStore();
    if (!assetsStore) {
      console.warn('[assets] Skipping legacy registeredAssets sync: Pinia store unavailable');
      return;
    }
    assetsStore.setRegisteredAssets(assets);
    syncStateFromPinia(storeState);
  },
  setRegisteredAssetsFetching(storeState: AssetsState, value: boolean): void {
    const assetsStore = getAssetsStore();
    if (!assetsStore) {
      console.warn('[assets] Skipping legacy registeredAssetsFetching sync: Pinia store unavailable');
      return;
    }
    assetsStore.setRegisteredAssetsFetching(value);
    syncStateFromPinia(storeState);
  },
  reset(storeState: AssetsState): void {
    const assetsStore = getAssetsStore();
    if (!assetsStore) {
      console.warn('[assets] Skipping legacy assets reset: Pinia store unavailable');
      Object.assign(storeState, buildInitialState());
      return;
    }
    assetsStore.reset();
    Object.assign(storeState, buildInitialState());
    syncStateFromPinia(storeState);
  },
};

const actions = {
  async getRegisteredAssets(context): Promise<void> {
    const { state: moduleState } = assetsActionContext(context);
    const assetsStore = getAssetsStore();
    if (!assetsStore) {
      console.warn('[assets] Unable to fetch registered assets: Pinia store unavailable');
      return;
    }

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
    if (!assetsStore) {
      console.warn('[assets] Unable to update registered assets: Pinia store unavailable');
      return;
    }

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
