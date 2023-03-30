import { Component, Watch, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import type { NavigationGuardNext, Route } from 'vue-router';

import { getter } from '@/store/decorators';

const isComponentReusedInRoute = (vm: Vue, route: Route): boolean => {
  const componentName = vm.$options.name;

  if (!componentName) return false;

  const componentSubscriptionsReused = route.matched.some((match) => {
    const name = (match.components.default as any).options?.name as string;
    return !!name && name === componentName;
  });

  return componentSubscriptionsReused;
};

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

  beforeRouteEnter(to: Route, from: Route, next: NavigationGuardNext<Vue>): void {
    next((vm) => {
      if (!isComponentReusedInRoute(vm, from)) {
        (vm as this).updateSubscriptions();
      }
    });
  }

  beforeRouteLeave(to: Route, from: Route, next: NavigationGuardNext<Vue>): void {
    if (!isComponentReusedInRoute(this, to)) {
      this.resetSubscriptions();
    }

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
