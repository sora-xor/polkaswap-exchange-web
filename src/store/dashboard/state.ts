import type { DashboardState } from './types';

function initialState(): DashboardState {
  return {
    selectedOwnedAsset: null,
  };
}

const state = initialState();

export default state;
