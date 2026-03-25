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
import { useSettingsStore } from '@/stores/settings';
import { useVaultStore } from '@/stores/vault';

defineOptions({
  inheritAttrs: false,
});

const settingsStore = useSettingsStore();
const vaultStore = useVaultStore();

const subscribeOnCollaterals = () => vaultStore.subscribeOnCollaterals();
const subscribeOnAccountVaults = () => vaultStore.subscribeOnAccountVaults();
const updateBalanceSubscriptions = () => vaultStore.updateBalanceSubscriptions();
const getLiquidationPenalty = () => vaultStore.getLiquidationPenalty();
const subscribeOnBorrowTaxes = () => vaultStore.subscribeOnBorrowTaxes();
const subscribeOnDebtCalculation = () => vaultStore.subscribeOnDebtCalculation();
const resetVaults = () => vaultStore.reset();
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

const kensetsuEnabled = computed(() => settingsStore.kensetsuEnabled);

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
