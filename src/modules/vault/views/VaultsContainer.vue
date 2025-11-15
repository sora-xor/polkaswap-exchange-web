<template>
  <router-view
    class="vaults-view-container"
    v-bind="{
      parentLoading: subscriptionsDataLoading,
      ...attrs,
    }"
    v-loading="subscriptionsDataLoading"
  ></router-view>
</template>

<script lang="ts" setup>
import { computed, useAttrs, watch } from 'vue';

import { useSubscriptions } from '@/composables/useSubscriptions';
import { PageNames } from '@/consts';
import { goTo } from '@/router';
import store from '@/store';

defineOptions({
  inheritAttrs: false,
});

const subscribeOnCollaterals = () => store.dispatch.vault.subscribeOnCollaterals();
const subscribeOnAccountVaults = () => store.dispatch.vault.subscribeOnAccountVaults();
const updateBalanceSubscriptions = () => store.dispatch.vault.updateBalanceSubscriptions();
const getLiquidationPenalty = () => store.dispatch.vault.getLiquidationPenalty();
const subscribeOnBorrowTaxes = () => store.dispatch.vault.subscribeOnBorrowTaxes();
const subscribeOnDebtCalculation = () => store.dispatch.vault.subscribeOnDebtCalculation();
const resetVaults = () => store.dispatch.vault.reset();
const attrs = useAttrs();

const { subscriptionsDataLoading } = useSubscriptions({
  startSubscriptions: [
    subscribeOnCollaterals,
    subscribeOnAccountVaults,
    updateBalanceSubscriptions,
    getLiquidationPenalty,
    subscribeOnBorrowTaxes,
    subscribeOnDebtCalculation,
  ],
  resetSubscriptions: [resetVaults],
});

const kensetsuEnabled = computed(() => store.getters.settings.kensetsuEnabled as Nullable<boolean>);

watch(
  kensetsuEnabled,
  (value) => {
    if (value === false) {
      goTo(PageNames.Swap);
    }
  },
  { immediate: true }
);
</script>

<style lang="scss">
.vaults-view-container > .el-loading-mask {
  margin: -$inner-spacing-medium; // compensate for the padding of the .app-content from App.vue
}
</style>
