<template>
  <connection-items v-if="accountList.length" :size="accountList.length">
    <wallet-account
      v-for="{ account, isConnected } in accountList"
      :key="account.address"
      v-button
      :polkadot-account="account"
      :chain-api="chainApi"
      tabindex="0"
      @click="handleSelectAccount(account, isConnected)"
    >
      <s-button v-if="isConnected" size="small" disabled>
        {{ t('connection.wallet.connected') }}
      </s-button>

      <slot name="menu" v-bind="account"></slot>
    </wallet-account>

    <slot></slot>
  </connection-items>
</template>

<script lang="ts">
import { mixins, Options, Prop } from 'vue-property-decorator';

import { api } from '../../../api';
import WalletAccount from '../../Account/WalletAccount.vue';
import TranslationMixin from '../../mixins/TranslationMixin';

import ConnectionItems from './ConnectionItems.vue';

import type { AppWallet } from '../../../consts';
import type { PolkadotJsAccount } from '../../../types/common';
import type { WithConnectionApi } from '@sora-substrate/sdk';

@Options({
  components: {
    ConnectionItems,
    WalletAccount,
  },
})
export default class AccountConnectionList extends mixins(TranslationMixin) {
  @Prop({ default: () => [], type: Array }) private accounts!: Array<PolkadotJsAccount>;
  @Prop({ default: '', type: String }) private wallet!: AppWallet;
  @Prop({ default: () => false, type: Function }) private isConnected!: (account: PolkadotJsAccount) => boolean;
  @Prop({ default: () => api, type: Object }) readonly chainApi!: WithConnectionApi;

  get accountList() {
    return this.accounts.map((account) => {
      const source = this.wallet;
      const accountData = { ...account, source };

      return {
        account,
        isConnected: this.isConnected(accountData),
      };
    });
  }

  handleSelectAccount(account: PolkadotJsAccount, isConnected: boolean): void {
    this.$emit('select', account, isConnected);
  }
}
</script>
