<template>
  <router-view v-bind="forwardedAttrs"></router-view>
</template>

<script lang="ts" setup>
import { computed, useAttrs } from 'vue';

import { useSubscriptions } from '@/composables/useSubscriptions';
import { usePoolStore } from '@/stores/pool';

defineOptions({
  name: 'PoolContainerPage',
  inheritAttrs: false,
});

const attrs = useAttrs();
const poolStore = usePoolStore();

const { subscriptionsDataLoading } = useSubscriptions({
  startSubscriptions: [
    () => poolStore.subscribeOnAccountLiquidityList(),
    () => poolStore.subscribeOnAccountLiquidityUpdates(),
    () => poolStore.subscribeOnAccountLockedLiquidity(),
    () => poolStore.subscribeOnPoolsApy(),
  ],
  resetSubscriptions: [() => poolStore.unsubscribeAccountLiquidityListAndUpdates()],
});

const forwardedAttrs = computed(() => ({
  parentLoading: subscriptionsDataLoading.value,
  ...attrs,
}));
</script>
