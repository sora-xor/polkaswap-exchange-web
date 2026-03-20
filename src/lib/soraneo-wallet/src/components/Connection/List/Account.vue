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
import { defineComponent } from 'vue';

import { api } from '../../../api';
import WalletAccount from '../../Account/WalletAccount.vue';
import TranslationMixin from '../../mixins/TranslationMixin';

import ConnectionItems from './ConnectionItems.vue';

import type { AppWallet } from '../../../consts';
import type { PolkadotJsAccount } from '../../../types/common';
import type { WithConnectionApi } from '@sora-substrate/sdk';

export default defineComponent({
  components: {
    ConnectionItems,
    WalletAccount,
  },
  mixins: [TranslationMixin],
  props: {
    accounts: { default: () => [], type: Array as () => PolkadotJsAccount[] },
    wallet: { default: '', type: String as () => AppWallet },
    isConnected: { default: () => false, type: Function as () => (account: PolkadotJsAccount) => boolean },
    chainApi: { default: () => api, type: Object as () => WithConnectionApi },
  },
  emits: ['select'],
  computed: {
    accountList(this: any) {
      return this.accounts.map((account: PolkadotJsAccount) => {
        const source = this.wallet;
        const accountData = { ...account, source };

        return {
          account,
          isConnected: this.isConnected(accountData),
        };
      });
    },
  },
  methods: {
    handleSelectAccount(this: any, account: PolkadotJsAccount, isConnected: boolean): void {
      this.$emit('select', account, isConnected);
    },
  },
});
</script>
