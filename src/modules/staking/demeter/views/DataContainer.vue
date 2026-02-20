<template>
  <router-view
    v-bind="{
      parentLoading: subscriptionsDataLoading,
      ...$attrs,
    }"
  ></router-view>
</template>

<script lang="ts" setup>
import { useSubscriptions } from '@/composables/useSubscriptions';
import store from '@/store';

defineOptions({
  inheritAttrs: false,
});

const subscribeOnPools = () => store.dispatch.demeterFarming.subscribeOnPools();
const subscribeOnTokens = () => store.dispatch.demeterFarming.subscribeOnTokens();
const subscribeOnAccountPools = () => store.dispatch.demeterFarming.subscribeOnAccountPools();
const unsubscribeDemeter = () => store.dispatch.demeterFarming.unsubscribeUpdates();
const getValidatorsInfo = () => store.dispatch.staking.getValidatorsInfo();
const getStakingInfo = () => store.dispatch.staking.getStakingInfo();

const { subscriptionsDataLoading } = useSubscriptions({
  startSubscriptions: [subscribeOnPools, subscribeOnTokens, subscribeOnAccountPools, getValidatorsInfo, getStakingInfo],
  resetSubscriptions: [unsubscribeDemeter],
});
</script>
