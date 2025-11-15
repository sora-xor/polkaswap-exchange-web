import { FPNumber } from '@sora-substrate/math';
import { VaultTypes } from '@sora-substrate/sdk/build/kensetsu/consts';
import { describe, expect, it } from 'vitest';

import { calculateVaultMetrics } from '@/modules/vault/utils/metrics';

import type { Collateral, Vault } from '@sora-substrate/sdk/build/kensetsu/types';

const createVault = (overrides: Partial<Vault> = {}): Vault => ({
  id: 1,
  vaultType: VaultTypes.V2,
  lockedAssetId: 'locked',
  debtAssetId: 'debt',
  lockedAmount: new FPNumber(100),
  debt: new FPNumber(25),
  internalDebt: FPNumber.ZERO,
  interestCoefficient: FPNumber.ONE,
  ...overrides,
});

const createCollateral = (overrides: Partial<Collateral> = {}): Collateral => ({
  lockedAssetId: 'locked',
  debtAssetId: 'debt',
  debtSupply: new FPNumber(100),
  totalLocked: new FPNumber(200),
  lastFeeUpdateTimeSecs: Date.now(),
  interestCoefficient: FPNumber.ONE,
  riskParams: {
    hardCap: new FPNumber(1000),
    liquidationRatioReversed: 50,
    liquidationRatio: 2,
    maxLiquidationLot: FPNumber.ONE,
    stabilityFeeSecs: FPNumber.ONE,
    stabilityFeeAnnual: new FPNumber(3),
    minDeposit: FPNumber.ONE,
    ...overrides.riskParams,
  },
  ...overrides,
});

describe('calculateVaultMetrics', () => {
  it('computes borrow availability and ratios for an opened vault', () => {
    const vault = createVault();
    const collateral = createCollateral();
    const metrics = calculateVaultMetrics({
      vault,
      collateral,
      averageCollateralPrice: FPNumber.ONE,
      borrowTax: 0.1,
    });

    expect(metrics.maxSafeDebt.toNumber()).toBeCloseTo(50);
    expect(metrics.ltv?.toNumber()).toBeCloseTo(50);
    expect(metrics.adjustedLtv?.toNumber()).toBeCloseTo(25);
    expect(metrics.available.toNumber()).toBeCloseTo(20);
  });

  it('falls back to zeroed values when collateral data is missing', () => {
    const vault = createVault();
    const metrics = calculateVaultMetrics({
      vault,
      collateral: null,
      averageCollateralPrice: FPNumber.ZERO,
      borrowTax: 0.15,
    });

    expect(metrics.maxSafeDebt.toNumber()).toBe(0);
    expect(metrics.ltv).toBeNull();
    expect(metrics.adjustedLtv).toBeNull();
    expect(metrics.available.toNumber()).toBe(0);
  });
});
