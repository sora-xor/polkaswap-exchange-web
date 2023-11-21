<template>
  <router-view
    v-bind="{
      parentLoading: subscriptionsDataLoading,
      ...$attrs,
    }"
    v-on="$listeners"
  />
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import { action } from '@/store/decorators';

@Component
export default class DemeterDataContainer extends Mixins(SubscriptionsMixin) {
  @action.demeterFarming.subscribeOnPools private subscribeOnPools!: AsyncFnWithoutArgs;
  @action.demeterFarming.subscribeOnTokens private subscribeOnTokens!: AsyncFnWithoutArgs;
  @action.demeterFarming.subscribeOnAccountPools private subscribeOnAccountPools!: AsyncFnWithoutArgs;
  @action.demeterFarming.unsubscribeUpdates private unsubscribeDemeter!: AsyncFnWithoutArgs;
  @action.staking.getValidatorsInfo getValidatorsInfo!: AsyncFnWithoutArgs;
  @action.staking.getStakingInfo getStakingInfo!: AsyncFnWithoutArgs;

  created(): void {
    this.setStartSubscriptions([
      this.subscribeOnPools,
      this.subscribeOnTokens,
      this.subscribeOnAccountPools,
      this.getValidatorsInfo,
      this.getStakingInfo,
    ]);
    this.setResetSubscriptions([this.unsubscribeDemeter]);
  }
}
</script>
