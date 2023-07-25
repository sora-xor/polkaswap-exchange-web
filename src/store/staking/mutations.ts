import { defineMutations } from 'direct-vuex';

import type { StakingAccountPool, StakingPool, StakingRewardToken, StakingState } from './types';
import type { Subscription } from 'rxjs';

const mutations = defineMutations<StakingState>()({
  setPools(state, pools: Array<StakingPool>): void {
    state.pools = Object.freeze([...pools]);
  },
  setPoolsUpdates(state, updates: Subscription): void {
    state.poolsUpdates = updates;
  },
  resetPoolsUpdates(state): void {
    state.poolsUpdates?.unsubscribe();
    state.poolsUpdates = null;
  },

  // setTokens(state, tokens: Array<StakingRewardToken>): void {
  //   state.tokens = Object.freeze([...tokens]);
  // },
  // setTokensUpdates(state, updates: Subscription): void {
  //   state.tokensUpdates = updates;
  // },
  // resetTokensUpdates(state): void {
  //   state.tokensUpdates?.unsubscribe();
  //   state.tokensUpdates = null;
  // },

  // setAccountPools(state, pools: Array<StakingAccountPool>): void {
  //   state.accountPools = Object.freeze([...pools]);
  // },
  // setAccountPoolsUpdates(state, updates: Subscription): void {
  //   state.accountPoolsUpdates = updates;
  // },
  // resetAccountPoolsUpdates(state): void {
  //   state.accountPoolsUpdates?.unsubscribe();
  //   state.accountPoolsUpdates = null;
  // },
});

export default mutations;
