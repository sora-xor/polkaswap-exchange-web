<template>
  <widgets-grid
    :grid-id="SWAP_GRID_ID"
    class="swap-container"
    :draggable="options.edit"
    :resizable="options.edit"
    :lines="options.edit"
    :loading="pageLoading"
    :default-layouts="DefaultLayouts"
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
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed, ref, watch } from 'vue';

import { useLoading } from '@/composables/useLoading';
import { usePiniaTelemetry } from '@/composables/usePiniaTelemetry';
import { useSelectedTokensRoute } from '@/composables/useSelectedTokensRoute';
import { useSwapAmounts } from '@/composables/useSwapAmounts';
import { useTranslation } from '@/composables/useTranslation';
import { Components, PageNames } from '@/consts';
import { lazyComponent } from '@/router';
import store from '@/store';
import { useSwapStore } from '@/stores/swap';
import type { ResponsiveLayouts, WidgetsVisibilityModel } from '@/types/layout';
import { normalizeSwapRouteTokens } from '@/views/utils/normalizeSwapRouteTokens';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

enum SwapWidgets {
  Customise = 'customise',
  Form = 'swapForm',
  Chart = 'swapChart',
  Distribution = 'swapDistribution',
  TransactionDetails = 'swapTransactionDetails',
  Transactions = 'swapTransactions',
  TokenPriceChart = 'swapTokenPriceChart',
  SupplyChart = 'swapSupplyChart',
}

const SwapFormWidget = lazyComponent(Components.SwapFormWidget);
const SwapTransactionsWidget = lazyComponent(Components.SwapTransactionsWidget);
const SwapTransactionDetailsWidget = lazyComponent(Components.SwapTransactionDetailsWidget);
const SwapDistributionWidget = lazyComponent(Components.SwapDistributionWidget);
const CustomiseWidget = lazyComponent(Components.CustomiseWidget);
const PriceChartWidget = lazyComponent(Components.PriceChartWidget);
const TokenPriceChartWidget = lazyComponent(Components.TokenPriceChartWidget);
const SupplyChartWidget = lazyComponent(Components.SupplyChartWidget);
const WidgetsGrid = lazyComponent(Components.WidgetsGrid);

defineOptions({ name: 'SwapPage' });

const { t, tc } = useTranslation();
const { loading, withApi } = useLoading();
const swapStore = useSwapStore();
const { tokenFrom, tokenTo, setTokenFromAddress, setTokenToAddress } = useSwapAmounts();

usePiniaTelemetry('swap', [{ store: swapStore, storeId: 'swap' }], {
  metadata: () => ({
    tokenFrom: tokenFrom.value?.symbol ?? null,
    tokenTo: tokenTo.value?.symbol ?? null,
  }),
});

const customizePopper = ref(false);
const options = ref({ edit: false });
const widgets = ref<WidgetsVisibilityModel>({
  [SwapWidgets.Chart]: true,
  [SwapWidgets.Distribution]: true,
  [SwapWidgets.TransactionDetails]: false,
  [SwapWidgets.Transactions]: false,
  [SwapWidgets.TokenPriceChart]: false,
  [SwapWidgets.SupplyChart]: false,
});
const SWAP_GRID_ID = 'swapGrid:v2';

const DefaultLayouts: ResponsiveLayouts = {
  lg: [
    { x: 5, y: 0, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 5, y: 20, w: 6, h: 3, minW: 2, minH: 3, maxH: 3, i: SwapWidgets.Customise },
    { x: 5, y: 24, w: 6, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
    { x: 5, y: 24, w: 6, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
    { x: 5, y: 24, w: 6, h: 16, minW: 4, minH: 16, i: SwapWidgets.SupplyChart },
    { x: 11, y: 0, w: 8, h: 20, minW: 4, minH: 16, i: SwapWidgets.Chart },
    { x: 11, y: 20, w: 8, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 11, y: 20, w: 8, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
  ],
  md: [
    { x: 3, y: 0, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 3, y: 20, w: 4, h: 3, minW: 2, minH: 3, maxH: 3, i: SwapWidgets.Customise },
    { x: 3, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
    { x: 3, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
    { x: 3, y: 24, w: 4, h: 12, minW: 4, minH: 12, i: SwapWidgets.SupplyChart },
    { x: 7, y: 0, w: 6, h: 20, minW: 4, minH: 16, i: SwapWidgets.Chart },
    { x: 7, y: 20, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 7, y: 20, w: 6, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
  ],
  sm: [
    { x: 1, y: 0, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 1, y: 20, w: 4, h: 3, minW: 2, minH: 3, maxH: 3, i: SwapWidgets.Customise },
    { x: 1, y: 24, w: 4, h: 9, minW: 4, minH: 9, i: SwapWidgets.Distribution },
    { x: 1, y: 24, w: 4, h: 9, minW: 4, minH: 9, i: SwapWidgets.TransactionDetails },
    { x: 1, y: 24, w: 4, h: 20, minW: 4, minH: 16, i: SwapWidgets.SupplyChart },
    { x: 5, y: 0, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
    { x: 5, y: 20, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 5, y: 40, w: 6, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
  ],
  xs: [
    { x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 3, maxH: 3, i: SwapWidgets.Customise },
    { x: 0, y: 4, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 0, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
    { x: 0, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
    { x: 4, y: 0, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
    { x: 0, y: 32, w: 4, h: 16, minW: 4, minH: 16, i: SwapWidgets.Transactions },
    { x: 4, y: 20, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.TokenPriceChart },
    { x: 4, y: 20, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.SupplyChart },
  ],
  xss: [
    { x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 3, maxH: 3, i: SwapWidgets.Customise },
    { x: 0, y: 4, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 0, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
    { x: 0, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
    { x: 0, y: 36, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
    { x: 0, y: 56, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.TokenPriceChart },
    { x: 0, y: 56, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
    { x: 0, y: 56, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.SupplyChart },
  ],
};

const isAvailable = computed(() => swapStore.isAvailable);
const prevRoute = computed(() => store.state.router.prev as Nullable<PageNames>);

const { firstRouteAddress, secondRouteAddress, isValidRoute, parseCurrentRoute, updateRouteAfterSelectTokens } =
  useSelectedTokensRoute(async ({ firstAddress, secondAddress }) => {
    const normalizedPair = normalizeSwapRouteTokens(firstAddress, secondAddress);

    await setTokenFromAddress(normalizedPair.firstAddress);
    await setTokenToAddress(normalizedPair.secondAddress);
  });

watch([tokenFrom, tokenTo], ([from, to]) => {
  if (from && to) {
    updateRouteAfterSelectTokens(from as AccountAsset, to as AccountAsset);
  }
});

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

const initializeSwapPage = async (): Promise<void> => {
  await withApi(async () => {
    parseCurrentRoute();

    if (tokenFrom.value && tokenTo.value && prevRoute.value !== PageNames.OrderBook) {
      updateRouteAfterSelectTokens(tokenFrom.value as AccountAsset, tokenTo.value as AccountAsset);
    } else if (isValidRoute.value && firstRouteAddress.value && secondRouteAddress.value) {
      await setTokenFromAddress(firstRouteAddress.value);
      await setTokenToAddress(secondRouteAddress.value);
    } else if (!tokenFrom.value) {
      await setTokenFromAddress(XOR.address);
      await setTokenToAddress('');
    }
  });
};

void initializeSwapPage().catch((error) => {
  console.error('[swap] failed to initialize route tokens', error);
});
</script>

<style lang="scss" scoped>
.swap-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
