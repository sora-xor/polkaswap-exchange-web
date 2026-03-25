<template>
  <connection-view
    :chain-api="chainApi"
    :account="account"
    :login-account="loginAccount"
    :logout-account="logoutAccount"
    :rename-account="renameAccount"
    :check-connected-account-source="checkConnectedAccountSource"
    :close-view="navigateToAccount"
  ></connection-view>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { api } from '@/api';
import { RouteNames } from '@/consts';
import { useRouterStore } from '@/stores/router';
import { useWalletStore } from '@/stores/wallet';
import type { PolkadotJsAccount } from '@/types/common';

import ConnectionView from './Connection/ConnectionView.vue';

const routerStore = useRouterStore();
const walletStore = useWalletStore();

const chainApi = api;

const account = computed<Nullable<PolkadotJsAccount>>(() => walletStore.account as Nullable<PolkadotJsAccount>);

const loginAccount = (payload: PolkadotJsAccount) => walletStore.loginAccount(payload);
const logoutAccount = () => walletStore.logout();
const renameAccount = (data: { address: string; name: string }) => walletStore.renameAccount(data);
const checkConnectedAccountSource = (source: string) => walletStore.checkConnectedAccountSource(source);

const navigateToAccount = () => {
  routerStore.navigate({ name: RouteNames.Wallet });
};

defineExpose({
  loginAccount,
  logoutAccount,
  renameAccount,
  checkConnectedAccountSource,
  navigateToAccount,
});
</script>

<style lang="scss" scoped>
.learn-more-btn {
  width: 100%;
}
</style>
