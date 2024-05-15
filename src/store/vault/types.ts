import type { FPNumber } from '@sora-substrate/math';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';
import type { Collateral, Vault } from '@sora-substrate/util/build/kensetsu/types';
import type { Subscription } from 'rxjs';

export type VaultState = {
  collaterals: Record<string, Collateral>;
  collateralsSubscription: Nullable<Subscription>;
  accountVaultIdsSubscription: Nullable<Subscription>;
  accountVaults: Vault[];
  accountVaultsSubscription: Nullable<Subscription>;
  /** Selected collateral asset ID during the vault creation */
  collateralAddress: string;
  collateralTokenBalance: Nullable<AccountBalance>;
  kusdTokenBalance: Nullable<AccountBalance>;
  averageCollateralPrices: Record<string, Nullable<FPNumber>>;
  averageCollateralPriceSubscriptions: Record<string, Subscription>;
  liquidationPenalty: number;
  borrowTax: number;
  borrowTaxSubscription: Nullable<Subscription>;
  debtCalculationInterval: Nullable<ReturnType<typeof setInterval>>;
  badDebt: FPNumber;
  badDebtSubscription: Nullable<Subscription>;
};
