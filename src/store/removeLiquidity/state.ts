import { ZeroStringValue } from '@/consts';
import type { RemoveLiquidityState } from './types';

function initialState(): RemoveLiquidityState {
  return {
    firstTokenAddress: '',
    secondTokenAddress: '',
    removePart: 0,
    liquidityAmount: '',
    firstTokenAmount: '',
    secondTokenAmount: '',
    focusedField: null,
    reserveA: ZeroStringValue,
    reserveB: ZeroStringValue,
    totalSupply: ZeroStringValue,
  };
}

const state = initialState();

export default state;
