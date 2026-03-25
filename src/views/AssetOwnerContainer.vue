<template>
  <router-view v-bind="forwardedAttrs" v-loading="subscriptionsDataLoading"></router-view>
</template>

<script lang="ts" setup>
import { computed, watch, useAttrs } from 'vue';

import { useSubscriptions } from '@/composables/useSubscriptions';
import { PageNames } from '@/consts';
import { goTo } from '@/router';
import { useDashboardStore } from '@/stores/dashboard';
import { useSettingsStore } from '@/stores/settings';

const attrs = useAttrs();
const dashboardStore = useDashboardStore();

const subscribeOnOwnedAssets = async () => {
  await dashboardStore.subscribeOnOwnedAssets();
};

const resetOwnedAssets = async () => {
  await dashboardStore.reset();
};

const { subscriptionsDataLoading } = useSubscriptions({
  startSubscriptions: [subscribeOnOwnedAssets],
  resetSubscriptions: [resetOwnedAssets],
});

const forwardedAttrs = computed(() => ({
  parentLoading: subscriptionsDataLoading.value,
  ...attrs,
}));

const settingsStore = useSettingsStore();
const assetOwnerEnabled = computed(() => settingsStore.assetOwnerEnabled);

watch(
  assetOwnerEnabled,
  (value) => {
    if (value === false) {
      goTo(PageNames.Swap);
    }
  },
  { immediate: true }
);
</script>
