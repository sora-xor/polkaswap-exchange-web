<template>
  <router-view v-bind="forwardedAttrs" v-loading="subscriptionsDataLoading"></router-view>
</template>

<script lang="ts" setup>
import { computed, useAttrs, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useSubscriptions } from '@/composables/useSubscriptions';
import { PageNames } from '@/consts';
import { useDashboardStore } from '@/stores/dashboard';
import { useSettingsStore } from '@/stores/settings';

const attrs = useAttrs();
const router = useRouter();
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
  async (value) => {
    if (value === false) {
      await router.push({ name: PageNames.Swap });
    }
  },
  { immediate: true }
);
</script>
