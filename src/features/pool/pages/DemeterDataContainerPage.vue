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
import { useDemeterFarmingStore } from '@/stores/demeterFarming';
import { useStakingStore } from '@/stores/staking';

defineOptions({
  name: 'DemeterDataContainerPage',
  inheritAttrs: false,
});

const demeterFarmingStore = useDemeterFarmingStore();
const stakingStore = useStakingStore();

const subscribeOnPools = () => demeterFarmingStore.subscribeOnPools();
const subscribeOnTokens = () => demeterFarmingStore.subscribeOnTokens();
const subscribeOnAccountPools = () => demeterFarmingStore.subscribeOnAccountPools();
const unsubscribeDemeter = () => demeterFarmingStore.unsubscribeUpdates();
const getValidatorsInfo = () => stakingStore.getValidatorsInfo();
const getStakingInfo = () => stakingStore.getStakingInfo();

const { subscriptionsDataLoading } = useSubscriptions({
  startSubscriptions: [subscribeOnPools, subscribeOnTokens, subscribeOnAccountPools, getValidatorsInfo, getStakingInfo],
  resetSubscriptions: [unsubscribeDemeter],
});
</script>
