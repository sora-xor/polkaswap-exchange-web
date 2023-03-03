import { ZeroStringValue } from '@/consts';
import type { SoraCardState } from './types';
import { FPNumber } from '@sora-substrate/util';

function initialState(): SoraCardState {
  return {
    kycStatus: undefined,
    verificationStatus: undefined,
    euroBalance: ZeroStringValue,
    wasEuroBalanceLoaded: false,
    totalXorBalance: FPNumber.ZERO,
    xorToDeposit: FPNumber.ZERO,
    totalXorBalanceUpdates: null,
    authLogin: null,
  };
}

const state = initialState();

export default state;
