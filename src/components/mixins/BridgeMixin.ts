import { Component, Mixins } from 'vue-property-decorator';
import { Action, Getter, State } from 'vuex-class';
import { ethers } from 'ethers';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { BridgeNetworks } from '@sora-substrate/util';
import type { CodecString } from '@sora-substrate/util';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import ethersUtil from '@/utils/ethers-util';
import { bridgeApi } from '@/utils/bridge';
import { EvmSymbol } from '@/consts';

@Component
export default class BridgeMixin extends Mixins(mixins.LoadingMixin, WalletConnectMixin) {
  @State((state) => state.bridge.evmNetworkFee) evmNetworkFee!: CodecString;

  @Getter('isValidNetworkType', { namespace: 'web3' }) isValidNetworkType!: boolean;
  @Getter('evmNetwork', { namespace: 'web3' }) evmNetwork!: BridgeNetworks;
  @Getter('evmBalance', { namespace: 'web3' }) evmBalance!: CodecString;
  @Getter('soraNetworkFee', { namespace: 'bridge' }) soraNetworkFee!: CodecString;
  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: any;

  @Action('getEvmBalance', { namespace: 'web3' }) getEvmBalance!: AsyncVoidFn;
  @Action('getEvmNetworkFee', { namespace: 'bridge' }) getEvmNetworkFee!: AsyncVoidFn;
  @Action('getRegisteredAssets', { namespace: 'assets' }) getRegisteredAssets!: AsyncVoidFn;
  @Action('updateRegisteredAssets', { namespace: 'assets' }) updateRegisteredAssets!: AsyncVoidFn;

  public evmBlockNumber = 0;
  private unwatchEthereum!: VoidFunction;
  blockHeadersSubscriber: ethers.providers.Web3Provider | undefined;

  async mounted(): Promise<void> {
    await this.syncExternalAccountWithAppState();

    this.withApi(async () => {
      await this.onEvmNetworkChange(bridgeApi.externalNetwork);

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
    });
  }

  beforeDestroy(): void {
    if (typeof this.unwatchEthereum === 'function') {
      this.unwatchEthereum();
    }
    this.unsubscribeEvmBlockHeaders();
  }

  get evmTokenSymbol(): string {
    if (this.evmNetwork === BridgeNetworks.ENERGY_NETWORK_ID) {
      return EvmSymbol.VT;
    }
    return EvmSymbol.ETH;
  }

  updateExternalBalances(): void {
    this.getEvmBalance();
    this.updateRegisteredAssets();
  }

  async onEvmNetworkChange(networkId: number): Promise<void> {
    await this.setEvmNetwork(networkId);
    await this.onEvmNetworkTypeChange();
  }

  async onEvmNetworkTypeChange(networkHex?: string) {
    await Promise.all([
      this.setEvmNetworkType(networkHex),
      this.getRegisteredAssets(),
      this.getEvmNetworkFee(),
      this.getEvmBalance(),
    ]);
  }

  async subscribeToEvmBlockHeaders(): Promise<void> {
    try {
      await this.unsubscribeEvmBlockHeaders();

      const ethersInstance = await ethersUtil.getEthersInstance();

      this.evmBlockNumber = await ethersInstance.getBlockNumber();
      this.blockHeadersSubscriber = ethersInstance.on('block', (blockNumber) => {
        this.evmBlockNumber = blockNumber;
        this.updateExternalBalances();
        this.getEvmNetworkFee();
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
