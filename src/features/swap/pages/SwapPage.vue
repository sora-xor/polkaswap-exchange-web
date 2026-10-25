<template>
  <widgets-grid
    :grid-id="gridId"
    class="swap-container"
    :class="{ 'swap-container--narrow': isNarrow }"
    :auto-resize="!isNarrow"
    :draggable="canEditLayout"
    :resizable="canEditLayout"
    :lines="canEditLayout"
    :loading="pageLoading"
    :default-layouts="DEFAULT_SWAP_LAYOUTS"
    :breakpoints="gridBreakpoints"
    :migrate-stored-layouts="migrateSwapLayouts"
    persist-only-user-edits
    v-model="widgets"
  >
    <template v-slot:[SwapWidgets.Form]="{ reset, ...props }">
      <swap-form-widget v-bind="props" primary-title full>
        <template #header-actions>
          <customise-widget
            v-model="customizePopper"
            v-model:widgets="widgets"
            v-model:options="customizeOptions"
            :labels="labels"
            compact
          >
            <p v-if="isNarrow" class="customize-mobile-hint">{{ t('ux.layout.desktopEditing') }}</p>
            <s-button @click="resetPageLayout(reset)">{{ t('resetText') }}</s-button>
          </customise-widget>
        </template>
      </swap-form-widget>
    </template>
    <template v-slot:[SwapWidgets.Chart]="props">
      <details v-if="isNarrow" class="swap-chart-disclosure" :open="chartExpanded" @toggle="onChartToggle">
        <summary>{{ labels[SwapWidgets.Chart] }}</summary>
        <div v-if="chartExpanded" class="swap-chart-disclosure__body">
          <price-chart-widget
            :base-asset="tokenFrom"
            :quote-asset="tokenTo"
            :is-available="isAvailable"
            :parent-loading="pageLoading"
            full
          ></price-chart-widget>
        </div>
      </details>
      <price-chart-widget
        v-else
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
    <template v-slot:[SwapWidgets.TokenPriceChart]="props">
      <token-price-chart-widget v-bind="props" full></token-price-chart-widget>
    </template>
    <template v-slot:[SwapWidgets.SupplyChart]="props">
      <supply-chart-widget v-bind="props" full></supply-chart-widget>
    </template>
  </widgets-grid>
</template>

<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';

import { useLoading } from '@/composables/useLoading';
import { usePiniaTelemetry } from '@/composables/usePiniaTelemetry';
import { useTranslation } from '@/composables/useTranslation';
import { Breakpoint } from '@/consts/layout';
import { resolveGlobalPinia } from '@/plugins/pinia';
import { createAsyncComponent } from '@/shared/ui/async';
// Direct imports: the `@/shared/ui/widgets` barrel also re-exports the chart widgets,
// which would make ECharts a static dependency of the swap page.
import CustomiseWidget from '@/components/shared/Widget/Customise.vue';
import WidgetsGrid from '@/components/shared/Widget/Grid.vue';
import { useSettingsStore } from '@/stores/settings';
import type { WidgetsVisibilityModel } from '@/types/layout';

import SwapDistributionWidget from '../components/widgets/Distribution.vue';
import SwapFormWidget from '../components/widgets/Form.vue';
import { buildSwapGridBreakpoints, DEFAULT_SWAP_LAYOUTS, SwapWidgets } from '../constants/layout';
import { migrateSwapLayouts } from '../constants/layoutMigration';
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
const settingsStore = useSettingsStore();
const swapPageStore = useSwapPageStore(resolveGlobalPinia());
const { chartExpanded, customizePopper, options, widgets } = storeToRefs(swapPageStore);
const { tokenFrom, tokenTo, initializeSwapRouteState } = useSwapRouteSync(withApi);
const { gridId } = swapPageStore;
let isPageActive = true;
const isNarrow = computed(() => settingsStore.windowWidth <= Breakpoint.Desktop);
const gridBreakpoints = computed(() => buildSwapGridBreakpoints(settingsStore.windowWidth));
const canEditLayout = computed(() => !isNarrow.value && options.value.edit);
const customizeOptions = computed<WidgetsVisibilityModel>({
  get: () => (isNarrow.value ? {} : options.value),
  set: (value) => {
    options.value = { edit: Boolean(value.edit) };
  },
});

/** Keeps mobile chart disclosure separate from saved chart visibility and geometry. */
function onChartToggle(event: Event): void {
  if (!isPageActive) return;
  chartExpanded.value = (event.currentTarget as HTMLDetailsElement).open;
}

/** Restores both the persisted grid layout and the transient page controls. */
function resetPageLayout(resetGrid: () => void): void {
  swapPageStore.resetWidgetPreferences();
  resetGrid();
}

watch(isNarrow, (narrow) => {
  if (narrow) options.value.edit = false;
});

// Reset transient state after Grid's persistence watchers are disposed. Returning
// to Swap then hydrates saved layouts against the authoritative default model.
onUnmounted(() => {
  isPageActive = false;
  swapPageStore.resetWidgetPreferences();
});

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

  :deep([data-widget-id]:not([data-widget-id='swapForm']) .base-widget) {
    box-shadow: var(--s-shadow-secondary);
  }

  &--narrow {
    // The mobile stack is presentation only; desktop grid geometry remains saved.
    height: auto !important;

    :deep(.widgets-grid-content) {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 0 16px 16px;
    }

    :deep(.vue-grid-item) {
      position: relative !important;
      inset: auto !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      transform: none !important;
      touch-action: auto;
      order: 2;
    }

    :deep([data-widget-id='swapForm']) {
      order: 0;
    }

    :deep([data-widget-id='swapChart']) {
      order: 1;
    }
  }
}

.swap-chart-disclosure {
  border-radius: var(--s-border-radius-small);
  color: var(--s-color-base-content-primary);
  background: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element-pressed);

  summary {
    cursor: pointer;
    padding: 16px 20px;
    font-weight: 500;
    line-height: 1.5;
  }

  &__body {
    height: 360px;
  }
}

.customize-mobile-hint {
  margin: 0;
  max-width: 240px;
  font-size: var(--s-font-size-small);
  line-height: 1.5;
  color: var(--s-color-base-content-secondary);
}
</style>
