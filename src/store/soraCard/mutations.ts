import { defineMutations } from 'direct-vuex';

import { KycStatus, VerificationStatus } from '@/types/card';

import type { SoraCardState } from './types';

const mutations = defineMutations<SoraCardState>()({
  setXorPriceToDeposit(state, xorToDeposit): void {
    state.xorToDeposit = xorToDeposit;
  },
  setEuroBalance(state, euroBalance: string): void {
    state.euroBalance = euroBalance;
  },
  setEuroBalanceLoaded(state, value: boolean): void {
    state.wasEuroBalanceLoaded = value;
  },
  setTotalXorBalance(state, balance): void {
    state.totalXorBalance = balance;
  },
  setTotalXorBalanceUpdates(state, subscription): void {
    state.totalXorBalanceUpdates = subscription;
  },
  resetTotalXorBalanceUpdates(state): void {
    state.totalXorBalanceUpdates?.unsubscribe();
    state.totalXorBalanceUpdates = null;
  },
  setKycStatus(state, status: Nullable<KycStatus>): void {
    state.kycStatus = status;
  },
  setVerificationStatus(state, status: Nullable<VerificationStatus>): void {
    state.verificationStatus = status;
  },
  setPayWingsAuthSdk(state, authLogin: any): void {
    state.authLogin = authLogin;
  },
  setHasKycAttempts(state, hasAttempt: boolean) {
    state.hasFreeAttempts = hasAttempt;
  },
  setWillToPassKycAgain(state, will: boolean) {
    state.wantsToPassKycAgain = will;
  },
  setRejectReason(state, rejectReason: string) {
    state.rejectReason = rejectReason;
  },
});

export default mutations;
