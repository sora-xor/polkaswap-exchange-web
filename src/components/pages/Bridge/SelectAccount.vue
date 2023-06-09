<template>
  <dialog-base :visible.sync="visibility" :title="t('connection.selectAccount')" custom-class="account-select-dialog">
    <div class="account-select">
      <search-input
        ref="search"
        v-model="query"
        :placeholder="t('addressText')"
        autofocus
        @clear="handleClearSearch"
        class="asset-search"
      />

      <s-button
        class="s-typography-button--large account-select-button"
        type="primary"
        :disabled="!validAddress"
        @click="handleSelectAddress"
      >
        {{ t('saveText') }}
      </s-button>

      <connection-items v-loading="loading" :size="accountList.length" :visible="3">
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
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { api, mixins, components, WALLET_TYPES, WALLET_CONSTS, getWalletAccounts } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SearchInputMixin from '@/components/mixins/SearchInputMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state, mutation, getter } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
    SearchInput: components.SearchInput,
    WalletAccount: components.WalletAccount,
    ConnectionItems: components.ConnectionItems,
  },
})
export default class BridgeSelectAccount extends Mixins(mixins.LoadingMixin, TranslationMixin, SearchInputMixin) {
  @state.web3.selectAccountDialogVisibility private selectAccountDialogVisibility!: boolean;
  @mutation.web3.setSelectAccountDialogVisibility private setSelectAccountDialogVisibility!: (flag: boolean) => void;
  @mutation.web3.setSubAddress private setSubAddress!: (address: string) => void;

  @state.wallet.account.source private source!: Nullable<WALLET_CONSTS.AppWallet>;
  @getter.wallet.account.isConnectedAccount private isConnectedAccount!: (
    account: WALLET_TYPES.PolkadotJsAccount
  ) => boolean;

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
      this.clearAndFocusSearch();
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

  get validAddress(): boolean {
    return !!this.query && api.validateAddress(this.query);
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
    this.updateSubAccount(subAddress);
  }

  handleSelectAddress(): void {
    this.updateSubAccount(this.query);
  }

  private updateSubAccount(address: string): void {
    this.setSubAddress(address);
    this.visibility = false;
  }
}
</script>

<style lang="scss" scoped>
.account-select {
  display: flex;
  flex-flow: column nowrap;
  gap: $inner-spacing-medium;

  @include full-width-button('account-select-button', 0);
}
</style>
