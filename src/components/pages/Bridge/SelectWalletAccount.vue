<template>
  <div class="select-wallet-account">
    <extension-connection-list v-if="isExtensionsView" :wallets="wallets.external" @select="handleSelectWallet" />
    <account-connection-list v-else :accounts="accountsRecords" :wallet="source" @select="handleSelectAccount" />
  </div>
</template>

<script lang="ts">
import { api, components, accountUtils } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, ModelSync } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { action, getter } from '@/store/decorators';

import type { Wallet } from '@sora-test/wallet-connect/types';

@Component({
  components: {
    AccountConnectionList: components.AccountConnectionList,
    ExtensionConnectionList: components.ExtensionConnectionList,
  },
})
export default class BridgeSelectWalletAccount extends Mixins(TranslationMixin) {
  @getter.wallet.account.wallets wallets!: { internal: Wallet[]; external: Wallet[] };

  @action.web3.selectSubAccount private selectSubAccount!: (accountData: any) => Promise<void>;

  isExtensionsView = true;

  selectedWallet: Nullable<Wallet> = null;

  accountsSubscription: Nullable<any> = null;
  accountsRecords: any[] = [];

  get source() {
    return this.selectedWallet?.extensionName;
  }

  async handleSelectWallet(wallet: Wallet) {
    this.selectedWallet = wallet;

    await this.createAccountsSubscription();

    this.isExtensionsView = false;
  }

  async handleSelectAccount(account: any) {
    await this.selectSubAccount(account);
  }

  async createAccountsSubscription(): Promise<void> {
    this.resetAccountsSubscription();

    if (!this.source) return;

    this.accountsSubscription = await accountUtils.subscribeToWalletAccounts(api, this.source as any, (accounts) => {
      this.accountsRecords = accounts;
    });
  }

  resetAccountsSubscription(): void {
    if (this.accountsSubscription) {
      this.accountsSubscription();
      this.accountsSubscription = null;
    }
  }

  beforeDestroy(): void {
    this.resetAccountsSubscription();
  }
}
</script>
