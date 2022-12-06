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
    minted: ZeroStringValue,
    // pool reserves
    reserve: null,
    reserveSubscription: null,
    // pool lp tokens
    totalSupply: ZeroStringValue,
    totalSupplySubscription: null,
    // pool availability
    isAvailable: false,
    availabilitySubscription: null,
  };
}

const state = initialState();

export default state;
