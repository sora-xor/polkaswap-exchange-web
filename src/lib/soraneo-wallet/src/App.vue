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
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';

import env from '../../../../public/env.json';

import { api } from './api';
import ConfirmDialog from './components/ConfirmDialog.vue';
import TransactionMixin from './components/mixins/TransactionMixin';
import WalletProviders from './components/WalletProviders.vue';
import { SoraNetwork, IndexerType, Theme } from './consts';
import SoraWallet from './SoraWallet.vue';

import { initWallet } from './index';

import type { ApiKeysObject } from './types/common';
import type { Currency, CurrencyFields } from './types/currency';
import type { WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';

export default defineComponent({
  components: { SoraWallet, ConfirmDialog, WalletProviders },
  mixins: [TransactionMixin],
  computed: {
    ...mapState('wallet/account', ['assetsToNotifyQueue', 'ceresFiatValuesUsage']),
    ...mapState('wallet/settings', ['indexerType', 'currency', 'currencies']),
    ...mapState('wallet/transactions', ['isSignTxDialogVisible']),
    ...mapGetters('wallet/transactions', ['firstReadyTx']),
    ...mapGetters('wallet/settings', ['libraryTheme']),
    chainApi() {
      return api;
    },
    firstReadyTransaction(this: any): Nullable<HistoryItem> {
      return this.firstReadyTx;
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
    await initWallet({ withoutStore: true, appName: 'APP NAME HERE' }); // We don't need storage for local development
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
    ...mapMutations('wallet/settings', [
      'setSoraNetwork',
      'setIndexerEndpoint',
      'toggleHideBalance',
      'setFiatCurrency',
    ]),
    ...mapMutations('wallet/account', ['setIsDesktop']),
    ...mapMutations('wallet/transactions', ['setSignTxDialogVisibility']),
    ...mapActions('wallet/account', ['useCeresApiForFiatValues', 'notifyOnDeposit']),
    ...mapActions('wallet/settings', ['selectIndexer', 'setApiKeys', 'toggleTheme', 'subscribeOnExchangeRatesApi']),
    ...mapActions('wallet/subscriptions', ['resetNetworkSubscriptions', 'resetInternalSubscriptions']),
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
