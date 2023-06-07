<template>
  <div class="container transaction-fiat-history" v-loading="parentLoading">
    <generic-page-header
      class="page-header-title--moonpay-history"
      @back="goTo(PageNames.FiatDepositOptions)"
      has-button-back
    >
      <template #title="">Transaction History</template>
    </generic-page-header>
    <s-tabs class="transaction-fiat-history-tabs" v-model="currentTab" type="rounded">
      <s-tab v-for="tab in FiatOptionTabs" :key="tab" :label="t(`fiatPayment.${tab}`)" :name="tab" />
    </s-tabs>
    <component :is="currentTab" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import { Components, PageNames } from '@/consts';
import { goTo, lazyComponent } from '@/router';

import { FiatOptionTabs } from '@/types/tabs';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    MoonpayHistory: lazyComponent(Components.MoonpayHistory),
    X1History: lazyComponent(Components.X1History),
  },
})
export default class FiatTxHistory extends Mixins(mixins.TranslationMixin, mixins.LoadingMixin) {
  FiatOptionTabs = FiatOptionTabs;

  currentTab = FiatOptionTabs.moonpay;

  goTo = goTo;
  PageNames = PageNames;
}
</script>

<style lang="scss">
.transaction-fiat-history {
  @include custom-tabs;

  &-tabs {
    margin-bottom: 16px;
  }
}
</style>
