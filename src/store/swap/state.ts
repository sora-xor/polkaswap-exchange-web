import { DexId } from '@sora-substrate/util/build/poolXyk/consts';
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
    liquidityProviderFee: '',
    isExchangeB: false,
    enabledAssets: {},
    rewards: [],
    selectedDexId: DexId.XOR,
    dexQuoteData: {
      [DexId.XOR]: {
        pairLiquiditySources: [],
        paths: {},
        payload: null,
      },
      [DexId.XSTUSD]: {
        pairLiquiditySources: [],
        paths: {},
        payload: null,
      },
    },
  };
}

const state = initialState();

export default state;
