import { FPNumber } from '@sora-substrate/sdk';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTranslation } from '@/composables/useTranslation';
import { formatDecimalPlaces } from '@/utils';

import type { DemeterPool, DemeterRewardToken } from '@sora-substrate/sdk/build/demeterFarming/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';

const BLOCKS_PER_YEAR = new FPNumber(5_256_000);

/**
 * Exposes APR-related helpers that replace the legacy Demeter `AprMixin`.
 */
export function useDemeterApr() {
  const { t } = useTranslation();
  const formatted = useFormattedAmount();

  const getEmission = (pool: DemeterPool, tokenInfo: Nullable<DemeterRewardToken>): FPNumber => {
    const isFarm = !!pool?.isFarm;
    const tokenMultiplier = new FPNumber(
      (isFarm ? tokenInfo?.farmsTotalMultiplier : tokenInfo?.stakingTotalMultiplier) ?? 0
    );

    if (tokenMultiplier.isZero()) return FPNumber.ZERO;

    const poolMultiplier = new FPNumber(pool?.multiplier ?? 0);
    const multiplier = poolMultiplier.div(tokenMultiplier);
    const allocation = (isFarm ? tokenInfo?.farmsAllocation : tokenInfo?.stakingAllocation) ?? FPNumber.ZERO;
    const tokenPerBlock = tokenInfo?.tokenPerBlock ?? FPNumber.ZERO;

    return allocation.mul(tokenPerBlock).mul(multiplier);
  };

  const getTvl = (pool: DemeterPool, poolAssetPrice: FPNumber, liquidity?: Nullable<AccountLiquidity>): FPNumber => {
    if (!pool) return FPNumber.ZERO;

    if (pool.isFarm) {
      if (!liquidity) return FPNumber.ZERO;

      return FPNumber.fromCodecValue(liquidity.secondBalance)
        .div(FPNumber.fromCodecValue(liquidity.balance))
        .mul(pool.totalTokensInPool)
        .mul(poolAssetPrice)
        .mul(new FPNumber(2));
    }

    return pool.totalTokensInPool.mul(poolAssetPrice);
  };

  const getApr = (emission: FPNumber, tvl: FPNumber, rewardAssetPrice: FPNumber): FPNumber => {
    if (tvl.isZero()) return FPNumber.ZERO;

    return emission.mul(BLOCKS_PER_YEAR).mul(rewardAssetPrice).div(tvl).mul(FPNumber.HUNDRED);
  };

  const formatApr = (apr: FPNumber): string => {
    return apr.isZero() ? t('calculatingText') : formatDecimalPlaces(apr, true);
  };

  return {
    ...formatted,
    getEmission,
    getTvl,
    getApr,
    formatApr,
  };
}

export type DemeterAprComposable = ReturnType<typeof useDemeterApr>;
