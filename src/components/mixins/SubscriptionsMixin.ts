import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { getter } from '@/store/decorators';

import type { NavigationGuardNext, Route } from 'vue-router';

@Component
export default class SubscriptionsMixin extends Mixins(mixins.LoadingMixin) {
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;

  startSubscriptionsList: Array<AsyncFnWithoutArgs> = [];
  resetSubscriptionsList: Array<FnWithoutArgs> = [];

  trackLogin = true;
  watcherLogin: FnWithoutArgs | null = null;

  protected watchLogin(): void {
    if (!this.trackLogin) return;

    this.watcherLogin = this.$watch(
      () => this.isLoggedIn,
      (value: boolean) => this.restartSubscriptions(value)
    );
  }

  protected unwatchLogin(): void {
    this.watcherLogin?.();
    this.watcherLogin = null;
  }

  trackConnection = true;
  watcherConnection: FnWithoutArgs | null = null;

  protected watchConnection(): void {
    if (!this.trackConnection) return;

    this.watcherConnection = this.$watch(
      () => this.nodeIsConnected,
      (value: boolean) => this.restartSubscriptions(value)
    );
  }

  protected unwatchConnection(): void {
    this.watcherConnection?.();
    this.watcherConnection = null;
  }

  get subscriptionsDataLoading(): boolean {
    return this.parentLoading || this.loading;
  }

  beforeMount(): void {
    this.watchLogin();
    this.watchConnection();
    this.updateSubscriptions();
  }

  beforeDestroy(): void {
    this.unwatchLogin();
    this.unwatchConnection();
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

    await this.withApi(async () => {
      // wait for node connection & wallet init (App.vue)
      await this.withParentLoading(async () => {
        await Promise.all(this.startSubscriptionsList.map((fn) => fn?.()));
      });
    });
  }

  private async resetSubscriptions(): Promise<void> {
    await Promise.all(this.resetSubscriptionsList.map((fn) => fn?.()));
  }

  private async restartSubscriptions(value: boolean): Promise<void> {
    if (value) {
      await this.updateSubscriptions();
    } else {
      await this.resetSubscriptions();
    }
  }
}
