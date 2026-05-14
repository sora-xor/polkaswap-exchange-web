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
import { computed, onMounted, ref, watch } from 'vue';
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';

import { FPNumber } from '@sora-substrate/math';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api } from '@/lib/soraneo-wallet/src/api';

import { PageNames, RouteNames } from '@/consts';
import { useAssetsStore } from '@/stores/assets';
import { usePoolStore } from '@/stores/pool';
import { useSwapStore } from '@/stores/swap';
import { useWalletStore } from '@/stores/wallet';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

const poolStore = usePoolStore();
const swapStore = useSwapStore();
const walletStore = useWalletStore();
const assetsStore = useAssetsStore();
const vueRouter = useRouter();
const route = useRoute();

const parentLoading = ref(false);

const isLoggedIn = computed(() => walletStore.isLoggedIn);
const whitelist = computed(() => walletStore.whitelist);
const whitelistIdsBySymbol = computed(() => walletStore.whitelistIdsBySymbol);
const getAsset = (address?: string) => assetsStore.assetDataByAddress(address) as AccountAsset;

const setSwapFromAsset = (address?: string) => swapStore.setTokenFromAddress(address);
const setSwapToAsset = () => swapStore.setTokenToAddress();
const setAddliquidityAssetA = async (address: string) => await poolStore.setAddLiquidityFirstTokenAddress(address);

const ensureWalletRoute = (): void => {
  walletStore.syncWalletRoute();
};

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
    walletStore.navigate({
      name: RouteNames.WalletSend,
      params: { address: to, amount, asset },
    });
  } catch (error) {
    console.warn('[WALLET] Navigate issue:', error);
  }
};

onMounted(() => {
  ensureWalletRoute();
  tryNavigate();
});

onBeforeRouteUpdate((to, from, next) => {
  next();
  ensureWalletRoute();
  tryNavigate();
});

watch(
  () => ({
    isLoggedIn: isLoggedIn.value,
    page: route.query.page,
    asset: route.query.asset,
    to: route.query.to,
    amount: route.query.amount,
    whitelistSize: Object.keys(whitelistIdsBySymbol.value ?? {}).length,
  }),
  () => {
    tryNavigate();
  }
);

const handleClose = () => {
  vueRouter.back();
};

const handleSwap = async (asset?: AccountAsset) => {
  try {
    setSwapFromAsset(asset?.address);
    setSwapToAsset();
  } catch (error) {
    console.warn('[WALLET] Swap setup issue:', error);
  }

  await vueRouter.push({ name: PageNames.Swap });
};

const handleLiquidity = async (asset: AccountAsset) => {
  if (api.dex.baseAssetsIds.includes(asset.address)) {
    await setAddliquidityAssetA(asset.address);
    await vueRouter.push({ name: PageNames.AddLiquidity });
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

.app-main--wallet {
  .app-content {
    padding-bottom: calc(#{$footer-height} + #{$inner-spacing-medium});
  }

  .app-body-scrollbar > .el-scrollbar__bar.is-vertical,
  .container--wallet .el-scrollbar__bar.is-vertical {
    opacity: 0 !important;
  }
}
</style>
