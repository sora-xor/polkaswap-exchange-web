<template>
  <dialog-base :visible.sync="visibility" :title="t('connectEthereumWalletText')" append-to-body>
    <extension-connection-list
      :wallets="wallets"
      :connected-wallet="connectedWallet"
      :selected-wallet="selectedWallet"
      :selected-wallet-loading="selectedWalletLoading"
      @select="handleSelectProvider"
    />
  </dialog-base>
</template>

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { action, getter, state } from '@/store/decorators';
import type { AppEIPProvider } from '@/types/evm/provider';

import type { WalletInfo } from '@sora-test/wallet-connect/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    ExtensionConnectionList: components.ExtensionConnectionList,
  },
})
export default class SelectProviderDialog extends Mixins(WalletConnectMixin) {
  @state.web3.selectProviderDialogVisibility private selectProviderDialogVisibility!: boolean;
  @action.web3.subscribeOnEvmProviders private subscribeOnEvmProviders!: () => Promise<VoidFunction>;
  @getter.web3.appEvmProviders private appEvmProviders!: AppEIPProvider[];

  private providersSubscription: Nullable<VoidFunction> = null;

  @Watch('visibility')
  private async updateProviders(value: boolean): Promise<void> {
    if (value) {
      this.providersSubscription = await this.subscribeOnEvmProviders();
    } else {
      this.providersSubscription?.();
      this.providersSubscription = null;
    }
  }

  get visibility(): boolean {
    return this.selectProviderDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectProviderDialogVisibility(flag);
  }

  get wallets(): WalletInfo[] {
    return this.appEvmProviders.map((provider) => {
      return {
        extensionName: provider.uuid,
        title: provider.name,
        logo: {
          src: provider.icon,
          alt: provider.name,
        },
        installed: provider.installed,
        installUrl: provider.installUrl,
        chromeUrl: '', // to match type
        mozillaUrl: '', // to match type
      };
    });
  }

  get connectedWallet(): Nullable<string> {
    return this.evmProvider?.uuid ?? null;
  }

  get loadingWallet(): Nullable<string> {
    return this.evmProviderLoading?.uuid ?? null;
  }

  get selectedWallet(): Nullable<string> {
    return this.loadingWallet ?? this.connectedWallet;
  }

  get selectedWalletLoading(): boolean {
    return !!this.loadingWallet && !!this.selectedWallet && this.loadingWallet === this.selectedWallet;
  }

  async handleSelectProvider(wallet: WalletInfo): Promise<void> {
    const uuid = wallet.extensionName;
    const provider = this.appEvmProviders.find((provider) => provider.uuid === uuid);
    if (!provider) return;

    await this.connectEvmProvider(provider);
    this.visibility = false;
  }
}
</script>
