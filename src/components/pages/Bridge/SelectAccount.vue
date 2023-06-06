<template>
  <dialog-base :visible.sync="visibility" :title="t('connection.selectAccount')" custom-class="account-select-dialog">
    <connection-items v-loading="loading" :size="accountList.length">
      <wallet-account
        v-button
        v-for="{ account, isConnected } in accountList"
        :key="account.address"
        :polkadotAccount="account"
        tabindex="0"
        @click.native="handleSelectAccount(account)"
      >
        <s-button v-if="isConnected" size="small" disabled>
          {{ t('connection.wallet.connected') }}
        </s-button>
      </wallet-account>
    </connection-items>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { api, mixins, components, WALLET_TYPES, WALLET_CONSTS, getWalletAccounts } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state, mutation } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
    SearchInput: components.SearchInput,
    WalletAccount: components.WalletAccount,
    ConnectionItems: components.ConnectionItems,
  },
})
export default class BridgeSelectAccount extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @state.web3.selectAccountDialogVisibility private selectAccountDialogVisibility!: boolean;
  @mutation.web3.setSelectAccountDialogVisibility private setSelectAccountDialogVisibility!: (flag: boolean) => void;

  @state.web3.subAddress private subAddress!: string;
  @mutation.web3.setSubAddress private setSubAddress!: (address: string) => void;

  @state.wallet.account.source private source!: Nullable<WALLET_CONSTS.AppWallet>;

  private accounts: Array<WALLET_TYPES.PolkadotJsAccount> = [];

  get visibility(): boolean {
    return this.selectAccountDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectAccountDialogVisibility(flag);
  }

  @Watch('visibility')
  private updateAccountsSubscription(visibility: boolean): void {
    if (visibility) {
      this.getAccounts();
    } else {
      this.resetAccounts();
    }
  }

  get accountList() {
    return this.accounts.map((account) => ({
      account,
      isConnected: this.isConnectedAccount(account),
    }));
  }

  private isConnectedAccount(account: WALLET_TYPES.PolkadotJsAccount): boolean {
    return api.formatAddress(account.address) === this.subAddress;
  }

  private async getAccounts(): Promise<void> {
    await this.withLoading(async () => {
      try {
        if (!this.source) return;
        this.accounts = await getWalletAccounts(this.source);
      } catch {
        this.resetAccounts();
        this.visibility = false;
      }
    });
  }

  private resetAccounts(): void {
    this.accounts = [];
  }

  handleSelectAccount(account: WALLET_TYPES.PolkadotJsAccount): void {
    const subAddress = api.formatAddress(account.address);
    this.setSubAddress(subAddress);
    this.visibility = false;
  }
}
</script>

<style lang="scss">
.account-select-dialog {
  .connection-items {
    min-height: 60px;
  }
}
</style>
