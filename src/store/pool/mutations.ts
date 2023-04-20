import { defineMutations } from 'direct-vuex';
import type { Subscription } from 'rxjs';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { AccountLockedPool } from '@sora-substrate/util/build/ceresLiquidityLocker/types';
import type { PoolApyObject } from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';

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
    state.accountLiquidity = Object.freeze([...liquidity]); // update vuex state by creating new copy of array
  },
  resetAccountLiquidity(state): void {
    state.accountLiquidity = [];
  },
  setAccountLockedLiquidity(state, lockedLiquidity: AccountLockedPool[]): void {
    state.accountLockedLiquidity = Object.freeze([...lockedLiquidity]); // update vuex state by creating new copy of array
  },
  setAccountLockedLiquidityUpdates(state, subscription: Subscription): void {
    state.accountLockedLiquiditySubscription = subscription;
  },
  resetAccountLockedLiquidityUpdates(state): void {
    state.accountLockedLiquiditySubscription?.unsubscribe();
    state.accountLockedLiquiditySubscription = null;
  },
  setPoolApyObject(state, object: PoolApyObject): void {
    state.poolApyObject = Object.freeze({ ...object });
  },
  resetPoolApyObject(state): void {
    state.poolApyObject = {};
  },
  updatePoolApyObject(state, poolApyObject: PoolApyObject): void {
    state.poolApyObject = Object.freeze({ ...state.poolApyObject, ...poolApyObject });
  },
  setPoolApySubscription(state, subscription: VoidFunction): void {
    state.poolApySubscription = subscription;
  },
  resetPoolApySubscription(state): void {
    state.poolApySubscription?.();
    state.poolApySubscription = null;
  },
});

export default mutations;
