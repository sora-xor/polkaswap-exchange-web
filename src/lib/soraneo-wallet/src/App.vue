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
import { Options, mixins, Watch } from 'vue-property-decorator';

import env from '../public/env.json';

import { api } from './api';
import ConfirmDialog from './components/ConfirmDialog.vue';
import TransactionMixin from './components/mixins/TransactionMixin';
import WalletProviders from './components/WalletProviders.vue';
import { SoraNetwork, IndexerType, Theme } from './consts';
import SoraWallet from './SoraWallet.vue';
import { state, mutation, getter, action } from './store/decorators';

import { initWallet } from './index';

import type { ApiKeysObject } from './types/common';
import type { Currency, CurrencyFields } from './types/currency';
import type { WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';

@Options({
  components: { SoraWallet, ConfirmDialog, WalletProviders },
})
export default class App extends mixins(TransactionMixin) {
  @state.account.assetsToNotifyQueue assetsToNotifyQueue!: Array<WhitelistArrayItem>;
  @state.settings.indexerType indexerType!: IndexerType;
  @state.account.ceresFiatValuesUsage ceresFiatValuesUsage!: boolean;
  @getter.transactions.firstReadyTx firstReadyTransaction!: Nullable<HistoryItem>;
  @getter.libraryTheme libraryTheme!: Theme;

  @mutation.settings.setSoraNetwork private setSoraNetwork!: (network: SoraNetwork) => void;
  @mutation.settings.setIndexerEndpoint private setIndexerEndpoint!: (options: {
    indexer: IndexerType;
    endpoint: string;
  }) => void;

  @mutation.account.setIsDesktop setIsDesktop!: (flag: boolean) => void;
  @mutation.settings.toggleHideBalance toggleHideBalance!: FnWithoutArgs;
  @action.account.useCeresApiForFiatValues private useCeresApiForFiatValues!: (flag: boolean) => void;
  @action.settings.selectIndexer private selectIndexer!: (IndexerType: IndexerType) => void;
  @action.settings.setApiKeys private setApiKeys!: (apiKeys: ApiKeysObject) => Promise<void>;
  @action.settings.toggleTheme private toggleThemeSetting!: () => Promise<void>;
  @action.subscriptions.resetNetworkSubscriptions private resetNetworkSubscriptions!: AsyncFnWithoutArgs;
  @action.subscriptions.resetInternalSubscriptions private resetInternalSubscriptions!: AsyncFnWithoutArgs;
  @action.account.notifyOnDeposit private notifyOnDeposit!: (info: {
    asset: WhitelistArrayItem;
    message: string;
  }) => Promise<void>;

  @state.settings.currency currency!: Currency;
  @state.settings.currencies currencies!: CurrencyFields[];
  @mutation.settings.setFiatCurrency setFiatCurrency!: (currency: Currency) => void;
  @action.settings.subscribeOnExchangeRatesApi private subscribeOnExchangeRatesApi!: AsyncFnWithoutArgs;

  @state.transactions.isSignTxDialogVisible public isSignTxDialogVisible!: boolean;
  @mutation.transactions.setSignTxDialogVisibility public setSignTxDialogVisibility!: (flag: boolean) => void;

  async created(): Promise<void> {
    // this.setIsDesktop(true);
    await this.setApiKeys(env.API_KEYS);
    this.setIndexerEndpoint({ indexer: IndexerType.SUBQUERY, endpoint: env.SUBQUERY_ENDPOINT });
    this.setIndexerEndpoint({ indexer: IndexerType.SUBSQUID, endpoint: env.SUBSQUID_ENDPOINT });
    this.setSoraNetwork(SoraNetwork.Dev);
    await initWallet({ withoutStore: true, appName: 'APP NAME HERE' }); // We don't need storage for local development
    await this.subscribeOnExchangeRatesApi();
    const localeLanguage = navigator.language;
    FPNumber.DELIMITERS_CONFIG.thousand = Number(1000).toLocaleString(localeLanguage).substring(1, 2);
    FPNumber.DELIMITERS_CONFIG.decimal = Number(1.1).toLocaleString(localeLanguage).substring(1, 2);
  }

  @Watch('assetsToNotifyQueue')
  private handleNotifyOnDeposit(whitelistAssetArray: WhitelistArrayItem[]): void {
    if (!whitelistAssetArray.length) return;
    if ('Notification' in window) {
      this.notifyOnDeposit({ asset: whitelistAssetArray[0], message: this.t('assetDeposit') });
    }
  }

  @Watch('firstReadyTransaction', { deep: true })
  private handleNotifyAboutTransaction(value: HistoryItem, oldValue: HistoryItem): void {
    this.handleChangeTransaction(value, oldValue);
  }

  beforeUnmount(): void {
    this.resetNetworkSubscriptions();
    this.resetInternalSubscriptions();
  }

  get chainApi() {
    return api;
  }

  changeTheme(): void {
    this.toggleThemeSetting();
  }

  changeIndexer() {
    this.selectIndexer(this.indexerType === IndexerType.SUBSQUID ? IndexerType.SUBQUERY : IndexerType.SUBSQUID);
  }

  changeCeresFiatUsage() {
    this.useCeresApiForFiatValues(!this.ceresFiatValuesUsage);
  }

  get appCurrency() {
    return this.currency;
  }

  set appCurrency(value) {
    this.setFiatCurrency(value);
  }
}
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
