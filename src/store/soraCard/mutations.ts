import { defineMutations } from 'direct-vuex';

import { AttemptCounter, KycStatus, VerificationStatus, Fees } from '@/types/card';

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
  setAttempts(state, attemptCounter: AttemptCounter) {
    state.attemptCounter.hasFreeAttempts = attemptCounter.hasFreeAttempts;
    state.attemptCounter.freeAttemptsLeft = attemptCounter.freeAttemptsLeft;
    state.attemptCounter.totalFreeAttempts = attemptCounter.totalFreeAttempts;
  },
  setFees(state, fees: Fees) {
    state.fees.application = fees.application;
    state.fees.retry = fees.retry;
  },
  setWillToPassKycAgain(state, will: boolean) {
    state.wantsToPassKycAgain = will;
  },
  setRejectReason(state, rejectReasons: Array<string>) {
    state.rejectReasons = rejectReasons;
  },
  setUserIban(state, iban: Nullable<string>) {
    state.userInfo.iban = iban;
  },
  setUserBalance(state, balance: Nullable<number>) {
    state.userInfo.availableBalance = balance;
  },
  setReferenceNumber(state, referenceNumber: Nullable<string>) {
    state.referenceNumber = referenceNumber;
  },
});

export default mutations;
