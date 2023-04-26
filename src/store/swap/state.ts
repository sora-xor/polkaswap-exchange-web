import { DexId } from '@sora-substrate/util/build/dex/consts';
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
    enabledAssets: {
      tbc: [],
      xst: {},
      lockedSources: [],
    },
    rewards: [],
    route: [],
    selectedDexId: DexId.XOR,
    dexQuoteData: {},
  };
}

const state = initialState();

export default state;
