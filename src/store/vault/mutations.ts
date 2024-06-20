import { defineMutations } from 'direct-vuex';

import type { ClosedVault } from '@/modules/vault/types';

import { defaultAverageCollateralPrices } from './state';

import type { VaultState } from './types';
import type { FPNumber } from '@sora-substrate/math';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';
import type { Collateral, Vault, BorrowTaxes, StablecoinInfo } from '@sora-substrate/util/build/kensetsu/types';
import type { Subscription } from 'rxjs';

const mutations = defineMutations<VaultState>()({
  setCollaterals(state, collaterals: Record<string, Collateral>): void {
    state.collaterals = { ...collaterals };
  },
  resetCollaterals(state): void {
    state.collaterals = {};
  },
  setCollateralsSubscription(state, subscription: Subscription): void {
    state.collateralsSubscription = subscription;
  },
  resetCollateralsSubscription(state): void {
    state.collateralsSubscription?.unsubscribe();
    state.collateralsSubscription = null;
  },
  setAccountVaultIdsSubscription(state, subscription: Subscription): void {
    state.accountVaultIdsSubscription = subscription;
  },
  resetAccountVaultIdsSubscription(state): void {
    state.accountVaultIdsSubscription?.unsubscribe();
    state.accountVaultIdsSubscription = null;
  },
  setAccountVaults(state, accountVaults: Vault[]): void {
    state.accountVaults = [...accountVaults];
  },
  resetAccountVaults(state): void {
    state.accountVaults = [];
  },
  setClosedAccountVaults(state, closedAccountVaults: ClosedVault[]): void {
    state.closedAccountVaults = [...closedAccountVaults];
  },
  resetClosedAccountVaults(state): void {
    state.closedAccountVaults = [];
  },
  setAccountVaultsSubscription(state, subscription: Subscription): void {
    state.accountVaultsSubscription = subscription;
  },
  resetAccountVaultsSubscription(state): void {
    state.accountVaultsSubscription?.unsubscribe();
    state.accountVaultsSubscription = null;
  },
  setCollateralAddress(state, address: string): void {
    state.collateralAddress = address;
  },
  setDebtAddress(state, address: string): void {
    state.debtAddress = address;
  },
  setCollateralTokenBalance(state, balance?: Nullable<AccountBalance>): void {
    state.collateralTokenBalance = balance ?? null;
  },
  setDebtTokenBalance(state, balance?: Nullable<AccountBalance>): void {
    state.debtTokenBalance = balance ?? null;
  },
  setAverageCollateralPrice(state, data: { key: string; price?: Nullable<FPNumber> }): void {
    state.averageCollateralPrices = { ...state.averageCollateralPrices, [data.key]: data.price };
  },
  resetAverageCollateralPrices(state): void {
    state.averageCollateralPrices = { ...defaultAverageCollateralPrices };
  },
  setAverageCollateralPriceSubscriptions(state, subscriptions?: Record<string, Subscription>): void {
    if (!subscriptions) {
      return;
    }
    state.averageCollateralPriceSubscriptions = { ...state.averageCollateralPriceSubscriptions, ...subscriptions };
  },
  removeAverageCollateralPriceSubscriptions(state, ids: Array<string>): void {
    ids.forEach((id) => {
      state.averageCollateralPriceSubscriptions[id]?.unsubscribe();
      delete state.averageCollateralPriceSubscriptions[id];
    });
    state.averageCollateralPrices = { ...state.averageCollateralPrices };
  },
  unsubscribeAverageCollateralPriceSubscriptions(state): void {
    Object.values(state.averageCollateralPriceSubscriptions).forEach((subscription) => subscription?.unsubscribe());
    state.averageCollateralPriceSubscriptions = {};
  },
  setLiquidationPenalty(state, penalty: number): void {
    state.liquidationPenalty = penalty;
  },
  setBorrowTaxes(state, { borrowTax, karmaBorrowTax, tbcdBorrowTax }: BorrowTaxes): void {
    // Convert to percentage coefficient
    state.borrowTax = borrowTax / 100;
    state.karmaBorrowTax = karmaBorrowTax / 100;
    state.tbcdBorrowTax = tbcdBorrowTax / 100;
  },
  setBorrowTaxesSubscription(state, subscription: Subscription): void {
    state.borrowTaxesSubscription = subscription;
  },
  resetBorrowTaxesSubscription(state): void {
    state.borrowTaxesSubscription?.unsubscribe();
    state.borrowTaxesSubscription = null;
  },
  setDebtCalculationInterval(state, interval: ReturnType<typeof setInterval>): void {
    state.debtCalculationInterval = interval;
  },
  resetDebtCalculationInterval(state): void {
    if (state.debtCalculationInterval) {
      clearInterval(state.debtCalculationInterval);
    }
    state.debtCalculationInterval = null;
  },
  setStablecoinInfos(state, stablecoinInfos: Record<string, StablecoinInfo>): void {
    state.stablecoinInfos = { ...stablecoinInfos };
  },
  setStablecoinInfosSubscription(state, subscription: Subscription): void {
    state.stablecoinInfosSubscription = subscription;
  },
  resetStablecoinInfosSubscription(state): void {
    state.stablecoinInfosSubscription?.unsubscribe();
    state.stablecoinInfosSubscription = null;
  },
});

export default mutations;
