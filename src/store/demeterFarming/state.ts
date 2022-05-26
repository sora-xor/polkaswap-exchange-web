import type { DemeterFarmingState } from './types';

function initialState(): DemeterFarmingState {
  return {
    pools: [],
    tokens: [],
    accountPools: [],
    accountPoolsUpdates: null,
  };
}

const state = initialState();

export default state;
