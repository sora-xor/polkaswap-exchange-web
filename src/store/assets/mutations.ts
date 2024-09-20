import { defineMutations } from 'direct-vuex';

import { settingsStorage } from '@/utils/storage';

import type { AssetsState, BridgeRegisteredAsset } from './types';

const mutations = defineMutations<AssetsState>()({
  setRegisteredAssetsFetching(state, value: boolean): void {
    state.registeredAssetsFetching = value;
  },
  setRegisteredAssets(state, assets: Record<string, BridgeRegisteredAsset> = {}): void {
    state.registeredAssets = Object.freeze({ ...assets });
  },
  loadPinnedAssetsAddresses(state): void {
    const pinnedAssetsAddressesStr = settingsStorage.get('pinnedAssets');
    try {
      const parsed = JSON.parse(pinnedAssetsAddressesStr);
      if (Array.isArray(parsed)) {
        state.pinnedAssetsAddresses = parsed;
      } else {
        state.pinnedAssetsAddresses = [];
      }
    } catch (e) {
      state.pinnedAssetsAddresses = [];
    }
  },
  setPinnedAsset(state, assetAddress: string): void {
    if (!state.pinnedAssetsAddresses.includes(assetAddress)) {
      state.pinnedAssetsAddresses.push(assetAddress);
      settingsStorage.set('pinnedAssets', JSON.stringify(state.pinnedAssetsAddresses));
    }
  },

  removePinnedAsset(state, assetAddress: string): void {
    state.pinnedAssetsAddresses = state.pinnedAssetsAddresses.filter((address) => address !== assetAddress);
    settingsStorage.set('pinnedAssets', JSON.stringify(state.pinnedAssetsAddresses));
  },
});

export default mutations;
