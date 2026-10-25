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

<script setup lang="ts">
import { computed } from 'vue';

import { useWalletTranslation } from '../../../composables/useWalletTranslation';
import { api } from '../../../api';
import WalletAccount from '../../Account/WalletAccount.vue';

import ConnectionItems from './ConnectionItems.vue';

import type { AppWallet } from '../../../consts';
import type { PolkadotJsAccount } from '../../../types/common';
import type { WithConnectionApi } from '@sora-substrate/sdk';

const props = withDefaults(
  defineProps<{
    accounts?: PolkadotJsAccount[];
    wallet?: AppWallet | '';
    isConnected?: (account: PolkadotJsAccount) => boolean;
    chainApi?: WithConnectionApi;
  }>(),
  {
    accounts: () => [],
    wallet: '',
    isConnected: () => false,
    chainApi: () => api,
  }
);

const emit = defineEmits<{
  select: [account: PolkadotJsAccount, isConnected: boolean];
}>();

const { t } = useWalletTranslation();

const accountList = computed(() => {
  return props.accounts.map((account: PolkadotJsAccount) => {
    const source = props.wallet;
    const accountData = { ...account, source };

    return {
      account,
      isConnected: props.isConnected(accountData),
    };
  });
});

function handleSelectAccount(account: PolkadotJsAccount, isConnected: boolean): void {
  emit('select', account, isConnected);
}
</script>
