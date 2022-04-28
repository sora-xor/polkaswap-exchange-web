import type { CreatePairState } from './types';

function initialState(): CreatePairState {
  return {
    firstTokenAddress: '',
    secondTokenAddress: '',
    firstTokenValue: '',
    secondTokenValue: '',
    secondTokenBalance: null,
    minted: '',
    isAvailable: false,
  };
}

const state = initialState();

export default state;
