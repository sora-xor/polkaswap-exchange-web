<template>
  <div class="container transaction-fiat-history" v-loading="parentLoading">
    <generic-page-header class="page-header-title--moonpay-history" @back="navigateToDepositOptions" has-button-back>
      <template #title="">{{ t('fiatPayment.historyTitle') }}</template>
    </generic-page-header>
    <component :is="currentTab" />
    <s-button v-if="!isLoggedIn" class="go-wallet-btn" type="primary" @click="connectSoraWallet">{{
      t('connectWalletText')
    }}</s-button>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import InternalConnectMixin from '@/components/mixins/InternalConnectMixin';

import { Components, PageNames } from '../consts';
import { goTo, lazyComponent } from '../router';
import { FiatOptionTabs } from '../types/tabs';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    MoonpayHistory: lazyComponent(Components.MoonpayHistory),
  },
})
export default class DepositTxHistory extends Mixins(InternalConnectMixin, mixins.LoadingMixin) {
  FiatOptionTabs = FiatOptionTabs;

  currentTab = FiatOptionTabs.moonpay;

  PageNames = PageNames;

  get moonpay(): string {
    return FiatOptionTabs.moonpay;
  }

  navigateToDepositOptions(): void {
    goTo(PageNames.DepositOptions);
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
