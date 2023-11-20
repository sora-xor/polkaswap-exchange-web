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
import { mixins } from '@soramitsu/soraneo-wallet-web';
import isEqual from 'lodash/fp/isEqual';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { action, mutation, getter } from '@/store/decorators';
import type { NetworkData } from '@/types/bridge';

@Component
export default class BridgeContainer extends Mixins(mixins.LoadingMixin, WalletConnectMixin, SubscriptionsMixin) {
  @action.web3.getSupportedApps private getSupportedApps!: AsyncFnWithoutArgs;
  @action.web3.restoreSelectedNetwork private restoreSelectedNetwork!: AsyncFnWithoutArgs;
  @action.bridge.updateExternalBalance private updateExternalBalance!: AsyncFnWithoutArgs;
  @action.bridge.subscribeOnBlockUpdates private subscribeOnBlockUpdates!: AsyncFnWithoutArgs;
  @action.bridge.updateOutgoingMaxLimit private updateOutgoingMaxLimit!: AsyncFnWithoutArgs;
  @action.bridge.resetBridgeForm private resetBridgeForm!: AsyncFnWithoutArgs;
  @mutation.bridge.resetBlockUpdatesSubscription private resetBlockUpdatesSubscription!: FnWithoutArgs;
  @mutation.bridge.resetOutgoingMaxLimitSubscription private resetOutgoingMaxLimitSubscription!: FnWithoutArgs;
  @getter.web3.selectedNetwork private selectedNetwork!: Nullable<NetworkData>;
  @getter.bridge.externalAccount private externalAccount!: string;

  @Watch('selectedNetwork')
  private onSelectedNetworkChange(curr: Nullable<NetworkData>, prev: Nullable<NetworkData>): void {
    if (curr && prev && !isEqual(curr)(prev)) {
      this.resetBridgeForm();
    }
  }

  @Watch('externalAccount')
  private onExternalAccountChange(): void {
    this.updateExternalBalance();
  }

  async created(): Promise<void> {
    this.setStartSubscriptions([this.subscribeOnBlockUpdates, this.updateOutgoingMaxLimit]);
    this.setResetSubscriptions([this.resetBlockUpdatesSubscription, this.resetOutgoingMaxLimitSubscription]);

    await this.withParentLoading(async () => {
      await this.getSupportedApps();
      await this.restoreSelectedNetwork();
    });
  }

  beforeDestroy(): void {
    this.disconnectExternalNetwork();
  }
}
</script>
