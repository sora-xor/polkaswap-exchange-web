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
import { Action } from 'vuex-class';
import { ethers } from 'ethers';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import ethersUtil from '@/utils/ethers-util';
import { bridgeApi } from '@/utils/bridge';

@Component
export default class BridgeContainer extends Mixins(mixins.LoadingMixin, WalletConnectMixin) {
  @Action('getEvmBalance', { namespace: 'web3' }) getEvmBalance!: AsyncVoidFn;
  @Action('getEvmNetworkFee', { namespace: 'bridge' }) getEvmNetworkFee!: AsyncVoidFn;
  @Action('updateEvmBlockNumber', { namespace: 'bridge' }) updateEvmBlockNumber!: (
    blockNumber?: number
  ) => Promise<void>;

  @Action('getRegisteredAssets', { namespace: 'assets' }) getRegisteredAssets!: AsyncVoidFn;
  @Action('updateRegisteredAssets', { namespace: 'assets' }) updateRegisteredAssets!: AsyncVoidFn;

  private unwatchEthereum!: VoidFunction;
  private blockHeadersSubscriber: ethers.providers.Web3Provider | undefined;

  async mounted(): Promise<void> {
    await this.syncExternalAccountWithAppState();

    this.withLoading(() =>
      this.withParentLoading(async () => {
        await this.setEvmNetwork(bridgeApi.externalNetwork);
        await this.onEvmNetworkTypeChange();

        this.unwatchEthereum = await ethersUtil.watchEthereum({
          onAccountChange: (addressList: string[]) => {
            if (addressList.length) {
              this.switchExternalAccount({ address: addressList[0] });
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
      })
    );
  }

  beforeDestroy(): void {
    if (typeof this.unwatchEthereum === 'function') {
      this.unwatchEthereum();
    }
    this.unsubscribeEvmBlockHeaders();
  }

  private updateExternalBalances(): void {
    this.getEvmBalance();
    this.updateRegisteredAssets();
  }

  private async onEvmNetworkTypeChange(networkHex?: string) {
    await Promise.all([
      this.setEvmNetworkType(networkHex),
      this.getRegisteredAssets(),
      this.getEvmNetworkFee(),
      this.getEvmBalance(),
    ]);
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
