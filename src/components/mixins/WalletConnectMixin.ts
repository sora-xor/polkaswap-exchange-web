import { Component, Mixins } from 'vue-property-decorator';
import type { BridgeNetworks } from '@sora-substrate/util';

import router from '@/router';
import { getWalletAddress, formatAddress } from '@/utils';
import { PageNames } from '@/consts';
import ethersUtil, { Provider } from '@/utils/ethers-util';
import { action, getter, mutation, state } from '@/store/decorators';

import TranslationMixin from '@/components/mixins/TranslationMixin';

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
  @state.web3.evmAddress evmAddress!: string;

  @getter.wallet.account.isLoggedIn isSoraAccountConnected!: boolean;
  @getter.web3.isExternalAccountConnected isExternalAccountConnected!: boolean;

  @mutation.web3.resetEvmAddress private resetEvmAddress!: FnWithoutArgs;
  @mutation.web3.reset private resetWeb3Store!: FnWithoutArgs;
  @mutation.web3.setEvmNetwork setEvmNetwork!: (networkId: BridgeNetworks) => void;
  @mutation.web3.setEvmAddress switchExternalAccount!: (address: string) => void;

  @action.web3.connectExternalAccount private connectExternalAccount!: (provider: Provider) => Promise<void>;
  @action.web3.setEvmNetworkType setEvmNetworkType!: (network?: string) => Promise<void>;

  getWalletAddress = getWalletAddress;
  formatAddress = formatAddress;

  isExternalWalletConnecting = false;

  get areNetworksConnected(): boolean {
    return this.isSoraAccountConnected && this.isExternalAccountConnected;
  }

  connectInternalWallet(): void {
    router.push({ name: PageNames.Wallet });
  }

  async connectExternalWallet(): Promise<void> {
    // For now it's only Metamask
    const provider = Provider.Metamask;

    this.isExternalWalletConnecting = true;
    try {
      await this.connectExternalAccount(provider);
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

  // TODO: Check why we can't choose another account
  async changeExternalWallet(options?: any): Promise<void> {
    // For now it's only Metamask
    if (this.isExternalWalletConnecting) {
      return;
    }
    this.isExternalWalletConnecting = true;
    try {
      this.switchExternalAccount(options.address);
    } catch (error) {
      console.error(error);
    } finally {
      this.isExternalWalletConnecting = false;
    }
  }

  async checkConnectionToExternalAccount(func: FnWithoutArgs | AsyncFnWithoutArgs): Promise<void> {
    const connected = await ethersUtil.checkAccountIsConnected(this.evmAddress);

    if (!connected) {
      await this.connectExternalWallet();
    } else {
      await func();
    }
  }

  disconnectExternalAccount(): void {
    this.resetEvmAddress();
    this.resetWeb3Store();
  }
}
