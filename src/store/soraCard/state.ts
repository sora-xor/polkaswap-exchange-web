import { FPNumber } from '@sora-substrate/sdk';

import { ZeroStringValue } from '@/consts';

import type { SoraCardState } from './types';

function initialState(): SoraCardState {
  return {
    kycStatus: undefined,
    verificationStatus: undefined,
    euroBalance: ZeroStringValue,
    wasEuroBalanceLoaded: false,
    totalXorBalance: FPNumber.ZERO,
    xorToDeposit: FPNumber.ZERO,
    totalXorBalanceUpdates: null,
    referenceNumber: null,
    authLogin: null,
    attemptCounter: {
      hasFreeAttempts: null,
      freeAttemptsLeft: null,
      totalFreeAttempts: null,
    },
    wantsToPassKycAgain: false,
    rejectReasons: [],
    userInfo: {
      iban: null,
      availableBalance: null,
    },
    fees: {
      application: null,
      retry: null,
    },
  };
}

const state = initialState();

export default state;
