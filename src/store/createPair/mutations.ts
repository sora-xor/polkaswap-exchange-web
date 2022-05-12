import { defineMutations } from 'direct-vuex';
import type { CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

import type { CreatePairState } from './types';

const mutations = defineMutations<CreatePairState>()({
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
  setMinted(state, minted: CodecString): void {
    state.minted = minted;
  },
  setIsAvailable(state, value: boolean): void {
    state.isAvailable = value;
  },
});

export default mutations;
