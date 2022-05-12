import type { SwapState } from './types';

export function initialState(): SwapState {
  return {
    tokenFromAddress: '',
    tokenToAddress: '',
    tokenFromBalance: null,
    tokenToBalance: null,
    fromValue: '',
    toValue: '',
    amountWithoutImpact: '',
    isExchangeB: false,
    liquidityProviderFee: '',
    pairLiquiditySources: [],
    paths: {},
    enabledAssets: {},
    rewards: [],
    payload: null,
  };
}

const state = initialState();

export default state;
