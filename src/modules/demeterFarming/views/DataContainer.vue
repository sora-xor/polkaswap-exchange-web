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
  @action.demeterFarming.subscribeOnPools private subscribeOnPools!: AsyncVoidFn;
  @action.demeterFarming.subscribeOnTokens private subscribeOnTokens!: AsyncVoidFn;
  @action.demeterFarming.subscribeOnAccountPools private subscribeOnAccountPools!: AsyncVoidFn;
  @action.demeterFarming.unsubscribeUpdates private unsubscribeDemeter!: AsyncVoidFn;

  created(): void {
    this.setStartSubscriptions([this.subscribeOnPools, this.subscribeOnTokens, this.subscribeOnAccountPools]);
    this.setResetSubscriptions([this.unsubscribeDemeter]);
  }
}
</script>
