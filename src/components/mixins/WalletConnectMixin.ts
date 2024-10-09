import { Component, Mixins } from 'vue-property-decorator';

import InternalConnectMixin from '@/components/mixins/InternalConnectMixin';
import router from '@/router';
import { action, getter, mutation, state } from '@/store/decorators';
import type { AppEIPProvider } from '@/types/evm/provider';
import { installExtensionKey, handleRpcProviderError } from '@/utils/ethers-util';

import type { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';

@Component
export default class WalletConnectMixin extends Mixins(InternalConnectMixin) {
  @state.web3.evmProvider evmProvider!: Nullable<AppEIPProvider>;
  @state.web3.evmProviderLoading evmProviderLoading!: Nullable<AppEIPProvider>;
  @state.web3.evmAddress evmAddress!: string;
  @state.web3.networkSelected networkSelected!: BridgeNetworkId;
  @state.web3.networkType networkType!: BridgeNetworkType;

  @getter.bridge.isSubBridge isSubBridge!: boolean;
  @getter.bridge.isSubAccountType isSubAccountType!: boolean;

  @mutation.web3.setSubAccountDialogVisibility setSubAccountDialogVisibility!: (flag: boolean) => void;
  @mutation.web3.setSelectProviderDialogVisibility setSelectProviderDialogVisibility!: (flag: boolean) => void;

  @action.web3.changeEvmNetworkProvided changeEvmNetworkProvided!: AsyncFnWithoutArgs;
  @action.web3.selectEvmProvider selectEvmProvider!: (appEvmProvider: AppEIPProvider) => Promise<void>;
  @action.web3.disconnectExternalNetwork disconnectExternalNetwork!: AsyncFnWithoutArgs;

  @action.web3.resetEvmProviderConnection disconnectEvmWallet!: FnWithoutArgs;
  @action.web3.resetSubAccount disconnectSubWallet!: FnWithoutArgs;

  connectSubWallet(): void {
    this.setSubAccountDialogVisibility(true);
  }

  connectEvmWallet(): void {
    this.setSelectProviderDialogVisibility(true);
  }

  getEvmProviderIcon(appEvmProvider: AppEIPProvider): string {
    return appEvmProvider.icon;
  }

  async connectEvmProvider(appEvmProvider: AppEIPProvider): Promise<void> {
    try {
      await this.selectEvmProvider(appEvmProvider);
    } catch (error: any) {
      const key = this.te(error.message) ? error.message : handleRpcProviderError(error);
      const message = this.t(key, { name: appEvmProvider.name });
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
    }
  }
}
