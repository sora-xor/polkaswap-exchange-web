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
import { requireAppStore } from '@/utils/app-store';
import { useRouterStore } from '@/stores/router';
import type { Route } from '@/store/router/types';
import type { PolkadotJsAccount } from '@/types/common';

import ConnectionView from './Connection/ConnectionView.vue';

const routerStore = useRouterStore();
const store = requireAppStore();

const chainApi = api;

const account = computed<Nullable<PolkadotJsAccount>>(
  () => store.getters['wallet/account/account'] as Nullable<PolkadotJsAccount>
);

const loginAccount = (payload: PolkadotJsAccount) => store.dispatch.wallet.account.loginAccount(payload);
const logoutAccount = () => store.dispatch.wallet.account.logout();
const renameAccount = (data: { address: string; name: string }) => store.dispatch.wallet.account.renameAccount(data);
const checkConnectedAccountSource = (source: string) =>
  store.dispatch.wallet.account.checkConnectedAccountSource(source);

const navigateToAccount = () => {
  routerStore.navigate({ name: RouteNames.Wallet } as Route);
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
