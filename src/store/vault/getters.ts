import { api } from '@soramitsu/soraneo-wallet-web';
import { defineGetters } from 'direct-vuex';

import { vaultGetterContext } from '@/store/vault';

import type { VaultState } from './types';
import type { FPNumber } from '@sora-substrate/math';
import type { RegisteredAccountAsset, Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';

const getters = defineGetters<VaultState>()({
  /** Selected debt token during the position creation */
  debtToken(...args): Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = vaultGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(state.debtAddress);
    const balance = state.debtTokenBalance;
    if (balance) {
      return { ...token, balance } as RegisteredAccountAsset;
    }
    return token;
  },
  /** Selected locked token during the position creation */
  collateralToken(...args): Nullable<RegisteredAccountAsset> {
    const { state, rootGetters } = vaultGetterContext(args);
    const token = rootGetters.assets.assetDataByAddress(state.collateralAddress);
    const balance = state.collateralTokenBalance;
    if (balance) {
      return { ...token, balance } as RegisteredAccountAsset;
    }
    return token;
  },
  /** `averageCollateralPrice` used for the selected locked and debt tokens during the position creation */
  averageCollateralPrice(...args): Nullable<FPNumber> {
    const { state } = vaultGetterContext(args);
    const { averageCollateralPrices, collateralAddress, debtAddress } = state;

    const key = api.kensetsu.serializeKey(collateralAddress, debtAddress);
    return averageCollateralPrices[key];
  },
  /** Returns total borrow tax for the debt token */
  getBorrowTax(...args): (debtAsset: Asset | AccountAsset | string) => number {
    const { state } = vaultGetterContext(args);

    return (debtAsset: Asset | AccountAsset | string): number => {
      const { borrowTax, tbcdBorrowTax, karmaBorrowTax } = state;
      return api.kensetsu.calcTax(debtAsset, borrowTax, tbcdBorrowTax, karmaBorrowTax);
    };
  },
});

export default getters;
