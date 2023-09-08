<template>
  <router-view
    v-bind="{
      parentLoading: loading,
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
import ethersUtil from '@/utils/ethers-util';

@Component
export default class BridgeContainer extends Mixins(mixins.LoadingMixin, WalletConnectMixin, SubscriptionsMixin) {
  @action.web3.getSupportedApps private getSupportedApps!: AsyncFnWithoutArgs;
  @action.web3.restoreSelectedNetwork private restoreSelectedNetwork!: AsyncFnWithoutArgs;
  @action.web3.disconnectExternalNetwork disconnectExternalNetwork!: AsyncFnWithoutArgs;
  @action.bridge.updateExternalBalance private updateExternalBalance!: AsyncFnWithoutArgs;
  @action.bridge.subscribeOnBlockUpdates private subscribeOnBlockUpdates!: AsyncFnWithoutArgs;
  @action.bridge.updateOutgoingMaxLimit private updateOutgoingMaxLimit!: AsyncFnWithoutArgs;
  @action.bridge.resetBridgeForm private resetBridgeForm!: AsyncFnWithoutArgs;
  @mutation.bridge.resetBlockUpdatesSubscription private resetBlockUpdatesSubscription!: FnWithoutArgs;
  @mutation.bridge.resetOutgoingMaxLimitSubscription private resetOutgoingMaxLimitSubscription!: FnWithoutArgs;
  @getter.web3.selectedNetwork private selectedNetwork!: Nullable<NetworkData>;
  @getter.web3.externalAccount private externalAccount!: string;

  private unwatchEthereum!: FnWithoutArgs;

  @Watch('selectedNetwork')
  private onSelectedNetworkChange(curr: Nullable<NetworkData>, prev: Nullable<NetworkData>) {
    if (curr && prev && !isEqual(curr)(prev)) {
      this.resetBridgeForm();
    }
  }

  @Watch('externalAccount')
  private onExternalAccountChange(address: string) {
    this.updateExternalBalance();
  }

  async created(): Promise<void> {
    this.setStartSubscriptions([this.subscribeOnEvm, this.subscribeOnBlockUpdates, this.updateOutgoingMaxLimit]);
    this.setResetSubscriptions([
      this.unsubscribeFromEvm,
      this.resetBlockUpdatesSubscription,
      this.resetOutgoingMaxLimitSubscription,
    ]);

    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        await this.getSupportedApps();
        await this.restoreSelectedNetwork();
      });
    });
  }

  beforeDestroy(): void {
    this.disconnectExternalNetwork();
  }

  private async subscribeOnEvm(): Promise<void> {
    this.unwatchEthereum = await ethersUtil.watchEthereum({
      onAccountChange: (addressList: string[]) => {
        if (addressList.length) {
          this.setEvmAddress(addressList[0]);
        } else {
          this.resetEvmAddress();
        }
      },
      onNetworkChange: async (networkHex: string) => {
        this.updateProvidedEvmNetwork(networkHex);
      },
      onDisconnect: () => {
        this.resetProvidedEvmNetwork();
      },
    });
  }

  private async unsubscribeFromEvm(): Promise<void> {
    if (typeof this.unwatchEthereum === 'function') {
      this.unwatchEthereum();
    }
  }
}
</script>
