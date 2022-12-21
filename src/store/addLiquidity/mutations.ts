import { defineMutations } from 'direct-vuex';
import type { Subscription } from 'rxjs';
import type { CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

import type { AddLiquidityState, FocusedField } from './types';

const mutations = defineMutations<AddLiquidityState>()({
  setFocusedField(state, value: FocusedField): void {
    state.focusedField = value;
  },
  setFirstTokenAddress(state, value?: Nullable<string>): void {
    state.firstTokenAddress = value || '';
  },
  setSecondTokenAddress(state, value?: Nullable<string>): void {
    state.secondTokenAddress = value || '';
  },
  setFirstTokenValue(state, value?: Nullable<string>): void {
    state.firstTokenValue = value || '';
  },
  setSecondTokenValue(state, value?: Nullable<string>): void {
    state.secondTokenValue = value || '';
  },
  setFirstTokenBalance(state, balance?: Nullable<AccountBalance>): void {
    state.firstTokenBalance = balance ?? null;
  },
  setSecondTokenBalance(state, balance?: Nullable<AccountBalance>): void {
    state.secondTokenBalance = balance ?? null;
  },
  setReserve(state, reserve?: Nullable<Array<CodecString>>): void {
    state.reserve = reserve;
  },
  setReserveSubscription(state, subscription: Subscription): void {
    state.reserveSubscription = subscription;
  },
  resetReserveSubscription(state): void {
    state.reserveSubscription?.unsubscribe();
    state.reserveSubscription = null;
  },
  setAvailability(state, value: boolean): void {
    state.isAvailable = value;
  },
  setAvailabilitySubscription(state, subscription: Subscription): void {
    state.availabilitySubscription = subscription;
  },
  resetAvailabilitySubscription(state): void {
    state.availabilitySubscription?.unsubscribe();
    state.availabilitySubscription = null;
  },
  setTotalSupply(state, totalSupply: CodecString) {
    state.totalSupply = totalSupply;
  },
  setTotalSupplySubscription(state, subscription: Subscription): void {
    state.totalSupplySubscription = subscription;
  },
  resetTotalSupplySubscription(state): void {
    state.totalSupplySubscription?.unsubscribe();
    state.totalSupplySubscription = null;
  },
});

export default mutations;
