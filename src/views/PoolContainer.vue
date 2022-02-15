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
import { Action, Getter } from 'vuex-class';
import { mixins } from '@soramitsu/soraneo-wallet-web';

const namespace = 'pool';

@Component
export default class PoolContainer extends Mixins(mixins.LoadingMixin) {
  @Action('subscribeOnAccountLiquidityList', { namespace }) subscribeOnAccountLiquidityList!: AsyncVoidFn;
  @Action('subscribeOnAccountLiquidityUpdates', { namespace }) subscribeOnAccountLiquidityUpdates!: AsyncVoidFn;
  @Action('unsubscribeAccountLiquidityListAndUpdates', { namespace })
  unsubscribeAccountLiquidityListAndUpdates!: AsyncVoidFn;

  @Getter isLoggedIn!: boolean;
  @Getter nodeIsConnected!: boolean;

  @Watch('isLoggedIn')
  @Watch('nodeIsConnected')
  private async updateSubscriptions(value: boolean) {
    if (value) {
      await this.updateLiquiditySubscription();
    } else {
      await this.unsubscribeAccountLiquidityListAndUpdates();
    }
  }

  get poolLoading(): boolean {
    return this.parentLoading || this.loading;
  }

  async mounted(): Promise<void> {
    await this.updateLiquiditySubscription();
  }

  async beforeDestroy(): Promise<void> {
    await this.unsubscribeAccountLiquidityListAndUpdates();
  }

  /**
   * Update liquidity subscriptions & necessary data
   * If this page is loaded first time by url, "watch" & "mounted" call this method
   */
  private async updateLiquiditySubscription(): Promise<void> {
    // wait for node connection & wallet init (App.vue)
    await this.withParentLoading(async () => {
      // return if updateLiquiditySubscription is already called by "watch" or "mounted"
      if (this.loading) return;

      await this.withLoading(async () => {
        await this.subscribeOnAccountLiquidityList();
        await this.subscribeOnAccountLiquidityUpdates();
      });
    });
  }
}
</script>
