import { defineMutations } from 'direct-vuex';

import type { OwnedAsset } from '@/modules/dashboard/types';

import type { DashboardState } from './types';

const mutations = defineMutations<DashboardState>()({
  setSelectedOwnedAsset(state, value: OwnedAsset): void {
    state.selectedOwnedAsset = value;
  },
  resetSelectedOwnedAsset(state): void {
    state.selectedOwnedAsset = null;
  },
});

export default mutations;
