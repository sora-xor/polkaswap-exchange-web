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
import { Component, Mixins } from 'vue-property-decorator';
import { ethers } from 'ethers';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import ethersUtil from '@/utils/ethers-util';
import { action } from '@/store/decorators';

@Component
export default class BridgeContainer extends Mixins(mixins.LoadingMixin, WalletConnectMixin, SubscriptionsMixin) {
  @action.bridge.getEvmNetworkFee private getEvmNetworkFee!: AsyncFnWithoutArgs;
  @action.bridge.updateEvmBlockNumber private updateEvmBlockNumber!: (block?: number) => Promise<void>;
  @action.bridge.subscribeOnHistory subscribeOnHistory!: AsyncFnWithoutArgs;
  @action.bridge.unsubscribeFromHistory unsubscribeFromHistory!: AsyncFnWithoutArgs;
  @action.assets.updateRegisteredAssets private updateExternalBalances!: (reset?: boolean) => Promise<void>;

  private unwatchEthereum!: FnWithoutArgs;
  private blockHeadersSubscriber: ethers.providers.Web3Provider | undefined;

  async created(): Promise<void> {
    this.setStartSubscriptions([this.subscribeOnHistory, this.subscribeToEvmBlockHeaders, this.subscribeOnEvm]);
    this.setResetSubscriptions([this.unsubscribeFromHistory, this.unsubscribeEvmBlockHeaders, this.unsubscribeFromEvm]);

    await this.withParentLoading(async () => {
      await this.restoreSelectedEvmNetwork();
      await this.onConnectedEvmNetworkChange();
    });
  }

  private async onConnectedEvmNetworkChange(networkHex?: string) {
    await Promise.all([this.connectEvmNetwork(networkHex), this.updateExternalBalances(true), this.getEvmNetworkFee()]);
  }

  private async subscribeOnEvm(): Promise<void> {
    this.unwatchEthereum = await ethersUtil.watchEthereum({
      onAccountChange: (addressList: string[]) => {
        if (addressList.length) {
          this.switchExternalAccount(addressList[0]);
          this.updateExternalBalances();
        } else {
          this.disconnectExternalAccount();
        }
      },
      onNetworkChange: (networkHex: string) => {
        this.onConnectedEvmNetworkChange(networkHex);
      },
      onDisconnect: () => {
        this.disconnectExternalAccount();
      },
    });
  }

  private async unsubscribeFromEvm(): Promise<void> {
    if (typeof this.unwatchEthereum === 'function') {
      this.unwatchEthereum();
    }
  }

  private async subscribeToEvmBlockHeaders(): Promise<void> {
    try {
      await this.unsubscribeEvmBlockHeaders();

      const ethersInstance = await ethersUtil.getEthersInstance();
      await this.updateEvmBlockNumber();

      this.blockHeadersSubscriber = ethersInstance.on('block', (blockNumber) => {
        this.updateEvmBlockNumber(blockNumber);
        this.updateExternalBalances();
        this.getEvmNetworkFee();
      });
    } catch (error) {
      console.error(error);
    }
  }

  private unsubscribeEvmBlockHeaders(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.blockHeadersSubscriber) return resolve();

      try {
        this.blockHeadersSubscriber.off('block');
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}
</script>
