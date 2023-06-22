import { defineMutations } from 'direct-vuex';

import type { AssetsState, BridgeAccountAsset } from './types';

const mutations = defineMutations<AssetsState>()({
  setRegisteredAssetsFetching(state, value: boolean): void {
    state.registeredAssetsFetching = value;
  },
  setRegisteredAssets(state, assets: Record<string, BridgeAccountAsset>): void {
    state.registeredAssets = assets;
    state.registeredAssetsFetching = false;
  },
  resetRegisteredAssets(state): void {
    state.registeredAssets = {};
    state.registeredAssetsFetching = false;
  },
  setRegisteredAssetsBalancesUpdating(state, flag = false): void {
    state.registeredAssetsBalancesUpdating = flag;
  },
});

export default mutations;
