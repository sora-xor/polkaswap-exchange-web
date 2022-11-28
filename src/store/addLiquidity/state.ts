import { ZeroStringValue } from '@/consts';
import type { AddLiquidityState } from './types';

function initialState(): AddLiquidityState {
  return {
    firstTokenAddress: '',
    secondTokenAddress: '',
    firstTokenValue: '',
    secondTokenValue: '',
    firstTokenBalance: null,
    secondTokenBalance: null,
    focusedField: null,
    // pool reserves
    reserve: null,
    reserveSubscription: null,
    // pool lp tokens
    minted: ZeroStringValue,
    totalSupply: ZeroStringValue,
    // pool availability
    isAvailable: false,
    availabilitySubscription: null,
  };
}

const state = initialState();

export default state;
