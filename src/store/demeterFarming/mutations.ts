import { defineMutations } from 'direct-vuex';
import type { Subscription } from '@polkadot/x-rxjs';

import type { DemeterFarmingState, DemeterPool, DemeterRewardToken } from './types';

const mutations = defineMutations<DemeterFarmingState>()({
  setPools(state, pools: Array<DemeterPool>): void {
    state.pools = [...pools];
  },
  setTokens(state, tokens: Array<DemeterRewardToken>): void {
    state.tokens = [...tokens];
  },
  setAccountPools(state, pools): void {
    state.accountPools = [...pools];
  },
  setAccountPoolsUpdates(state, updates: Subscription): void {
    state.accountPoolsUpdates = updates;
  },
  resetAccountPoolsUpdates(state): void {
    state.accountPoolsUpdates?.unsubscribe();
    state.accountPoolsUpdates = null;
  },
});

export default mutations;
