import type { RemoveLiquidityState } from './types';

function initialState(): RemoveLiquidityState {
  return {
    firstTokenAddress: '',
    secondTokenAddress: '',
    removePart: '',
    liquidityAmount: '',
    firstTokenAmount: '',
    secondTokenAmount: '',
    focusedField: null,
  };
}

const state = initialState();

export default state;
