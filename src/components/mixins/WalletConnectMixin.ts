import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { PageNames } from '@/consts';
import type { EvmNetworkData } from '@/consts/evm';
import router from '@/router';
import { action, getter, mutation, state } from '@/store/decorators';
import { getWalletAddress, formatAddress } from '@/utils';
import ethersUtil, { Provider } from '@/utils/ethers-util';

import type { EvmNetwork } from '@sora-substrate/util/build/evm/types';

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

  @getter.web3.selectedEvmNetwork selectedEvmNetwork!: Nullable<EvmNetworkData>;

  // update selected evm network without metamask request
  @mutation.web3.setSelectedEvmNetwork setSelectedEvmNetwork!: (evmNetworkId: EvmNetwork) => void;
  @mutation.web3.resetEvmAddress private resetEvmAddress!: FnWithoutArgs;
  @mutation.web3.setEvmAddress setEvmAddress!: (address: string) => void;
  @mutation.web3.resetEvmNetwork private resetEvmNetwork!: FnWithoutArgs;
  @mutation.web3.resetEvmBalance private resetEvmBalance!: FnWithoutArgs;

  @action.web3.connectExternalAccount private connectExternalAccount!: (provider: Provider) => Promise<void>;
  @action.web3.updateEvmNetwork updateEvmNetwork!: AsyncFnWithoutArgs;
  @action.web3.connectEvmNetwork connectEvmNetwork!: (networkHex?: string) => Promise<void>;
  @action.web3.selectEvmNetwork selectEvmNetwork!: (networkId: EvmNetwork) => Promise<void>;
  @action.web3.restoreSelectedEvmNetwork restoreSelectedEvmNetwork!: AsyncFnWithoutArgs;
  @action.web3.restoreNetworkType restoreNetworkType!: AsyncFnWithoutArgs;

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

  async changeExternalWallet(options?: any): Promise<void> {
    // For now it's only Metamask
    if (this.isExternalWalletConnecting) {
      return;
    }
    this.isExternalWalletConnecting = true;
    try {
      this.setEvmAddress(options.address);
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
    this.resetEvmBalance();
  }

  disconnectExternalNetwork(): void {
    this.resetEvmNetwork();
  }
}
