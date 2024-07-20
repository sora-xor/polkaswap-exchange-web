<template>
  <dialog-base :visible.sync="visibility" :title="t('connectEthereumWalletText')" append-to-body>
    <extension-connection-list
      :wallets="wallets"
      :connected-wallet="evmProvider"
      :selected-wallet="selectedProvider"
      :selected-wallet-loading="!!evmProviderLoading"
      @select="handleSelectProvider"
    />
  </dialog-base>
</template>

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import { state } from '@/store/decorators';
import { Provider } from '@/utils/ethers-util';

import type { WalletInfo } from '@sora-test/wallet-connect/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    ExtensionConnectionList: components.ExtensionConnectionList,
  },
})
export default class SelectProviderDialog extends Mixins(WalletConnectMixin) {
  @state.wallet.account.isDesktop isDesktop!: boolean;
  @state.web3.selectProviderDialogVisibility private selectProviderDialogVisibility!: boolean;

  get visibility(): boolean {
    return this.selectProviderDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectProviderDialogVisibility(flag);
  }

  get allowedProviders(): Provider[] {
    if (this.isDesktop) {
      return [Provider.WalletConnect];
    }

    return [Provider.Metamask, Provider.SubWallet, Provider.TrustWallet, Provider.WalletConnect];
  }

  get wallets(): WalletInfo[] {
    return Object.keys(Provider)
      .filter((key) => this.allowedProviders.includes(key as Provider))
      .map((key) => {
        const provider = Provider[key];

        return {
          extensionName: provider,
          title: provider,
          chromeUrl: '',
          mozillaUrl: '',
          logo: {
            src: this.getEvmProviderIcon(provider),
            alt: provider,
          },
        };
      });
  }

  get selectedProvider(): Nullable<Provider> {
    return this.evmProviderLoading ?? this.evmProvider;
  }

  handleSelectProvider(wallet: WalletInfo): void {
    this.connectEvmProvider(wallet.extensionName as Provider);
    this.visibility = false;
  }
}
</script>
