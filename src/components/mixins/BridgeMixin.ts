import { Component, Mixins } from 'vue-property-decorator';
import { Action } from 'vuex-class';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import ethersUtil from '@/utils/ethers-util';
import { ethers } from 'ethers';

@Component
export default class BridgeMixin extends Mixins(mixins.LoadingMixin, WalletConnectMixin) {
  @Action('getEvmBalance', { namespace: 'web3' }) getEvmBalance!: AsyncVoidFn;
  @Action('getEvmNetworkFee', { namespace: 'bridge' }) getEvmNetworkFee!: AsyncVoidFn;
  @Action('getRegisteredAssets', { namespace: 'assets' }) getRegisteredAssets!: AsyncVoidFn;
  @Action('updateRegisteredAssets', { namespace: 'assets' }) updateRegisteredAssets!: AsyncVoidFn;

  private unwatchEthereum!: VoidFunction;
  blockHeadersSubscriber: ethers.providers.Web3Provider | undefined;

  async mounted(): Promise<void> {
    await this.setEvmNetworkType();
    await this.syncExternalAccountWithAppState();
    this.getEvmBalance();
    this.withApi(async () => {
      this.unwatchEthereum = await ethersUtil.watchEthereum({
        onAccountChange: (addressList: string[]) => {
          if (addressList.length) {
            this.switchExternalAccount({ address: addressList[0] });
            this.updateRegisteredAssets();
          } else {
            this.disconnectExternalAccount();
          }
        },
        onNetworkChange: (networkId: string) => {
          this.setEvmNetworkType(networkId);
          this.getEvmNetworkFee();
          this.getRegisteredAssets();
          this.getEvmBalance(); // update only evm balance because assets balances updated during getRegisteredAssets call
        },
        onDisconnect: () => {
          this.disconnectExternalAccount();
        },
      });
      this.subscribeToEvmBlockHeaders();
    });
  }

  beforeDestroy(): void {
    if (typeof this.unwatchEthereum === 'function') {
      this.unwatchEthereum();
    }
    this.unsubscribeEvmBlockHeaders();
  }

  updateExternalBalances(): void {
    this.getEvmBalance();
    this.updateRegisteredAssets();
  }

  async subscribeToEvmBlockHeaders(): Promise<void> {
    try {
      await this.unsubscribeEvmBlockHeaders();

      const ethersInstance = await ethersUtil.getEthersInstance();

      this.blockHeadersSubscriber = ethersInstance.on('block', (blockNumber) => {
        this.updateExternalBalances();
      });
    } catch (error) {
      console.error(error);
    }
  }

  unsubscribeEvmBlockHeaders(): Promise<void> {
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
