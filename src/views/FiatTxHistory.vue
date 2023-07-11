<template>
  <div class="container transaction-fiat-history" v-loading="parentLoading">
    <generic-page-header
      class="page-header-title--moonpay-history"
      @back="goTo(PageNames.FiatDepositOptions)"
      has-button-back
    >
      <template #title="">{{ t('fiatPayment.historyTitle') }}</template>
    </generic-page-header>
    <s-tabs v-if="x1Enabled" class="transaction-fiat-history-tabs" v-model="currentTab" type="rounded">
      <s-tab :key="moonpay" :label="getLabel(moonpay)" :name="moonpay" />
      <s-tab :key="x1" :label="getLabel(x1)" :name="x1" />
    </s-tabs>
    <component :is="currentTab" />
    <s-button v-if="!isLoggedIn" class="go-wallet-btn" type="primary" @click="goTo(PageNames.Wallet)">{{
      t('connectWalletText')
    }}</s-button>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { Components, PageNames } from '../consts';
import { goTo, lazyComponent } from '../router';
import { getter } from '../store/decorators';
import { FiatOptionTabs } from '../types/tabs';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    MoonpayHistory: lazyComponent(Components.MoonpayHistory),
    X1History: lazyComponent(Components.X1History),
  },
})
export default class FiatTxHistory extends Mixins(mixins.TranslationMixin, mixins.LoadingMixin) {
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.settings.x1Enabled x1Enabled!: boolean;

  FiatOptionTabs = FiatOptionTabs;

  currentTab = FiatOptionTabs.moonpay;

  goTo = goTo;
  PageNames = PageNames;

  get moonpay(): string {
    return FiatOptionTabs.moonpay;
  }

  get x1(): string {
    return FiatOptionTabs.x1ex;
  }

  getLabel(tab: string): string | undefined {
    if (tab === 'MoonpayHistory') return 'MoonPay';
    if (tab === 'X1History') return 'X1EX';
  }
}
</script>

<style lang="scss">
.transaction-fiat-history {
  @include custom-tabs;

  &-tabs {
    margin-bottom: $basic-spacing;
  }

  .go-wallet-btn {
    width: 100%;
  }
}
</style>
