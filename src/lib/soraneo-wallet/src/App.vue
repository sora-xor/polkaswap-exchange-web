<template>
  <WalletProviders>
    <div id="app" class="app">
      <div class="buttons">
        <s-button class="theme-switch" @click="changeTheme">{{ libraryTheme }} theme</s-button>
        <s-button class="theme-switch" @click="changeIndexer">{{ indexerType }} indexer</s-button>
        <s-button class="theme-switch" @click="changeCeresFiatUsage">CERES fiat:{{ ceresFiatValuesUsage }}</s-button>
        <s-button class="hide-balance-switch" @click="toggleHideBalance">
          {{ shouldBalanceBeHidden ? 'hidden' : 'visible' }} balances
        </s-button>

        <select v-model="appCurrency">
          <option v-for="{ key } in currencies" :key="key" :value="key">{{ key }}</option>
        </select>
      </div>
      <div class="wallet-wrapper s-flex">
        <sora-wallet></sora-wallet>
      </div>
      <confirm-dialog
        :account="account"
        :chain-api="chainApi"
        :visibility="isSignTxDialogVisible"
        :set-visibility="setSignTxDialogVisibility"
      ></confirm-dialog>
    </div>
  </WalletProviders>
</template>

<script setup lang="ts">
// This file is only for local usage

import { FPNumber, HistoryItem } from '@sora-substrate/sdk';
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';

import { useWalletStore } from '@/stores/wallet';

import env from '../../../../public/env.json';

import { useTransaction } from './composables/useTransaction';
import { api } from './api';
import ConfirmDialog from './components/ConfirmDialog.vue';
import WalletProviders from './components/WalletProviders.vue';
import { SoraNetwork, IndexerType, Theme } from './consts';
import SoraWallet from './SoraWallet.vue';

import { initWallet } from './bootstrap';

import type { ApiKeysObject } from './types/common';
import type { Currency, CurrencyFields } from './types/currency';
import type { WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';

const walletStore = useWalletStore();
const { t, account, handleChangeTransaction } = useTransaction();

const assetsToNotifyQueue = computed(() => walletStore.assetsToNotifyQueue);
const ceresFiatValuesUsage = computed(() => walletStore.ceresFiatValuesUsage);
const indexerType = computed(() => walletStore.indexerType);
const currency = computed(() => walletStore.currency);
const currencies = computed(() => walletStore.currencies);
const isSignTxDialogVisible = computed(() => walletStore.isSignTxDialogVisible);
const libraryTheme = computed(() => walletStore.libraryTheme);
const shouldBalanceBeHidden = computed(() => walletStore.shouldBalanceBeHidden);
const chainApi = api;
const firstReadyTransaction = computed<Nullable<HistoryItem>>(() => walletStore.firstReadyTransaction);
const appCurrency = computed({
  get: (): Currency => currency.value,
  set: (value: Currency): void => {
    setFiatCurrency(value);
  },
});

function setSoraNetwork(network: SoraNetwork): void {
  walletStore.setSoraNetwork(network);
}

function setIndexerEndpoint(payload: { indexer: IndexerType; endpoint: string }): void {
  walletStore.setIndexerEndpoint(payload);
}

function toggleHideBalance(): void {
  walletStore.toggleHideBalance();
}

function setFiatCurrency(value: Currency): void {
  walletStore.setFiatCurrency(value);
}

function setIsDesktop(flag: boolean): void {
  walletStore.setIsDesktop(flag);
}

function setSignTxDialogVisibility(flag: boolean): void {
  walletStore.setSignTxDialogVisibility(flag);
}

function useCeresApiForFiatValues(flag: boolean): Promise<void> {
  return walletStore.useCeresApiForFiatValues(flag);
}

function notifyOnDeposit(payload: { asset: WhitelistArrayItem; message: string }): Promise<void> {
  return walletStore.notifyOnDeposit(payload);
}

function selectIndexer(type: IndexerType): Promise<void> {
  return walletStore.selectIndexer(type);
}

function setApiKeys(keys: ApiKeysObject): Promise<void> {
  return walletStore.setApiKeys(keys);
}

function toggleTheme(): Promise<void> {
  return walletStore.toggleTheme();
}

function subscribeOnExchangeRatesApi(): Promise<void> {
  return walletStore.subscribeOnExchangeRatesApi();
}

function resetNetworkSubscriptions(): Promise<void> {
  return walletStore.resetNetworkSubscriptions();
}

function resetInternalSubscriptions(): Promise<void> {
  return walletStore.resetInternalSubscriptions();
}

function changeTheme(): void {
  void toggleTheme();
}

function changeIndexer(): void {
  void selectIndexer(indexerType.value === IndexerType.SUBSQUID ? IndexerType.SUBQUERY : IndexerType.SUBSQUID);
}

function changeCeresFiatUsage(): void {
  void useCeresApiForFiatValues(!ceresFiatValuesUsage.value);
}

watch(assetsToNotifyQueue, (whitelistAssetArray: WhitelistArrayItem[]) => {
  if (!whitelistAssetArray.length) return;
  if ('Notification' in window) {
    void notifyOnDeposit({ asset: whitelistAssetArray[0], message: t('assetDeposit') });
  }
});

watch(
  firstReadyTransaction,
  (value, oldValue) => {
    handleChangeTransaction(value as Nullable<HistoryItem>, oldValue as Nullable<HistoryItem>);
  },
  { deep: true }
);

onMounted(() => {
  void (async () => {
    // setIsDesktop(true);
    await setApiKeys(env.API_KEYS as ApiKeysObject);
    setIndexerEndpoint({ indexer: IndexerType.SUBQUERY, endpoint: env.SUBQUERY_ENDPOINT });
    setIndexerEndpoint({ indexer: IndexerType.SUBSQUID, endpoint: env.SUBSQUID_ENDPOINT });
    setSoraNetwork(SoraNetwork.Dev);
    await initWallet({ appName: 'APP NAME HERE' });
    await subscribeOnExchangeRatesApi();
    const localeLanguage = navigator.language;
    FPNumber.DELIMITERS_CONFIG.thousand = Number(1000).toLocaleString(localeLanguage).substring(1, 2);
    FPNumber.DELIMITERS_CONFIG.decimal = Number(1.1).toLocaleString(localeLanguage).substring(1, 2);
  })();
});

onBeforeUnmount(() => {
  void resetNetworkSubscriptions();
  void resetInternalSubscriptions();
});
</script>

<style lang="scss">
html {
  min-height: 100%;
  background: var(--sora_sys_color_util_surface, var(--s-color-utility-surface));
}
</style>

<style scoped lang="scss">
.wallet-wrapper {
  margin: 40px auto;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
.buttons {
  display: flex;
  justify-content: space-between;
}
.theme-switch,
.hide-balance-switch {
  width: 185px;
  margin: 10px;
}
</style>
