import { defineMutations } from 'direct-vuex';

import { ZeroStringValue } from '@/consts';
import type { PriceState } from './types';

const mutations = defineMutations<PriceState>()({
  setPrices(state, params: Partial<PriceState>): void {
    state.price = params.price;
    state.priceReversed = params.priceReversed;
  },
  resetPrices(state): void {
    state.price = ZeroStringValue;
    state.priceReversed = ZeroStringValue;
  },
  setXorPriceToDeposit(state, xorToDeposit): void {
    state.xorToDeposit = xorToDeposit;
  },
  setEuroBalance(state, euroBalance: string) {
    state.euroBalance = euroBalance;
  },
  setTotalXorBalance(state, balance) {
    state.totalXorBalance = balance;
  },
  setTotalXorBalanceUpdates(state, subscription) {
    state.totalXorBalanceUpdates = subscription;
  },
  resetTotalXorBalanceUpdates(state) {
    state.totalXorBalanceUpdates?.unsubscribe();
    state.totalXorBalanceUpdates = null;
  },
});

export default mutations;
