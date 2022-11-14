import { ZeroStringValue } from '@/consts';
import type { PriceState } from './types';
import { FPNumber } from '@sora-substrate/util';

function initialState(): PriceState {
  return {
    price: ZeroStringValue,
    priceReversed: ZeroStringValue,
    euroBalance: ZeroStringValue,
    totalXorBalance: FPNumber.ZERO,
    xorToDeposit: FPNumber.ZERO,
    totalXorBalanceUpdates: null,
  };
}

const state = initialState();

export default state;
