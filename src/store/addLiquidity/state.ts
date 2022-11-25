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
    reserve: null,
    reserveSubscription: null,
    minted: ZeroStringValue,
    totalSupply: ZeroStringValue,
    focusedField: null,
    isAvailable: false,
  };
}

const state = initialState();

export default state;
