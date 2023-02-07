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
export default class PoolContainer extends Mixins(SubscriptionsMixin) {
  @action.pool.subscribeOnAccountLiquidityList private subscribeOnList!: AsyncFnWithoutArgs;
  @action.pool.subscribeOnAccountLiquidityUpdates private subscribeOnUpdates!: AsyncFnWithoutArgs;
  @action.pool.subscribeOnAccountLockedLiquidity private subscribeOnLocked!: AsyncFnWithoutArgs;
  @action.pool.unsubscribeAccountLiquidityListAndUpdates private unsubscribe!: AsyncFnWithoutArgs;
  @action.pool.subscribeOnPoolsApy private subscribeOnPoolsApy!: AsyncFnWithoutArgs;

  created(): void {
    this.setStartSubscriptions([
      this.subscribeOnList,
      this.subscribeOnUpdates,
      this.subscribeOnLocked,
      this.subscribeOnPoolsApy,
    ]);
    this.setResetSubscriptions([this.unsubscribe]);
  }
}
</script>
