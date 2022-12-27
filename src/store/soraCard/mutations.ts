import { KycStatus, VerificationStatus } from '@/types/card';
import { defineMutations } from 'direct-vuex';

import type { SoraCardState } from './types';

const mutations = defineMutations<SoraCardState>()({
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
  setKycStatus(state, status: KycStatus | undefined) {
    state.kycStatus = status;
  },
  setVerificationStatus(state, status: VerificationStatus | undefined) {
    state.verificationStatus = status;
  },
});

export default mutations;
