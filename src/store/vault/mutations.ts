import { defineMutations } from 'direct-vuex';

import { defaultAverageCollateralPrices } from './state';

import type { VaultState } from './types';
import type { FPNumber } from '@sora-substrate/math';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';
import type { Collateral, Vault } from '@sora-substrate/util/build/kensetsu/types';
import type { Subscription } from 'rxjs';

const mutations = defineMutations<VaultState>()({
  setCollaterals(state, collaterals: Record<string, Collateral>): void {
    state.collaterals = { ...collaterals };
  },
  resetCollaterals(state): void {
    state.collaterals = {};
  },
  setCollateralsInterval(state, interval: ReturnType<typeof setInterval>): void {
    state.collateralsInterval = interval;
  },
  resetCollateralsInterval(state): void {
    if (state.collateralsInterval) {
      clearInterval(state.collateralsInterval);
    }
    state.collateralsInterval = null;
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
  setCollateralTokenBalance(state, balance?: Nullable<AccountBalance>): void {
    state.collateralTokenBalance = balance ?? null;
  },
  setKusdTokenBalance(state, balance?: Nullable<AccountBalance>): void {
    state.kusdTokenBalance = balance ?? null;
  },
  setAverageCollateralPrice(state, data: { address: string; price?: Nullable<FPNumber> }): void {
    state.averageCollateralPrices = { ...state.averageCollateralPrices, [data.address]: data.price };
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
  setBorrowTax(state, tax: number): void {
    state.borrowTax = tax;
  },
  setBorrowTaxSubscription(state, subscription: Subscription): void {
    state.borrowTaxSubscription = subscription;
  },
  resetBorrowTaxSubscription(state): void {
    state.borrowTaxSubscription?.unsubscribe();
    state.borrowTaxSubscription = null;
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
  setBadDebt(state, debt: FPNumber): void {
    state.badDebt = debt;
  },
  setBadDebtSubscription(state, subscription: Subscription): void {
    state.badDebtSubscription = subscription;
  },
  resetBadDebtSubscription(state): void {
    state.badDebtSubscription?.unsubscribe();
    state.badDebtSubscription = null;
  },
});

export default mutations;
