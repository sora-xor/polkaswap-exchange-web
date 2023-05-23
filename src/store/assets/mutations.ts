import { defineMutations } from 'direct-vuex';

import type { AssetsState, EvmAccountAsset } from './types';

const mutations = defineMutations<AssetsState>()({
  setRegisteredAssetsFetching(state, value: boolean): void {
    state.registeredAssetsFetching = value;
  },
  setRegisteredAssets(state, assets: Record<string, EvmAccountAsset>): void {
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
