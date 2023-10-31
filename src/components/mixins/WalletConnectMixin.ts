import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { PageNames } from '@/consts';
import router from '@/router';
import { action, getter, mutation, state } from '@/store/decorators';
import { getWalletAddress, formatAddress } from '@/utils';
import { Provider } from '@/utils/ethers-util';

import type { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';

const checkExtensionKey = 'provider.messages.checkExtension';
const installExtensionKey = 'provider.messages.installExtension';

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
  @state.web3.evmProvider evmProvider!: Nullable<Provider>;
  @state.web3.evmAddress evmAddress!: string;
  @state.web3.networkSelected networkSelected!: BridgeNetworkId;
  @state.web3.networkType networkType!: BridgeNetworkType;

  @getter.wallet.account.isLoggedIn isSoraAccountConnected!: boolean;
  @getter.bridge.isSubBridge isSubBridge!: boolean;

  @mutation.web3.setSelectAccountDialogVisibility private setSelectAccountDialogVisibility!: (flag: boolean) => void;
  @mutation.web3.setSelectProviderDialogVisibility setSelectProviderDialogVisibility!: (flag: boolean) => void;

  @action.web3.changeEvmNetworkProvided changeEvmNetworkProvided!: AsyncFnWithoutArgs;
  @action.web3.selectEvmProvider selectEvmProvider!: (provider: Provider) => Promise<void>;
  @action.web3.resetEvmProvider resetEvmProvider!: FnWithoutArgs;
  @action.web3.disconnectExternalNetwork disconnectExternalNetwork!: AsyncFnWithoutArgs;

  getWalletAddress = getWalletAddress;
  formatAddress = formatAddress;

  isExternalWalletConnecting = false;

  connectSoraWallet(): void {
    router.push({ name: PageNames.Wallet });
  }

  connectSubWallet(): void {
    this.setSelectAccountDialogVisibility(true);
  }

  connectEvmWallet(): void {
    this.setSelectProviderDialogVisibility(true);
  }

  getEvmProviderIcon(provider: Provider): string {
    return provider ? `/wallet/${provider}.svg` : '';
  }

  async connectEvmProvider(provider: Provider): Promise<void> {
    this.isExternalWalletConnecting = true;
    try {
      await this.selectEvmProvider(provider);
    } catch (error: any) {
      const key = this.te(error.message) ? error.message : handleProviderError(provider, error);

      const message = this.t(key, { name: provider });
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
