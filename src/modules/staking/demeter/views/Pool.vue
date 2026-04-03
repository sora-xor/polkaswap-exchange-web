<template>
  <div>
    <pool-base v-bind="attrs" :parent-loading="parentLoading">
      <template #title-append="{ liquidity, activeCollapseItems }">
        <div
          v-show="!page.isActiveCollapseItem(liquidity.address, activeCollapseItems)"
          class="s-flex farming-pool-badges"
        >
          <status-badge
            v-for="(item, index) in page.getLiquidityFarmingPools(liquidity)"
            :key="`${item.pool.poolAsset}-${item.pool.rewardAsset}-${index}`"
            :liquidity="liquidity"
            :pool="item.pool"
            :account-pool="item.accountPool"
            :pool-asset="item.poolAsset"
            :reward-asset="item.rewardAsset"
            :apr="item.apr"
            @add="page.changePoolStake($event, true)"
            class="farming-pool-badge"
          ></status-badge>
        </div>
      </template>
      <template #append="{ liquidity, activeCollapseItems }">
        <template v-if="page.isActiveCollapseItem(liquidity.address, activeCollapseItems)">
          <pool-card
            v-for="(item, index) in page.getLiquidityFarmingPools(liquidity)"
            :key="`${item.pool.poolAsset}-${item.pool.rewardAsset}-${index}`"
            :liquidity="liquidity"
            :pool="item.pool"
            :account-pool="item.accountPool"
            :base-asset="item.baseAsset"
            :pool-asset="item.poolAsset"
            :reward-asset="item.rewardAsset"
            :apr="item.apr"
            :tvl="item.tvl"
            @add="page.changePoolStake($event, true)"
            @remove="page.changePoolStake($event, false)"
            @claim="page.claimPoolRewards"
            @calculator="base.showPoolCalculator"
            border
            class="demeter-pool"
          ></pool-card>
        </template>
      </template>
    </pool-base>

    <stake-dialog
      v-model:visible="showStakeDialog"
      :is-adding="isAddingStake"
      :liquidity="selectedAccountLiquidity"
      :parent-loading="dialogParentLoading"
      v-bind="selectedDerivedPool"
      @add="page.handleStakeAction($event, page.deposit)"
      @remove="page.handleStakeAction($event, page.withdraw)"
    ></stake-dialog>

    <claim-dialog
      v-model:visible="showClaimDialog"
      :parent-loading="dialogParentLoading"
      v-bind="selectedDerivedPool"
      @confirm="page.handleClaimRewards"
    ></claim-dialog>

    <calculator-dialog
      v-model:visible="showCalculatorDialog"
      :liquidity="selectedAccountLiquidity"
      v-bind="selectedDerivedPool"
    ></calculator-dialog>
  </div>
</template>

<script lang="ts" setup>
import { computed, useAttrs } from 'vue';

import { PoolPageNames } from '@/modules/pool/consts';
import { poolLazyViewComponent } from '@/modules/pool/router';

import { demeterStakingLazyComponent } from '../../router';
import { DemeterStakingComponents } from '../consts';
import { useDemeterBasePage } from '../composables/useDemeterBasePage';
import { useDemeterPage } from '../composables/useDemeterPage';

const props = defineProps({
  parentLoading: { type: Boolean, default: false },
});

defineOptions({
  inheritAttrs: false,
  components: {
    PoolBase: poolLazyViewComponent(PoolPageNames.Pool),
    PoolCard: demeterStakingLazyComponent(DemeterStakingComponents.PoolCard),
    StatusBadge: demeterStakingLazyComponent(DemeterStakingComponents.StatusBadge),
    StakeDialog: demeterStakingLazyComponent(DemeterStakingComponents.StakeDialog),
    ClaimDialog: demeterStakingLazyComponent(DemeterStakingComponents.ClaimDialog),
    CalculatorDialog: demeterStakingLazyComponent(DemeterStakingComponents.CalculatorDialog),
  },
});

const attrs = useAttrs();
const parentLoading = computed(() => props.parentLoading);

const base = useDemeterBasePage();
const page = useDemeterPage(base, { parentLoading });
const showStakeDialog = computed({
  get: () => page.showStakeDialog.value,
  set: (value: boolean) => {
    page.showStakeDialog.value = value;
  },
});
const showClaimDialog = computed({
  get: () => page.showClaimDialog.value,
  set: (value: boolean) => {
    page.showClaimDialog.value = value;
  },
});
const showCalculatorDialog = computed({
  get: () => base.showCalculatorDialog.value,
  set: (value: boolean) => {
    base.showCalculatorDialog.value = value;
  },
});
const isAddingStake = computed(() => page.isAddingStake.value);
const dialogParentLoading = computed(() => parentLoading.value || page.loading.value);
const selectedAccountLiquidity = computed(() => base.selectedAccountLiquidity.value ?? null);
const selectedDerivedPool = computed(() => page.selectedDerivedPool.value ?? null);
</script>

<style lang="scss" scoped>
.farming-pool-badges {
  flex-flow: wrap;
  gap: $inner-spacing-tiny;
}
.demeter-pool {
  margin-top: $inner-spacing-medium;
}
</style>
