import { defineMutations } from 'direct-vuex';

import type { AssetsState, BridgeRegisteredAsset } from './types';

const mutations = defineMutations<AssetsState>()({
  setRegisteredAssetsFetching(state, value: boolean): void {
    state.registeredAssetsFetching = value;
  },
  setRegisteredAssets(state, assets: Record<string, BridgeRegisteredAsset>): void {
    state.registeredAssets = assets;
    state.registeredAssetsFetching = false;
  },
  resetRegisteredAssets(state): void {
    state.registeredAssets = {};
    state.registeredAssetsFetching = false;
  },
});

export default mutations;
