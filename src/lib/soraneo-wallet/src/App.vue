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

<script lang="ts">
// This file is only for local usage

import { FPNumber, HistoryItem } from '@sora-substrate/sdk';
import { defineComponent } from 'vue';

import { useWalletStore } from '@/stores/wallet';

import env from '../../../../public/env.json';

import { api } from './api';
import ConfirmDialog from './components/ConfirmDialog.vue';
import TransactionMixin from './components/mixins/TransactionMixin';
import WalletProviders from './components/WalletProviders.vue';
import { SoraNetwork, IndexerType, Theme } from './consts';
import SoraWallet from './SoraWallet.vue';

import { initWallet } from './bootstrap';

import type { ApiKeysObject } from './types/common';
import type { Currency, CurrencyFields } from './types/currency';
import type { WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';

export default defineComponent({
  components: { SoraWallet, ConfirmDialog, WalletProviders },
  mixins: [TransactionMixin],
  computed: {
    walletStore(this: any) {
      return useWalletStore(this.$pinia);
    },
    assetsToNotifyQueue(this: any) {
      return this.walletStore.assetsToNotifyQueue;
    },
    ceresFiatValuesUsage(this: any) {
      return this.walletStore.ceresFiatValuesUsage;
    },
    indexerType(this: any) {
      return this.walletStore.indexerType;
    },
    currency(this: any) {
      return this.walletStore.currency;
    },
    currencies(this: any) {
      return this.walletStore.currencies;
    },
    isSignTxDialogVisible(this: any) {
      return this.walletStore.isSignTxDialogVisible;
    },
    libraryTheme(this: any) {
      return this.walletStore.libraryTheme;
    },
    chainApi() {
      return api;
    },
    firstReadyTransaction(this: any): Nullable<HistoryItem> {
      return this.walletStore.firstReadyTransaction;
    },
    appCurrency: {
      get(this: any): Currency {
        return this.currency;
      },
      set(this: any, value: Currency): void {
        this.setFiatCurrency(value);
      },
    },
  },
  watch: {
    assetsToNotifyQueue(this: any, whitelistAssetArray: WhitelistArrayItem[]): void {
      if (!whitelistAssetArray.length) return;
      if ('Notification' in window) {
        void this.notifyOnDeposit({ asset: whitelistAssetArray[0], message: this.t('assetDeposit') });
      }
    },
    firstReadyTransaction: {
      deep: true,
      handler(this: any, value: HistoryItem, oldValue: HistoryItem): void {
        this.handleChangeTransaction(value, oldValue);
      },
    },
  },
  async created(this: any): Promise<void> {
    // this.setIsDesktop(true);
    await this.setApiKeys(env.API_KEYS as ApiKeysObject);
    this.setIndexerEndpoint({ indexer: IndexerType.SUBQUERY, endpoint: env.SUBQUERY_ENDPOINT });
    this.setIndexerEndpoint({ indexer: IndexerType.SUBSQUID, endpoint: env.SUBSQUID_ENDPOINT });
    this.setSoraNetwork(SoraNetwork.Dev);
    await initWallet({ appName: 'APP NAME HERE' });
    await this.subscribeOnExchangeRatesApi();
    const localeLanguage = navigator.language;
    FPNumber.DELIMITERS_CONFIG.thousand = Number(1000).toLocaleString(localeLanguage).substring(1, 2);
    FPNumber.DELIMITERS_CONFIG.decimal = Number(1.1).toLocaleString(localeLanguage).substring(1, 2);
  },
  beforeUnmount(this: any): void {
    void this.resetNetworkSubscriptions();
    void this.resetInternalSubscriptions();
  },
  methods: {
    setSoraNetwork(this: any, network: SoraNetwork): void {
      this.walletStore.setSoraNetwork(network);
    },
    setIndexerEndpoint(this: any, payload: { indexer: IndexerType; endpoint: string }): void {
      this.walletStore.setIndexerEndpoint(payload);
    },
    toggleHideBalance(this: any): void {
      this.walletStore.toggleHideBalance();
    },
    setFiatCurrency(this: any, value: Currency): void {
      this.walletStore.setFiatCurrency(value);
    },
    setIsDesktop(this: any, flag: boolean): void {
      this.walletStore.setIsDesktop(flag);
    },
    setSignTxDialogVisibility(this: any, flag: boolean): void {
      this.walletStore.setSignTxDialogVisibility(flag);
    },
    useCeresApiForFiatValues(this: any, flag: boolean): Promise<void> {
      return this.walletStore.useCeresApiForFiatValues(flag);
    },
    notifyOnDeposit(this: any, payload: { asset: WhitelistArrayItem; message: string }): Promise<void> {
      return this.walletStore.notifyOnDeposit(payload);
    },
    selectIndexer(this: any, type: IndexerType): Promise<void> {
      return this.walletStore.selectIndexer(type);
    },
    setApiKeys(this: any, keys: ApiKeysObject): Promise<void> {
      return this.walletStore.setApiKeys(keys);
    },
    toggleTheme(this: any): Promise<void> {
      return this.walletStore.toggleTheme();
    },
    subscribeOnExchangeRatesApi(this: any): Promise<void> {
      return this.walletStore.subscribeOnExchangeRatesApi();
    },
    resetNetworkSubscriptions(this: any): Promise<void> {
      return this.walletStore.resetNetworkSubscriptions();
    },
    resetInternalSubscriptions(this: any): Promise<void> {
      return this.walletStore.resetInternalSubscriptions();
    },
    changeTheme(this: any): void {
      void this.toggleTheme();
    },
    changeIndexer(this: any): void {
      void this.selectIndexer(this.indexerType === IndexerType.SUBSQUID ? IndexerType.SUBQUERY : IndexerType.SUBSQUID);
    },
    changeCeresFiatUsage(this: any): void {
      void this.useCeresApiForFiatValues(!this.ceresFiatValuesUsage);
    },
  },
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
