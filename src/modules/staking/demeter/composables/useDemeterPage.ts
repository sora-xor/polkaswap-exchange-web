import { computed, ref, toValue } from 'vue';

import { useTransaction } from '@/composables/useTransaction';
import { useDemeterFarmingStore } from '@/stores/demeterFarming';
import type { DemeterLiquidityParams } from '@/stores/demeterFarming/types';

import type { DemeterBasePageComposable } from './useDemeterBasePage';
import type { DemeterPoolDerivedData } from '../types';
import type { DemeterAccountPool } from '@sora-substrate/sdk/build/demeterFarming/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import type { MaybeRef } from 'vue';

type ParentLoadingSource = MaybeRef<boolean> | (() => boolean);

type UseDemeterPageOptions = {
  parentLoading?: ParentLoadingSource;
};

/**
 * Recreates the Demeter `PageMixin` behaviour: dialog wiring, staking actions, and transaction helpers.
 */
export function useDemeterPage(basePage: DemeterBasePageComposable, options: UseDemeterPageOptions = {}) {
  const parentLoading = options.parentLoading;
  const demeterFarmingStore = useDemeterFarmingStore();

  const { loading, withNotifications } = useTransaction({
    parentLoading: parentLoading
      ? typeof parentLoading === 'function'
        ? parentLoading
        : () => toValue(parentLoading)
      : undefined,
  });

  const showStakeDialog = ref(false);
  const showClaimDialog = ref(false);
  const isAddingStake = ref(true);

  const setDialogParams = (params: {
    baseAsset: string;
    poolAsset: string;
    rewardAsset: string;
    liquidity?: AccountLiquidity;
  }) => {
    basePage.setDialogParams(params);
  };

  const changePoolStake = (
    params: { baseAsset: string; poolAsset: string; rewardAsset: string; liquidity?: AccountLiquidity },
    adding = true
  ): void => {
    isAddingStake.value = adding;
    setDialogParams(params);
    showStakeDialog.value = true;
  };

  const claimPoolRewards = (params: { baseAsset: string; poolAsset: string; rewardAsset: string }): void => {
    setDialogParams(params);
    showClaimDialog.value = true;
  };

  const deposit = (params: DemeterLiquidityParams) => demeterFarmingStore.deposit(params);
  const withdraw = (params: DemeterLiquidityParams) => demeterFarmingStore.withdraw(params);
  const claimRewards = (pool: DemeterAccountPool) => demeterFarmingStore.claimRewards(pool);

  const handleStakeAction = async (
    params: DemeterLiquidityParams,
    action: (payload: DemeterLiquidityParams) => Promise<void>
  ): Promise<void> => {
    await withNotifications(async () => {
      await action(params);
      showStakeDialog.value = false;
    });
  };

  const handleClaimRewards = async (pool: DemeterAccountPool): Promise<void> => {
    await withNotifications(async () => {
      await claimRewards(pool);
      showClaimDialog.value = false;
    });
  };

  const selectedDerivedPool = computed<Nullable<DemeterPoolDerivedData>>(() => {
    const pool = basePage.selectedPool.value;

    if (!pool) return null;

    return basePage.prepareDerivedPoolData(pool, basePage.selectedAccountPool.value, basePage.liquidity.value);
  });

  return {
    loading,
    showStakeDialog,
    showClaimDialog,
    isAddingStake,
    selectedDerivedPool,
    changePoolStake,
    claimPoolRewards,
    handleStakeAction,
    handleClaimRewards,
    deposit,
    withdraw,
    isActiveCollapseItem: (address: string, activeCollapseItems: string[]): boolean => {
      return activeCollapseItems.includes(address);
    },
    getLiquidityFarmingPools: (liquidity: AccountLiquidity) => basePage.getLiquidityFarmingPools(liquidity) ?? [],
    withNotifications,
  };
}

export type DemeterPageComposable = ReturnType<typeof useDemeterPage>;
