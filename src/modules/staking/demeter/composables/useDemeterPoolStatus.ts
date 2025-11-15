import { FPNumber } from '@sora-substrate/sdk';
import { computed, toValue } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import store from '@/store';
import { useWalletStore } from '@/stores/wallet';
import type { Nullable } from '@/types/common';
import { getAssetBalance, getLiquidityBalance } from '@/utils';

import type { DemeterAsset } from '../types';
import type { DemeterPool, DemeterAccountPool } from '@sora-substrate/sdk/build/demeterFarming/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import type { MaybeRef } from 'vue';

export type UseDemeterPoolStatusProps = {
  liquidity?: MaybeRef<Nullable<AccountLiquidity>>;
  pool?: MaybeRef<Nullable<DemeterPool>>;
  accountPool?: MaybeRef<Nullable<DemeterAccountPool>>;
  poolAsset?: MaybeRef<Nullable<DemeterAsset>>;
  rewardAsset?: MaybeRef<Nullable<DemeterAsset>>;
};

/**
 * Supplies pool/account state that previously lived in `PoolStatusMixin`.
 */
export function useDemeterPoolStatus(rawProps: UseDemeterPoolStatusProps) {
  const liquidity = computed(() => toValue(rawProps.liquidity));
  const pool = computed(() => toValue(rawProps.pool));
  const accountPool = computed(() => toValue(rawProps.accountPool));
  const poolAsset = computed(() => toValue(rawProps.poolAsset));
  const rewardAsset = computed(() => toValue(rawProps.rewardAsset));
  const formatted = useFormattedAmount();
  const walletStore = useWalletStore();

  const fiatPriceObject = computed<Record<string, string>>(() => walletStore.fiatPriceObject ?? {});

  const pricesAvailable = computed(() => Object.keys(fiatPriceObject.value ?? {}).length > 0);
  const isFarm = computed(() => Boolean(pool.value?.isFarm));
  const activeStatus = computed(() => !pool.value?.isRemoved);

  const lockedFunds = computed(() => accountPool.value?.pooledTokens ?? FPNumber.ZERO);
  const hasStake = computed(() => (accountPool.value ? !lockedFunds.value.isZero() : false));

  const poolAssetBalance = computed(() =>
    FPNumber.fromCodecValue(getAssetBalance(poolAsset.value) ?? 0, poolAsset.value?.decimals)
  );
  const lpBalance = computed(() => FPNumber.fromCodecValue(getLiquidityBalance(liquidity.value) ?? 0));

  const funds = computed(() => (isFarm.value ? lpBalance.value : poolAssetBalance.value));
  const availableFunds = computed(() =>
    isFarm.value ? (FPNumber.max(lockedFunds.value, funds.value) as FPNumber).sub(lockedFunds.value) : funds.value
  );
  const depositDisabled = computed(() => !activeStatus.value || availableFunds.value.isZero());

  const emitParams = computed(() => ({
    baseAsset: pool.value?.baseAsset ?? '',
    poolAsset: pool.value?.poolAsset ?? '',
    rewardAsset: pool.value?.rewardAsset ?? '',
  }));

  return {
    ...formatted,
    liquidity,
    pool,
    accountPool,
    poolAsset,
    rewardAsset,
    pricesAvailable,
    isFarm,
    activeStatus,
    lockedFunds,
    hasStake,
    poolAssetBalance,
    lpBalance,
    funds,
    availableFunds,
    depositDisabled,
    emitParams,
  };
}

export type DemeterPoolStatusComposable = ReturnType<typeof useDemeterPoolStatus>;
