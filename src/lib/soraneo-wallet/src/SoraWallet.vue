<template>
  <WalletProviders>
    <component
      :is="currentRoute"
      v-bind="$attrs"
      v-loading="loading"
      @swap="(asset) => handleOperation(Operations.Swap, asset)"
      @liquidity="(asset) => handleOperation(Operations.Liquidity, asset)"
      @bridge="(asset) => handleOperation(Operations.Bridge, asset)"
      @learn-more="handleLearnMore"
      @close="handleClose"
    />
  </WalletProviders>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue';

import { useLoading } from './composables/useLoading';
import { useRouterStore } from '@/stores/router';
import { useWalletStore } from '@/stores/wallet';

import AddAsset from './components/AddAsset/AddAsset.vue';
import CreateToken from './components/CreateToken.vue';
import ReceiveToken from './components/ReceiveToken.vue';
import SelectAsset from './components/SelectAsset.vue';
import Wallet from './components/Wallet.vue';
import WalletAssetDetails from './components/WalletAssetDetails.vue';
import WalletConnection from './components/WalletConnection.vue';
import WalletProviders from './components/WalletProviders.vue';
import WalletSend from './components/WalletSend.vue';
import WalletTransactionDetails from './components/WalletTransactionDetails.vue';
import { RouteNames } from './consts';
import { Operations } from './types/common';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

defineOptions({
  inheritAttrs: false,
});

const emit = defineEmits<{
  close: [];
  swap: [asset: AccountAsset];
  liquidity: [asset: AccountAsset];
  bridge: [asset: AccountAsset];
  'learn-more': [];
}>();

const walletStore = useWalletStore();
const routerStore = useRouterStore();
const { loading, withApi } = useLoading({
  isWalletLoaded: () => walletStore.isWalletLoaded,
});

const routeComponents = {
  [RouteNames.WalletConnection]: WalletConnection,
  [RouteNames.WalletSend]: WalletSend,
  [RouteNames.Wallet]: Wallet,
  [RouteNames.WalletAssetDetails]: WalletAssetDetails,
  [RouteNames.CreateToken]: CreateToken,
  [RouteNames.ReceiveToken]: ReceiveToken,
  [RouteNames.AddAsset]: AddAsset,
  [RouteNames.SelectAsset]: SelectAsset,
} as const satisfies Record<RouteNames, Component>;

const currentRoute = computed<Component>(() => {
  const routeName = (routerStore.current as RouteNames | null) ?? RouteNames.WalletConnection;
  return routeComponents[routeName];
});

void withApi(() => Promise.resolve()); // We need it just for loading state

function handleClose(): void {
  emit('close');
}

function handleOperation(operation: Operations, asset: AccountAsset): void {
  emit(operation, asset);
}

function handleLearnMore(): void {
  emit('learn-more');
}
</script>
