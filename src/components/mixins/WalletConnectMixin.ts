import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { PageNames } from '@/consts';
import router from '@/router';
import { action, getter, mutation, state } from '@/store/decorators';
import type { NetworkData } from '@/types/bridge';
import { getWalletAddress, formatAddress } from '@/utils';
import { Provider } from '@/utils/ethers-util';

import type { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

const checkExtensionKey = 'provider.messages.checkExtension';
const installExtensionKey = 'provider.messages.installExtension';

const getProviderName = (provider: Provider) => {
  switch (provider) {
    case Provider.Metamask:
      return 'provider.metamask';
    default:
      return 'provider.default';
  }
};

const handleProviderError = (provider: Provider, error: any): string => {
  switch (provider) {
    case Provider.Metamask:
      return handleMetamaskError(error);
    default:
      return checkExtensionKey;
  }
};

const handleMetamaskError = (error: any): string => {
  switch (error.code) {
    // 4001: User rejected the request
    // -32002: Already processing eth_requestAccounts. Please wait
    // -32002: Request of type 'wallet_requestPermissions' already pending for origin. Please wait
    case -32002:
    case 4001:
      return 'provider.messages.extensionLogin';
    default:
      return checkExtensionKey;
  }
};

@Component
export default class WalletConnectMixin extends Mixins(TranslationMixin) {
  @state.web3.subAddress subAddress!: string;
  @state.web3.evmAddress evmAddress!: string;
  @state.web3.networkSelected networkSelected!: BridgeNetworkId;
  @state.web3.networkType networkType!: BridgeNetworkType;

  @getter.wallet.account.isLoggedIn isSoraAccountConnected!: boolean;
  @getter.web3.selectedNetwork selectedNetwork!: Nullable<NetworkData>;

  @getter.bridge.isSubBridge isSubBridge!: boolean;

  // update selected evm network without metamask request
  @mutation.web3.setSelectedNetwork setSelectedNetwork!: (networkId: BridgeNetworkId) => void;
  @mutation.web3.resetProvidedEvmNetwork resetProvidedEvmNetwork!: FnWithoutArgs;
  @mutation.web3.resetEvmAddress resetEvmAddress!: FnWithoutArgs;
  @mutation.web3.setEvmAddress setEvmAddress!: (address: string) => void;
  @mutation.web3.setSelectAccountDialogVisibility private setSelectAccountDialogVisibility!: (flag: boolean) => void;

  @action.web3.connectEvmAccount private connectEvmAccount!: (provider: Provider) => Promise<void>;
  @action.web3.updateNetworkProvided updateNetworkProvided!: AsyncFnWithoutArgs;
  @action.web3.connectEvmNetwork connectEvmNetwork!: (networkHex?: string) => Promise<void>;

  getWalletAddress = getWalletAddress;
  formatAddress = formatAddress;

  isExternalWalletConnecting = false;

  connectSoraWallet(): void {
    router.push({ name: PageNames.Wallet });
  }

  connectSubWallet(): void {
    this.setSelectAccountDialogVisibility(true);
  }

  async connectEvmWallet(): Promise<void> {
    this.isExternalWalletConnecting = true;
    // For now it's only Metamask
    const provider = Provider.Metamask;
    try {
      await this.connectEvmAccount(provider);
    } catch (error: any) {
      const name = this.t(getProviderName(provider));
      const key = this.te(error.message) ? error.message : handleProviderError(provider, error);

      const message = this.t(key, { name });
      const showCancelButton = key === installExtensionKey;

      this.$alert(message, {
        showCancelButton,
        cancelButtonText: this.t('provider.messages.reloadPage'),
        callback: (action) => {
          if (action === 'cancel') {
            router.go(0);
          }
        },
      });
    } finally {
      this.isExternalWalletConnecting = false;
    }
  }
}
