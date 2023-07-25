import { DexId } from '@sora-substrate/util/build/dex/consts';

import { settingsStorage } from '@/utils/storage';

import type { SwapState } from './types';

export function initialState(): SwapState {
  const allowLossPopup = settingsStorage.get('allowSwapLossPopup' as any);

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
    // modals
    allowLossPopup: allowLossPopup ? Boolean(JSON.parse(allowLossPopup)) : true,
  };
}

const state = initialState();

export default state;
