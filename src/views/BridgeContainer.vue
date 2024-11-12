<template>
  <div class="bridge-container">
    <router-view
      v-bind="{
        parentLoading: subscriptionsDataLoading,
        ...$attrs,
      }"
      v-on="$listeners"
    />
    <confirm-dialog
      :chain-api="chainApi"
      :account="subAccount"
      :visibility="isSignTxDialogVisible"
      :set-visibility="setSignTxDialogVisibility"
    />
    <bridge-select-network />
  </div>
</template>

<script lang="ts">
import { components, mixins, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import isEqual from 'lodash/fp/isEqual';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { action, getter, mutation, state } from '@/store/decorators';
import type { NetworkData } from '@/types/bridge';
import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';

@Component({
  components: {
    ConfirmDialog: components.ConfirmDialog,
    BridgeSelectNetwork: lazyComponent(Components.BridgeSelectNetwork),
  },
})
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
  // bridge transaction signing
  @getter.web3.subAccount public subAccount!: WALLET_TYPES.PolkadotJsAccount;
  @state.bridge.subBridgeConnector private subBridgeConnector!: SubNetworksConnector;
  @state.bridge.isSignTxDialogVisible public isSignTxDialogVisible!: boolean;
  @mutation.bridge.setSignTxDialogVisibility public setSignTxDialogVisibility!: (flag: boolean) => void;

  trackLogin = false; // overrides SubscriptionsMixin property

  get chainApi() {
    return this.subBridgeConnector.accountApi;
  }

  @Watch('selectedNetwork')
  private onSelectedNetworkChange(curr: Nullable<NetworkData>, prev: Nullable<NetworkData>): void {
    if (curr && prev && !isEqual(curr)(prev)) {
      this.resetBridgeForm();
    }
  }

  @Watch('soraAddress')
  @Watch('externalAccount')
  private onExternalAccountChange(): void {
    this.updateExternalBalance();
  }

  async created(): Promise<void> {
    this.setStartSubscriptions([this.subscribeOnBlockUpdates, this.updateOutgoingMaxLimit, this.updateBridgeApps]);
    this.setResetSubscriptions([this.resetBlockUpdatesSubscription, this.resetOutgoingMaxLimitSubscription]);
  }

  beforeDestroy(): void {
    this.disconnectExternalNetwork();
  }

  /**
   * This is not subscription, but should be called after reconnect to node - so it's added to subscriptions list
   */
  private async updateBridgeApps(): Promise<void> {
    await this.getSupportedApps();
    // don't block ui while connecting to external network
    this.restoreSelectedNetwork();
  }
}
</script>
