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
import { Component, Mixins } from 'vue-property-decorator';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { action, mutation } from '@/store/decorators';
import ethersUtil from '@/utils/ethers-util';

@Component
export default class BridgeContainer extends Mixins(mixins.LoadingMixin, WalletConnectMixin, SubscriptionsMixin) {
  @action.web3.getSupportedApps private getSupportedApps!: AsyncFnWithoutArgs;
  @action.web3.restoreSelectedNetwork private restoreSelectedNetwork!: AsyncFnWithoutArgs;
  @action.web3.disconnectExternalNetwork disconnectExternalNetwork!: AsyncFnWithoutArgs;
  @action.bridge.updateExternalBalance private updateExternalBalance!: AsyncFnWithoutArgs;
  @action.bridge.subscribeOnBlockUpdates private subscribeOnBlockUpdates!: AsyncFnWithoutArgs;
  @action.bridge.updateOutgoingMaxLimit private updateOutgoingMaxLimit!: AsyncFnWithoutArgs;
  @mutation.bridge.resetBlockUpdatesSubscription private resetBlockUpdatesSubscription!: FnWithoutArgs;
  @mutation.bridge.resetOutgoingMaxLimitSubscription private resetOutgoingMaxLimitSubscription!: FnWithoutArgs;

  private unwatchEthereum!: FnWithoutArgs;

  async created(): Promise<void> {
    this.setStartSubscriptions([this.subscribeOnEvm, this.subscribeOnBlockUpdates, this.updateOutgoingMaxLimit]);
    this.setResetSubscriptions([
      this.unsubscribeFromEvm,
      this.resetBlockUpdatesSubscription,
      this.resetOutgoingMaxLimitSubscription,
    ]);

    await this.withParentLoading(async () => {
      await this.getSupportedApps();
      await this.restoreSelectedNetwork();
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
        this.updateExternalBalance();
      },
      onNetworkChange: async (networkHex: string) => {
        this.connectEvmNetwork(networkHex);
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
