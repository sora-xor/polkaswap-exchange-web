import { defineMutations } from 'direct-vuex';

import type { LiquidityParams } from '@/store/pool/types';

import type { FocusedField, RemoveLiquidityState } from './types';

const mutations = defineMutations<RemoveLiquidityState>()({
  setAddresses(state, { firstAddress, secondAddress }: LiquidityParams): void {
    state.firstTokenAddress = firstAddress;
    state.secondTokenAddress = secondAddress;
  },
  setRemovePart(state, value?: Nullable<string>): void {
    state.removePart = value || '';
  },
  setLiquidityAmount(state, value?: Nullable<string>): void {
    state.liquidityAmount = value || '';
  },
  setFirstTokenAmount(state, value?: Nullable<string>): void {
    state.firstTokenAmount = value || '';
  },
  setSecondTokenAmount(state, value?: Nullable<string>): void {
    state.secondTokenAmount = value || '';
  },
  setFocusedField(state, value: Nullable<FocusedField>): void {
    state.focusedField = value;
  },
  resetFocusedField(state): void {
    state.focusedField = null;
  },
});

export default mutations;
