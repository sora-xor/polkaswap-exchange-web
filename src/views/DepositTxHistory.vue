<template>
  <div class="container transaction-fiat-history" v-loading="parentLoading">
    <generic-page-header class="page-header-title--moonpay-history" @back="navigateToDepositOptions" has-button-back>
      <template #title="">{{ t('fiatPayment.historyTitle') }}</template>
    </generic-page-header>
    <component :is="currentTab"></component>
    <s-button v-if="!isLoggedIn" class="go-wallet-btn" type="primary" @click="connectSoraWallet">{{
      t('connectWalletText')
    }}</s-button>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

import { Components, PageNames } from '@/consts';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { goTo, lazyComponent } from '@/router';
import { FiatOptionTabs } from '@/types/tabs';

defineOptions({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    MoonpayHistory: lazyComponent(Components.MoonpayHistory),
  },
});

const { t } = useTranslation();
const { loading } = useLoading();
const { connectSoraWallet, isLoggedIn } = useInternalConnect();

const parentLoading = loading;
const currentTab = ref(FiatOptionTabs.moonpay);

const navigateToDepositOptions = () => {
  goTo(PageNames.DepositOptions);
};
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
