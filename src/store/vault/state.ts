import { FPNumber } from '@sora-substrate/math';
import { XOR, DAI } from '@sora-substrate/util/build/assets/consts';

import type { VaultState } from './types';

export const defaultAverageCollateralPrices: Record<string, Nullable<FPNumber>> = {
  [DAI.address]: FPNumber.ONE,
};

function initialState(): VaultState {
  return {
    collaterals: {},
    collateralsInterval: null,
    accountVaultIdsSubscription: null,
    accountVaults: [],
    accountVaultsSubscription: null,
    collateralAddress: XOR.address,
    collateralTokenBalance: null,
    kusdTokenBalance: null,
    averageCollateralPrices: defaultAverageCollateralPrices,
    averageCollateralPriceSubscriptions: [],
  };
}

const state = initialState();

export default state;
