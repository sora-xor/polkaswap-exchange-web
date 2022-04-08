import { defineMutations } from 'direct-vuex';
import type { CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

import { ZeroStringValue } from '@/consts';
import type { AddLiquidityState, FocusedField } from './types';

const mutations = defineMutations<AddLiquidityState>()({
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
  setSecondTokenBalance(state, balance?: Nullable<AccountBalance>): void {
    state.secondTokenBalance = balance ?? null;
  },
  setReserve(state, reserve?: Nullable<Array<CodecString>>): void {
    state.reserve = reserve;
  },
  setMintedAndSupply(state, { minted, pts }: { minted: CodecString; pts: CodecString }): void {
    state.minted = minted;
    state.totalSupply = pts;
  },
  resetMintedAndSupply(state): void {
    state.minted = ZeroStringValue;
    state.totalSupply = ZeroStringValue;
  },
  setVocusedField(state, value: FocusedField): void {
    state.focusedField = value;
  },
  resetVocusedField(state): void {
    state.focusedField = null;
  },
  setIsAvailable(state, value: boolean): void {
    state.isAvailable = value;
  },
});

export default mutations;
