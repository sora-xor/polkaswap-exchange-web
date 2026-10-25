<template>
  <div class="container transaction-fiat-history" v-loading="parentLoading">
    <GenericPageHeader class="page-header-title--moonpay-history" @back="navigateToDepositOptions" has-button-back>
      <template #title="">{{ t('fiatPayment.historyTitle') }}</template>
    </GenericPageHeader>
    <component :is="currentTab"></component>
    <s-button v-if="!isLoggedIn" class="go-wallet-btn" type="primary" @click="connectSoraWallet">{{
      t('connectWalletText')
    }}</s-button>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useInternalConnect } from '@/composables/useInternalConnect';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { PageNames } from '@/consts';
import { createAsyncComponent } from '@/shared/ui/async';
import { FiatOptionTabs } from '@/types/tabs';
import DepositMoonpayHistory from '@/features/deposit/components/moonpay/MoonpayHistory.vue';

const GenericPageHeader = createAsyncComponent(() => import('@/components/shared/GenericPageHeader.vue'));

export default defineComponent({
  name: 'DepositTxHistoryPage',
  components: {
    GenericPageHeader,
    MoonpayHistory: DepositMoonpayHistory,
  },
  setup() {
    const router = useRouter();
    const { t } = useTranslation();
    const { loading } = useLoading();
    const { connectSoraWallet, isLoggedIn } = useInternalConnect();

    const parentLoading = loading;
    const currentTab = ref(FiatOptionTabs.moonpay);

    const navigateToDepositOptions = async (): Promise<void> => {
      await router.push({ name: PageNames.DepositOptions });
    };

    return {
      connectSoraWallet,
      currentTab,
      isLoggedIn,
      navigateToDepositOptions,
      parentLoading,
      t,
    };
  },
});
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
