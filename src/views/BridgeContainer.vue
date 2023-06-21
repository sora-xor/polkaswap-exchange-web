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
import { ethers } from 'ethers';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { action, getter } from '@/store/decorators';
import ethersUtil from '@/utils/ethers-util';

@Component
export default class BridgeContainer extends Mixins(mixins.LoadingMixin, WalletConnectMixin, SubscriptionsMixin) {
  @action.bridge.getExternalNetworkFee private getExternalNetworkFee!: AsyncFnWithoutArgs;
  @action.bridge.updateEvmBlockNumber private updateEvmBlockNumber!: (block?: number) => Promise<void>;
  @action.assets.updateRegisteredAssets private updateRegisteredAssets!: AsyncFnWithoutArgs;
  @action.assets.updateExternalBalances private updateExternalBalances!: AsyncFnWithoutArgs;
  @action.web3.getSupportedApps private getSupportedApps!: AsyncFnWithoutArgs;
  @action.web3.restoreNetworkType restoreNetworkType!: AsyncFnWithoutArgs;
  @action.web3.restoreSelectedNetwork restoreSelectedNetwork!: AsyncFnWithoutArgs;

  @getter.web3.externalAccount private externalAccount!: string;

  @Watch('externalAccount')
  private updateAccountExternalBalances(): void {
    this.updateExternalBalances();
  }

  @Watch('networkSelected')
  private updateNetworkData(): void {
    this.onConnectedNetworkChange();
  }

  private unwatchEthereum!: FnWithoutArgs;
  private blockHeadersSubscriber: ethers.providers.Web3Provider | undefined;

  async created(): Promise<void> {
    this.setStartSubscriptions([this.subscribeToEvmBlockHeaders, this.subscribeOnEvm]);
    this.setResetSubscriptions([this.unsubscribeEvmBlockHeaders, this.unsubscribeFromEvm]);

    await this.withParentLoading(async () => {
      await this.getSupportedApps();
      await this.restoreNetworkType();
      await this.restoreSelectedNetwork();
      await this.connectExternalNetwork();
      await this.onConnectedNetworkChange();
    });
  }

  private async updateBalancesAndFees(): Promise<void> {
    await Promise.all([this.updateExternalBalances(), this.getExternalNetworkFee()]);
  }

  private async onConnectedNetworkChange() {
    await this.updateRegisteredAssets();
    await this.updateBalancesAndFees();
  }

  private async subscribeOnEvm(): Promise<void> {
    this.unwatchEthereum = await ethersUtil.watchEthereum({
      onAccountChange: (addressList: string[]) => {
        if (addressList.length) {
          this.setEvmAddress(addressList[0]);
        } else {
          this.disconnectEvmAccount();
        }
      },
      onNetworkChange: (networkHex: string) => {
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

  private async subscribeToEvmBlockHeaders(): Promise<void> {
    try {
      await this.unsubscribeEvmBlockHeaders();

      const ethersInstance = await ethersUtil.getEthersInstance();
      await this.updateEvmBlockNumber();

      this.blockHeadersSubscriber = ethersInstance.on('block', (blockNumber) => {
        this.updateEvmBlockNumber(blockNumber);
        this.updateBalancesAndFees();
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
