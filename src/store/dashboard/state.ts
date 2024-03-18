import type { DashboardState } from './types';

function initialState(): DashboardState {
  return {
    ownedAssetIds: [],
    ownedAssetIdsInterval: null,
  };
}

const state = initialState();

export default state;
