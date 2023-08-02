import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Watch, Mixins } from 'vue-property-decorator';

import { getter } from '@/store/decorators';

import type { NavigationGuardNext, Route } from 'vue-router';

@Component
export default class SubscriptionsMixin extends Mixins(mixins.LoadingMixin) {
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;

  startSubscriptionsList: Array<AsyncFnWithoutArgs> = [];
  resetSubscriptionsList: Array<FnWithoutArgs> = [];

  @Watch('isLoggedIn')
  @Watch('nodeIsConnected')
  private async restartSubscriptions(value: boolean): Promise<void> {
    if (value) {
      await this.updateSubscriptions();
    } else {
      await this.resetSubscriptions();
    }
  }

  get subscriptionsDataLoading(): boolean {
    return this.parentLoading || this.loading;
  }

  beforeMount(): void {
    this.updateSubscriptions();
  }

  // TODO: [TECH]
  // We need subscription management
  // when every subscription have own unsubscribe call, which is not stored in vuex
  // to change this hook to beforeDestroy
  async beforeRouteLeave(to: Route, from: Route, next: NavigationGuardNext<Vue>): Promise<void> {
    await this.resetSubscriptions();
    next();
  }

  public setStartSubscriptions(list: AsyncFnWithoutArgs[]) {
    this.startSubscriptionsList = list;
  }

  public setResetSubscriptions(list: FnWithoutArgs[]) {
    this.resetSubscriptionsList = list;
  }

  /**
   * Update subscriptions
   * If this page is loaded first time by url, "watch" & "mounted" call this method
   */
  private async updateSubscriptions(): Promise<void> {
    // return if updateSubscription is already called by "watch" or "mounted"
    if (this.loading) return;

    await this.withLoading(async () => {
      // wait for node connection & wallet init (App.vue)
      await this.withParentLoading(async () => {
        await Promise.all(this.startSubscriptionsList.map((fn) => fn?.()));
      });
    });
  }

  private async resetSubscriptions(): Promise<void> {
    await Promise.all(this.resetSubscriptionsList.map((fn) => fn?.()));
  }
}
