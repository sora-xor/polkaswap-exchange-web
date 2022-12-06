import { defineMutations } from 'direct-vuex';
import type { CodecString } from '@sora-substrate/util';

import { ZeroStringValue } from '@/consts';
import type { FocusedField, RemoveLiquidityState } from './types';

const mutations = defineMutations<RemoveLiquidityState>()({
  setAddresses(state, { firstAddress, secondAddress }: { firstAddress: string; secondAddress: string }): void {
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
