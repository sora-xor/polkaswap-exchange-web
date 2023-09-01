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
import { api, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { action, mutation } from '@/store/decorators';
import ethersUtil from '@/utils/ethers-util';

import type { Subscription } from 'rxjs';

@Component
export default class BridgeContainer extends Mixins(mixins.LoadingMixin, WalletConnectMixin, SubscriptionsMixin) {
  @action.web3.getSupportedApps private getSupportedApps!: AsyncFnWithoutArgs;
  @action.web3.restoreSelectedNetwork restoreSelectedNetwork!: AsyncFnWithoutArgs;
  @action.bridge.updateBalancesAndFees private updateBalancesAndFees!: AsyncFnWithoutArgs;
  @action.bridge.updateExternalBalance private updateExternalBalance!: AsyncFnWithoutArgs;
  @action.bridge.updateExternalBlockNumber private updateExternalBlockNumber!: AsyncFnWithoutArgs;
  @action.bridge.subscribeOnOutgoingLimitUSD private subscribeOnOutgoingLimitUSD!: AsyncFnWithoutArgs;
  @mutation.bridge.resetOutgoingLimitUSDSubscription private resetOutgoingLimitUSDSubscription!: FnWithoutArgs;

  private unwatchEthereum!: FnWithoutArgs;
  private blockHeadersSubscriber: Nullable<Subscription> = null;

  async created(): Promise<void> {
    this.setStartSubscriptions([
      this.subscribeOnSystemBlockUpdate,
      this.subscribeOnEvm,
      this.subscribeOnOutgoingLimitUSD,
    ]);
    this.setResetSubscriptions([
      this.unsubscribeFromSystemBlockUpdate,
      this.unsubscribeFromEvm,
      this.resetOutgoingLimitUSDSubscription,
    ]);

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

  private async subscribeOnSystemBlockUpdate(): Promise<void> {
    this.unsubscribeFromSystemBlockUpdate();

    this.blockHeadersSubscriber = api.system.getBlockNumberObservable().subscribe(() => {
      this.updateExternalBlockNumber();
      this.updateBalancesAndFees();
    });
  }

  private unsubscribeFromSystemBlockUpdate(): void {
    this.blockHeadersSubscriber?.unsubscribe();
    this.blockHeadersSubscriber = null;
  }
}
</script>
