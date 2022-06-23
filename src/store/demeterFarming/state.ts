import type { DemeterFarmingState } from './types';

function initialState(): DemeterFarmingState {
  return {
    pools: [],
    poolsUpdates: null,
    tokens: [],
    tokensUpdates: null,
    accountPools: [],
    accountPoolsUpdates: null,
  };
}

const state = initialState();

export default state;
