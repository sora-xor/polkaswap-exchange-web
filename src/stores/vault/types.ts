import type { ClosedVault } from '@/modules/vault/types';

import type { FPNumber } from '@sora-substrate/math';
import type { AccountBalance } from '@sora-substrate/sdk/build/assets/types';
import type { Collateral, Vault, StablecoinInfo } from '@sora-substrate/sdk/build/kensetsu/types';
import type { Subscription } from 'rxjs';

export type VaultState = {
  collaterals: Record<string, Collateral>;
  collateralsSubscription: Nullable<Subscription>;
  accountVaultIdsSubscription: Nullable<Subscription>;
  accountVaults: Vault[];
  accountVaultsLoaded: boolean;
  closedAccountVaults: ClosedVault[];
  closedAccountVaultsLoaded: boolean;
  accountVaultsSubscription: Nullable<Subscription>;
  debtAddress: string;
  collateralAddress: string;
  collateralTokenBalance: Nullable<AccountBalance>;
  debtTokenBalance: Nullable<AccountBalance>;
  averageCollateralPrices: Record<string, Nullable<FPNumber>>;
  averageCollateralPriceSubscriptions: Record<string, Subscription>;
  liquidationPenalty: number;
  borrowTax: number;
  tbcdBorrowTax: number;
  karmaBorrowTax: number;
  borrowTaxesSubscription: Nullable<Subscription>;
  debtCalculationInterval: Nullable<ReturnType<typeof setInterval>>;
  stablecoinInfos: Record<string, StablecoinInfo>;
  stablecoinInfosSubscription: Nullable<Subscription>;
};
