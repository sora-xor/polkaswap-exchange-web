import { defineMutations } from 'direct-vuex';
import type { Subscription } from 'rxjs';
import type {
  DemeterPool,
  DemeterAccountPool,
  DemeterRewardToken,
} from '@sora-substrate/util/build/demeterFarming/types';

import type { DemeterFarmingState } from './types';

const mutations = defineMutations<DemeterFarmingState>()({
  setPools(state, pools: Array<DemeterPool>): void {
    state.pools = [...pools];
  },
  setPoolsUpdates(state, updates: Subscription): void {
    state.poolsUpdates = updates;
  },
  resetPoolsUpdates(state): void {
    state.poolsUpdates?.unsubscribe();
    state.poolsUpdates = null;
  },

  setTokens(state, tokens: Array<DemeterRewardToken>): void {
    state.tokens = [...tokens];
  },
  setTokensUpdates(state, updates: Subscription): void {
    state.tokensUpdates = updates;
  },
  resetTokensUpdates(state): void {
    state.tokensUpdates?.unsubscribe();
    state.tokensUpdates = null;
  },

  setAccountPools(state, pools: Array<DemeterAccountPool>): void {
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
