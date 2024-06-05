<template>
  <div class="container transaction-fiat-history" v-loading="parentLoading">
    <generic-page-header
      class="page-header-title--moonpay-history"
      @back="goTo(PageNames.DepositOptions)"
      has-button-back
    >
      <template #title="">{{ t('fiatPayment.historyTitle') }}</template>
    </generic-page-header>
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
  },
})
export default class DepositTxHistory extends Mixins(mixins.TranslationMixin, mixins.LoadingMixin) {
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  FiatOptionTabs = FiatOptionTabs;

  currentTab = FiatOptionTabs.moonpay;

  goTo = goTo;
  PageNames = PageNames;

  get moonpay(): string {
    return FiatOptionTabs.moonpay;
  }

  getLabel(tab: string): string | undefined {
    if (tab === 'MoonpayHistory') return 'MoonPay';
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
