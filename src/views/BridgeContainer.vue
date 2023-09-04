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
  @action.bridge.updateExternalBalance private updateExternalBalance!: AsyncFnWithoutArgs;
  @action.bridge.startBridgeSubscription private startBridgeSubscription!: AsyncFnWithoutArgs;
  @mutation.bridge.resetBridgeSubscription private resetBridgeSubscription!: FnWithoutArgs;

  private unwatchEthereum!: FnWithoutArgs;

  async created(): Promise<void> {
    this.setStartSubscriptions([this.subscribeOnEvm, this.startBridgeSubscription]);
    this.setResetSubscriptions([this.unsubscribeFromEvm, this.resetBridgeSubscription]);

    await this.withParentLoading(async () => {
      await this.getSupportedApps();
      await this.restoreSelectedNetwork();
      await this.connectExternalNetwork();
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
        this.connectExternalNetwork(networkHex);
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
