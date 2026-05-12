<template>
  <widgets-grid
    :grid-id="gridId"
    class="swap-container"
    auto-resize
    :draggable="options.edit"
    :resizable="options.edit"
    :lines="options.edit"
    :loading="pageLoading"
    :default-layouts="DEFAULT_SWAP_LAYOUTS"
    v-model="widgets"
  >
    <template v-slot:[SwapWidgets.Form]="props">
      <swap-form-widget v-bind="props" primary-title full></swap-form-widget>
    </template>
    <template v-slot:[SwapWidgets.Chart]="props">
      <price-chart-widget
        v-bind="props"
        :base-asset="tokenFrom"
        :quote-asset="tokenTo"
        :is-available="isAvailable"
        full
      ></price-chart-widget>
    </template>
    <template v-slot:[SwapWidgets.Distribution]="props">
      <swap-distribution-widget v-bind="props" full></swap-distribution-widget>
    </template>
    <template v-slot:[SwapWidgets.TransactionDetails]="props">
      <swap-transaction-details-widget v-bind="props" full></swap-transaction-details-widget>
    </template>
    <template v-slot:[SwapWidgets.Transactions]="props">
      <swap-transactions-widget v-bind="props" full extensive></swap-transactions-widget>
    </template>
    <template v-slot:[SwapWidgets.Customise]="{ reset, ...props }">
      <customise-widget
        v-bind="props"
        v-model="customizePopper"
        v-model:widgets="widgets"
        v-model:options="options"
        :labels="labels"
        pip-disabled
        full
      >
        <s-button @click="reset">{{ t('resetText') }}</s-button>
      </customise-widget>
    </template>
    <template v-slot:[SwapWidgets.TokenPriceChart]="props">
      <token-price-chart-widget v-bind="props" full></token-price-chart-widget>
    </template>
    <template v-slot:[SwapWidgets.SupplyChart]="props">
      <supply-chart-widget v-bind="props" full></supply-chart-widget>
    </template>
  </widgets-grid>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import { useLoading } from '@/composables/useLoading';
import { usePiniaTelemetry } from '@/composables/usePiniaTelemetry';
import { useTranslation } from '@/composables/useTranslation';
import { resolveGlobalPinia } from '@/plugins/pinia';
import { createAsyncComponent } from '@/shared/ui/async';
import { CustomiseWidget, WidgetsGrid } from '@/shared/ui/widgets';

import SwapDistributionWidget from '../components/widgets/Distribution.vue';
import SwapFormWidget from '../components/widgets/Form.vue';
import { DEFAULT_SWAP_LAYOUTS, SwapWidgets } from '../constants/layout';
import { useSwapRouteSync } from '../composables/useSwapRouteSync';
import { useSwapPageStore } from '../stores/useSwapPageStore';
import { useSwapStore } from '../stores/useSwapStore';

defineOptions({ name: 'SwapPage' });

const PriceChartWidget = createAsyncComponent(() => import('@/components/shared/Widget/PriceChart.vue'));
const SupplyChartWidget = createAsyncComponent(() => import('@/components/shared/Widget/SupplyChart.vue'));
const TokenPriceChartWidget = createAsyncComponent(() => import('@/components/shared/Widget/TokenPriceChart.vue'));
const SwapTransactionDetailsWidget = createAsyncComponent(() => import('../components/widgets/TransactionDetails.vue'));
const SwapTransactionsWidget = createAsyncComponent(() => import('../components/widgets/Transactions.vue'));

const { t, tc } = useTranslation();
const { loading, withApi } = useLoading();
const swapStore = useSwapStore();
const swapPageStore = useSwapPageStore(resolveGlobalPinia());
const { customizePopper, options, widgets } = storeToRefs(swapPageStore);
const { tokenFrom, tokenTo, initializeSwapRouteState } = useSwapRouteSync(withApi);
const { gridId } = swapPageStore;

usePiniaTelemetry('swap', [{ store: swapStore, storeId: 'swap' }], {
  metadata: () => ({
    tokenFrom: tokenFrom.value?.symbol ?? null,
    tokenTo: tokenTo.value?.symbol ?? null,
  }),
});

const isAvailable = computed(() => swapStore.isPathAvailable || swapStore.isAvailable);
const labels = computed(() => {
  const priceText = t('priceChartText');
  const aSymbol = tokenFrom.value?.symbol ?? '';
  const bSymbol = tokenTo.value?.symbol ?? '';
  const tokensText =
    aSymbol && bSymbol ? [aSymbol, bSymbol].filter(Boolean).join('/') : `(${t('orderBook.tokenPair')})`;

  return {
    [SwapWidgets.Form]: t('swapText'),
    [SwapWidgets.Distribution]: t('swap.route'),
    [SwapWidgets.TransactionDetails]: t('transaction.title'),
    [SwapWidgets.Transactions]: tc('transactionText', 2),
    [SwapWidgets.Chart]: `${priceText} ${tokensText}`,
    [SwapWidgets.TokenPriceChart]: priceText,
    [SwapWidgets.SupplyChart]: t('createToken.tokenSupply.placeholder'),
    edit: t('editText'),
  };
});
const pageLoading = computed(() => loading.value);

void initializeSwapRouteState().catch((error) => {
  console.error('[swap] failed to initialize route tokens', error);
});
</script>

<style lang="scss" scoped>
.swap-container {
  height: 100%;
}
</style>
