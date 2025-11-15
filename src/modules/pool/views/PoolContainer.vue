<template>
  <router-view v-bind="forwardedAttrs"></router-view>
</template>

<script lang="ts" setup>
import { computed, useAttrs } from 'vue';

import { useSubscriptions } from '@/composables/useSubscriptions';
import store from '@/store';

const attrs = useAttrs();

const { subscriptionsDataLoading } = useSubscriptions({
  startSubscriptions: [
    () => store.dispatch.pool.subscribeOnAccountLiquidityList(),
    () => store.dispatch.pool.subscribeOnAccountLiquidityUpdates(),
    () => store.dispatch.pool.subscribeOnAccountLockedLiquidity(),
    () => store.dispatch.pool.subscribeOnPoolsApy(),
  ],
  resetSubscriptions: [() => store.dispatch.pool.unsubscribeAccountLiquidityListAndUpdates()],
});

const forwardedAttrs = computed(() => ({
  parentLoading: subscriptionsDataLoading.value,
  ...attrs,
}));
</script>
