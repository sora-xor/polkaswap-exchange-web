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
});

export default mutations;
