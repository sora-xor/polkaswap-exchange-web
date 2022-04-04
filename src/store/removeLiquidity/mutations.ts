import { defineMutations } from 'direct-vuex';
import type { CodecString } from '@sora-substrate/util';

import { ZeroStringValue } from '@/consts';
import type { RemoveLiquidityState } from './types';

const mutations = defineMutations<RemoveLiquidityState>()({
  setAddresses(state, { firstAddress, secondAddress }: { firstAddress: string; secondAddress: string }): void {
    state.firstTokenAddress = firstAddress;
    state.secondTokenAddress = secondAddress;
  },
  setRemovePart(state, value?: Nullable<number>): void {
    state.removePart = value || 0;
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
  setTotalSupply(state, value?: Nullable<CodecString>): void {
    state.totalSupply = value || ZeroStringValue;
  },
  setLiquidityReserves(state, { reserveA, reserveB }: { reserveA: CodecString; reserveB: CodecString }): void {
    state.reserveA = reserveA;
    state.reserveB = reserveB;
  },
  setFocusedField(state, value?: Nullable<string>): void {
    state.focusedField = value || '';
  },
});

export default mutations;
