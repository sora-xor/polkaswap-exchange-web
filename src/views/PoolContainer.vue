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
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import { action, getter } from '@/store/decorators';

@Component
export default class PoolContainer extends Mixins(mixins.LoadingMixin) {
  @action.pool.subscribeOnAccountLiquidityList private subscribeOnAccountLiquidityList!: AsyncVoidFn;
  @action.pool.subscribeOnAccountLiquidityUpdates private subscribeOnAccountLiquidityUpdates!: AsyncVoidFn;
  @action.pool.unsubscribeAccountLiquidityListAndUpdates private unsubscribe!: AsyncVoidFn;

  @action.demeterFarming.subscribeOnPools private subscribeOnPools!: AsyncVoidFn;
  @action.demeterFarming.subscribeOnTokens private subscribeOnTokens!: AsyncVoidFn;
  @action.demeterFarming.subscribeOnAccountPools private subscribeOnAccountPools!: AsyncVoidFn;
  @action.demeterFarming.unsubscribeUpdates private unsubscribeDemeter!: AsyncVoidFn;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;

  @Watch('isLoggedIn')
  @Watch('nodeIsConnected')
  private async updatePoolSubscriptions(value: boolean) {
    if (value) {
      await this.updateSubscriptions();
    } else {
      await this.resetSubscriptions();
    }
  }

  get poolLoading(): boolean {
    return this.parentLoading || this.loading;
  }

  async mounted(): Promise<void> {
    await this.updateSubscriptions();
  }

  async beforeDestroy(): Promise<void> {
    await this.resetSubscriptions();
  }

  /**
   * Update liquidity subscriptions & necessary data
   * If this page is loaded first time by url, "watch" & "mounted" call this method
   */
  private async updateSubscriptions(): Promise<void> {
    // return if updateSubscription is already called by "watch" or "mounted"
    if (this.loading) return;

    await this.withLoading(async () => {
      // wait for node connection & wallet init (App.vue)
      await this.withParentLoading(async () => {
        // at first we should subscribe on liquidities updates,
        // because subscriptions are created during liquidity list update
        await this.subscribeOnAccountLiquidityUpdates();
        await this.subscribeOnAccountLiquidityList();

        // demeter
        await this.subscribeOnPools();
        await this.subscribeOnTokens();
        await this.subscribeOnAccountPools();
      });
    });
  }

  private async resetSubscriptions(): Promise<void> {
    await this.unsubscribe();
    await this.unsubscribeDemeter();
  }
}
</script>
