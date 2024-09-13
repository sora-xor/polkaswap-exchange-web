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
  closedAccountVaults: ClosedVault[];
  accountVaultsSubscription: Nullable<Subscription>;
  /** Selected debt asset ID during the vault creation */
  debtAddress: string;
  /** Selected collateral asset ID during the vault creation */
  collateralAddress: string;
  /** Balance of the selected collateral asset during the vault creation */
  collateralTokenBalance: Nullable<AccountBalance>;
  /** Balance of the selected debt asset during the vault creation */
  debtTokenBalance: Nullable<AccountBalance>;
  averageCollateralPrices: Record<string, Nullable<FPNumber>>;
  averageCollateralPriceSubscriptions: Record<string, Subscription>;
  liquidationPenalty: number;
  borrowTax: number;
  tbcdBorrowTax: number;
  karmaBorrowTax: number;
  borrowTaxesSubscription: Nullable<Subscription>;
  debtCalculationInterval: Nullable<ReturnType<typeof setInterval>>;
  /**
   * Additional info about debt assets (key is `debtAssetId`).
   * It includes bad debt and peg asset details to calculate the actual rate
   */
  stablecoinInfos: Record<string, StablecoinInfo>;
  stablecoinInfosSubscription: Nullable<Subscription>;
};
