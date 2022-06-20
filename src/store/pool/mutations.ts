import { defineMutations } from 'direct-vuex';
import type { Subscription } from '@polkadot/x-rxjs';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

import type { PoolState } from './types';

const mutations = defineMutations<PoolState>()({
  setAccountLiquidityList(state, subscription: Subscription): void {
    state.accountLiquidityList = subscription;
  },
  resetAccountLiquidityList(state): void {
    state.accountLiquidityList?.unsubscribe();
    state.accountLiquidityList = null;
  },
  setAccountLiquidityUpdates(state, subscription: Subscription): void {
    state.accountLiquidityUpdates = subscription;
  },
  resetAccountLiquidityUpdates(state): void {
    state.accountLiquidityUpdates?.unsubscribe();
    state.accountLiquidityUpdates = null;
  },
  setAccountLiquidity(state, liquidity: Array<AccountLiquidity>): void {
    state.accountLiquidity = [...liquidity]; // update vuex state by creating new copy of array
  },
  resetAccountLiquidity(state): void {
    state.accountLiquidity = [];
  },
});

export default mutations;
