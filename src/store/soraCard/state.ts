import { FPNumber } from '@sora-substrate/util';

import { ZeroStringValue } from '@/consts';

import type { SoraCardState } from './types';

function initialState(): SoraCardState {
  return {
    kycAttemptCost: '3.80',
    kycStatus: undefined,
    verificationStatus: undefined,
    euroBalance: ZeroStringValue,
    wasEuroBalanceLoaded: false,
    totalXorBalance: FPNumber.ZERO,
    xorToDeposit: FPNumber.ZERO,
    totalXorBalanceUpdates: null,
    authLogin: null,
    attemptCounter: {
      hasFreeAttempts: null,
      freeAttemptsLeft: null,
      totalFreeAttempts: null,
    },
    wantsToPassKycAgain: false,
    rejectReason: null,
    userInfo: {
      iban: null,
    },
  };
}

const state = initialState();

export default state;
