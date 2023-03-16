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
import ethersUtil from '@/utils/ethers-util';
import { bridgeApi } from '@/utils/bridge';
import { action } from '@/store/decorators';

@Component
export default class BridgeContainer extends Mixins(mixins.LoadingMixin, WalletConnectMixin) {
  @action.bridge.getEvmNetworkFee private getEvmNetworkFee!: AsyncFnWithoutArgs;
  @action.bridge.updateEvmBlockNumber private updateEvmBlockNumber!: (block?: number) => Promise<void>;
  @action.assets.updateRegisteredAssets private updateRegisteredAssets!: (reset?: boolean) => Promise<void>;

  private unwatchEthereum!: FnWithoutArgs;
  private blockHeadersSubscriber: ethers.providers.Web3Provider | undefined;

  async created(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        this.setEvmNetwork(bridgeApi.externalNetwork);
        await this.onEvmNetworkTypeChange();

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
            this.onEvmNetworkTypeChange(networkHex);
          },
          onDisconnect: () => {
            this.disconnectExternalAccount();
          },
        });
        this.subscribeToEvmBlockHeaders();
      });
    });
  }

  beforeDestroy(): void {
    if (typeof this.unwatchEthereum === 'function') {
      this.unwatchEthereum();
    }
    this.unsubscribeEvmBlockHeaders();
  }

  private updateExternalBalances(resetAssets?: boolean): void {
    this.updateRegisteredAssets(resetAssets);
  }

  private async onEvmNetworkTypeChange(networkHex?: string) {
    await Promise.all([this.setEvmNetworkType(networkHex), this.updateExternalBalances(true), this.getEvmNetworkFee()]);
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
