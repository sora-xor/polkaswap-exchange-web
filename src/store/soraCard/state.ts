import { ZeroStringValue } from '@/consts';
import type { SoraCardState } from './types';
import { FPNumber } from '@sora-substrate/util';

function initialState(): SoraCardState {
  return {
    euroBalance: ZeroStringValue,
    totalXorBalance: FPNumber.ZERO,
    xorToDeposit: FPNumber.ZERO,
    totalXorBalanceUpdates: null,
  };
}

const state = initialState();

export default state;
