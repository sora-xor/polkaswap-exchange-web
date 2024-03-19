import { XOR } from '@sora-substrate/util/build/assets/consts';

import type { VaultState } from './types';

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
    averageCollateralPrice: null,
    averageCollateralPriceSubscription: null,
  };
}

const state = initialState();

export default state;
