import { defineMutations } from 'direct-vuex';

import type { DashboardState } from './types';

const mutations = defineMutations<DashboardState>()({
  setOwnedAssetIds(state, ids: Array<string>): void {
    state.ownedAssetIds = ids;
  },
  resetOwnedAssetIds(state): void {
    state.ownedAssetIds = [];
  },
  setOwnedAssetIdsInterval(state, interval: ReturnType<typeof setInterval>): void {
    state.ownedAssetIdsInterval = interval;
  },
  resetOwnedAssetIdsInterval(state): void {
    if (state.ownedAssetIdsInterval) {
      clearInterval(state.ownedAssetIdsInterval);
    }
    state.ownedAssetIdsInterval = null;
  },
});

export default mutations;
