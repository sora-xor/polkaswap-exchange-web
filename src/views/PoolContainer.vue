<template>
  <router-view
    v-bind="{
      parentLoading: poolLoading,
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
export default class PoolContainer extends Mixins(SubscriptionsMixin) {
  @action.pool.subscribeOnAccountLiquidityList private subscribeOnAccountLiquidityList!: AsyncVoidFn;
  @action.pool.subscribeOnAccountLiquidityUpdates private subscribeOnAccountLiquidityUpdates!: AsyncVoidFn;
  @action.pool.unsubscribeAccountLiquidityListAndUpdates private unsubscribe!: AsyncVoidFn;

  @action.demeterFarming.subscribeOnPools private subscribeOnPools!: AsyncVoidFn;
  @action.demeterFarming.subscribeOnTokens private subscribeOnTokens!: AsyncVoidFn;
  @action.demeterFarming.subscribeOnAccountPools private subscribeOnAccountPools!: AsyncVoidFn;
  @action.demeterFarming.unsubscribeUpdates private unsubscribeDemeter!: AsyncVoidFn;

  get poolLoading(): boolean {
    return this.parentLoading || this.loading;
  }

  created(): void {
    this.setStartSubscriptions([
      this.subscribeOnAccountLiquidityUpdates,
      this.subscribeOnAccountLiquidityList,
      this.subscribeOnPools,
      this.subscribeOnTokens,
      this.subscribeOnAccountPools,
    ]);
    this.setResetSubscriptions([this.unsubscribe, this.unsubscribeDemeter]);
  }
}
</script>
