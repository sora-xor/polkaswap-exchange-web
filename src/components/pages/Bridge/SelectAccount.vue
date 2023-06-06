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
import { api, mixins, components, WALLET_TYPES, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state, action, mutation } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
    SearchInput: components.SearchInput,
    WalletAccount: components.WalletAccount,
    ConnectionItems: components.ConnectionItems,
  },
})
export default class BridgeSelectAccount extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  @action.wallet.account.subscribeToWalletAccounts private subscribe!: AsyncFnWithoutArgs;

  @mutation.wallet.account.setSelectedWallet private setSelectedWallet!: (
    wallet?: WALLET_CONSTS.AppWallet
  ) => Promise<void>;

  @mutation.wallet.account.resetWalletAccountsSubscription private unsubscribe!: FnWithoutArgs;
  @mutation.web3.setSelectAccountDialogVisibility private setSelectAccountDialogVisibility!: (flag: boolean) => void;
  @mutation.web3.setSubAddress private setSubAddress!: (address: string) => void;

  @state.wallet.account.source private source!: Nullable<WALLET_CONSTS.AppWallet>;
  @state.wallet.account.polkadotJsAccounts polkadotJsAccounts!: Array<WALLET_TYPES.PolkadotJsAccount>;
  @state.web3.subAddress private subAddress!: string;
  @state.web3.selectAccountDialogVisibility private selectAccountDialogVisibility!: boolean;

  get visibility(): boolean {
    return this.selectAccountDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectAccountDialogVisibility(flag);
  }

  @Watch('visibility')
  private async updateAccountsSubscription(visibility: boolean): Promise<void> {
    await this.withLoading(async () => {
      if (visibility && this.source) {
        this.setSelectedWallet(this.source);
        await this.subscribe();
      } else {
        this.setSelectedWallet();
        this.unsubscribe();
      }
    });
  }

  get accountList() {
    return this.polkadotJsAccounts.map((account) => ({
      account,
      isConnected: this.isConnectedAccount(account),
    }));
  }

  private isConnectedAccount(account: WALLET_TYPES.PolkadotJsAccount): boolean {
    return api.formatAddress(account.address) === this.subAddress;
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
