<template>
  <sora-wallet
    v-loading="parentLoading"
    class="container container--wallet"
    @close="handleClose"
    @swap="handleSwap"
    @liquidity="handleLiquidity"
    @bridge="handleBridge"
  ></sora-wallet>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';

import { FPNumber } from '@sora-substrate/math';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api, WALLET_CONSTS } from '@wallet';

import { PageNames } from '@/consts';
import store from '@/store';
import { useRouterStore } from '@/stores/router';
import { useWalletStore } from '@/stores/wallet';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

const routerStore = useRouterStore();
const walletStore = useWalletStore();
const vueRouter = useRouter();
const route = useRoute();

const parentLoading = ref(false);

const isLoggedIn = computed(() => walletStore.isLoggedIn);
const whitelist = computed(() => walletStore.whitelist);
const whitelistIdsBySymbol = computed(() => walletStore.whitelistIdsBySymbol);
const getAsset = (address?: string) => store.getters.assets.assetDataByAddress(address) as AccountAsset;

const setSwapFromAsset = (address?: string) => store.dispatch.swap.setTokenFromAddress(address);
const setSwapToAsset = () => store.dispatch.swap.setTokenToAddress();
const setAddliquidityAssetA = (address: string) => store.dispatch.addLiquidity.setFirstTokenAddress(address);

const tryNavigate = () => {
  try {
    if (!isLoggedIn.value) return;
    const page = route.query.page;
    if (page !== 'send') return;
    const to = route.query.to as string | undefined;
    const amountQuery = route.query.amount;
    const amount = typeof amountQuery === 'string' ? new FPNumber(amountQuery || 0).toString() : undefined;
    const assetId = whitelistIdsBySymbol.value[(route.query.asset as string)?.toUpperCase()];
    if (!assetId) return;
    const asset = getAsset(assetId);
    routerStore.navigate({
      name: WALLET_CONSTS.RouteNames.WalletSend,
      params: { address: to, amount, asset },
    });
  } catch (error) {
    console.warn('[WALLET] Navigate issue:', error);
  }
};

onMounted(() => {
  tryNavigate();
});

onBeforeRouteUpdate((to, from, next) => {
  next();
  tryNavigate();
});

const handleClose = () => {
  vueRouter.back();
};

const handleSwap = async (asset: AccountAsset) => {
  await setSwapFromAsset(asset.address);
  await setSwapToAsset();
  vueRouter.push({ name: PageNames.Swap });
};

const handleLiquidity = async (asset: AccountAsset) => {
  if (api.dex.baseAssetsIds.includes(asset.address)) {
    setAddliquidityAssetA(asset.address);
    vueRouter.push({ name: PageNames.AddLiquidity });
    return;
  }

  const assetAAddress = XOR.address;
  const assetBAddress = asset.address;

  const first = whitelist.value[assetAAddress]?.symbol ?? assetAAddress;
  const second = whitelist.value[assetBAddress]?.symbol ?? assetBAddress;
  const params = { first, second };

  vueRouter.push({ name: PageNames.AddLiquidity, params });
};

const handleBridge = (asset: AccountAsset) => {
  vueRouter.push({ name: PageNames.Bridge, params: { address: asset.address } });
};
</script>

<style lang="scss">
.container--wallet {
  .history .history-items {
    padding: 0 $inner-spacing-mini;
  }
  .s-icon-basic-check-mark-24 {
    @include icon-styles;
  }

  @include large-mobile(true) {
    .account-credentials_description {
      .account-credentials_address {
        .first {
          width: 36px;
        }
      }
    }
  }
}
</style>
