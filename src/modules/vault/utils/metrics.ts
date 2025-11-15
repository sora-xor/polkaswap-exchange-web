import { FPNumber } from '@sora-substrate/math';

import type { Nullable } from '@/types/common';

import type { Collateral, Vault } from '@sora-substrate/sdk/build/kensetsu/types';

export type VaultMetricsInput = {
  vault: Vault;
  collateral: Nullable<Collateral>;
  averageCollateralPrice: FPNumber;
  borrowTax: number;
};

export type VaultMetrics = {
  maxSafeDebt: FPNumber;
  ltvCoefficient: Nullable<FPNumber>;
  ltv: Nullable<FPNumber>;
  adjustedLtv: Nullable<FPNumber>;
  available: FPNumber;
};

/**
 * Calculates derived vault metrics shared between the vault list and detail views.
 */
export function calculateVaultMetrics({
  vault,
  collateral,
  averageCollateralPrice,
  borrowTax,
}: VaultMetricsInput): VaultMetrics {
  const zero = FPNumber.ZERO;
  const riskParams = collateral?.riskParams;

  const collateralVolume = averageCollateralPrice.mul(vault.lockedAmount);
  const ratio = riskParams?.liquidationRatioReversed ?? 0;
  const maxSafeDebt = collateralVolume.mul(ratio).div(FPNumber.HUNDRED);
  const maxSafeDebtWithoutTax = maxSafeDebt.sub(maxSafeDebt.mul(borrowTax));

  const ltvCoefficient = maxSafeDebt.isZero() ? null : vault.debt.div(maxSafeDebt);
  const isFiniteLtv = Boolean(ltvCoefficient?.isFinity());
  const ltv = isFiniteLtv ? ltvCoefficient!.mul(FPNumber.HUNDRED) : null;
  const adjustedLtv = isFiniteLtv ? ltvCoefficient!.mul(ratio) : null;

  const totalHardCap = riskParams?.hardCap ?? zero;
  const currentDebtSupply = collateral?.debtSupply ?? zero;

  let totalAvailable = totalHardCap.sub(currentDebtSupply);
  totalAvailable = totalAvailable.sub(totalAvailable.mul(borrowTax));

  const availableCoeff = maxSafeDebtWithoutTax.sub(vault.debt);
  let available = totalAvailable.lt(availableCoeff) ? totalAvailable : availableCoeff;
  available = !available.isFinity() || available.isLteZero() ? zero : available.dp(2);

  return {
    maxSafeDebt,
    ltvCoefficient: isFiniteLtv ? ltvCoefficient! : null,
    ltv,
    adjustedLtv,
    available,
  };
}
