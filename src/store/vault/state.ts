import { FPNumber } from '@sora-substrate/math';
import { XOR, DAI, KUSD } from '@sora-substrate/sdk/build/assets/consts';

import type { VaultState } from './types';

export const defaultAverageCollateralPrices: Record<string, Nullable<FPNumber>> = {
  // api.kensetsu.serializeKey cannot be used here
  [`${DAI.address},${KUSD.address}`]: FPNumber.ONE,
};

function initialState(): VaultState {
  return {
    collaterals: {},
    collateralsSubscription: null,
    accountVaultIdsSubscription: null,
    accountVaults: [],
    closedAccountVaults: [],
    accountVaultsSubscription: null,
    collateralAddress: XOR.address,
    debtAddress: KUSD.address,
    collateralTokenBalance: null,
    debtTokenBalance: null,
    averageCollateralPrices: defaultAverageCollateralPrices,
    averageCollateralPriceSubscriptions: {},
    liquidationPenalty: 0,
    borrowTax: 0,
    tbcdBorrowTax: 0,
    karmaBorrowTax: 0,
    borrowTaxesSubscription: null,
    debtCalculationInterval: null,
    stablecoinInfos: {},
    stablecoinInfosSubscription: null,
  };
}

const state = initialState();

export default state;
