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

  @action.demeterFarming.getPools private getPools!: AsyncVoidFn;
  @action.demeterFarming.getTokens private getTokens!: AsyncVoidFn;
  @action.demeterFarming.subscribeOnAccountPools private subscribeOnAccountPools!: AsyncVoidFn;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;

  @Watch('isLoggedIn')
  @Watch('nodeIsConnected')
  private async updateSubscriptions(value: boolean) {
    if (value) {
      await this.updateLiquiditySubscription();
    } else {
      await this.unsubscribe();
    }
  }

  get poolLoading(): boolean {
    return this.parentLoading || this.loading;
  }

  async mounted(): Promise<void> {
    await this.updateLiquiditySubscription();
    await this.getPools();
    await this.getTokens();
  }

  async beforeDestroy(): Promise<void> {
    await this.unsubscribe();
  }

  /**
   * Update liquidity subscriptions & necessary data
   * If this page is loaded first time by url, "watch" & "mounted" call this method
   */
  private async updateLiquiditySubscription(): Promise<void> {
    // return if updateLiquiditySubscription is already called by "watch" or "mounted"
    if (this.loading) return;

    await this.withLoading(async () => {
      // wait for node connection & wallet init (App.vue)
      await this.withParentLoading(async () => {
        // at first we should subscribe on liquidities updates,
        // because subscriptions are created during liquidity list update
        await this.subscribeOnAccountLiquidityUpdates();
        await this.subscribeOnAccountLiquidityList();

        // demeter
        await this.subscribeOnAccountPools();
      });
    });
  }
}
</script>
