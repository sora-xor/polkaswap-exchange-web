<template>
  <base-widget v-bind="$attrs">
    <template #title>
      <slot name="title">
        <tokens-row border :assets="tokens" size="medium"></tokens-row>
        <div v-if="tokenA" class="token-title">
          <span>{{ tokenA.symbol }}</span>
          <span v-if="tokenB">/{{ tokenB.symbol }}</span>
        </div>
        <s-button
          v-if="reversible"
          :class="{ 's-pressed': isReversedChart }"
          :disabled="chartIsLoading"
          size="small"
          type="action"
          alternative
          icon="arrows-swap-90-24"
          :aria-label="t('exchange.Swap')"
          @click="revertChart"
        ></s-button>
      </slot>
    </template>

    <template #filters>
      <stats-filter
        is-dropdown
        :filters="filters"
        :model-value="selectedFilter"
        :disabled="chartIsLoading"
        @update:model-value="changeFilter"
      ></stats-filter>
      <svg-icon-button
        v-for="{ type, icon, active } in chartTypeButtons"
        :key="type"
        :icon="icon"
        :active="active"
        :disabled="chartIsLoading"
        :aria-label="t('priceChartText')"
        size="small"
        @click="selectChartType(type)"
      ></svg-icon-button>
    </template>

    <template #types>
      <slot name="types"></slot>
    </template>

    <chart-skeleton
      :loading="chartIsLoading"
      :is-empty="chartData.length === 0"
      :is-error="isFetchingError"
      @retry="updatePrices"
    >
      <formatted-amount
        class="charts-price"
        :value="currentPriceFormatted"
        :font-weight-rate="FontWeightRate.MEDIUM"
        :font-size-rate="FontWeightRate.MEDIUM"
        :asset-symbol="symbol"
        symbol-as-decimal
      ></formatted-amount>
      <PriceChange :value="priceChange"></PriceChange>
      <v-chart
        ref="chart"
        class="chart"
        :key="chartKey"
        :option="chartSpec"
        autoresize
        @zr:mousewheel="handleZoom"
        @datazoom="changeZoomLevel"
      ></v-chart>
    </chart-skeleton>
  </base-widget>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/sdk';
import { graphic } from 'echarts';
import isEqual from 'lodash/fp/isEqual';
import last from 'lodash/fp/last';
import pick from 'lodash/fp/pick';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

import VChart from '@/lib/echarts/component';
import SvgIconButton from '@/components/shared/Button/SvgIconButton/SvgIconButton.vue';
import ChartSkeleton from '@/components/shared/Chart/ChartSkeleton.vue';
import StatsFilter from '@/components/shared/Stats/StatsFilter.vue';
import TokensRow from '@/components/shared/TokensRow.vue';
import BaseWidget from '@/components/shared/Widget/Base.vue';
import { SvgIcons } from '@/components/shared/Button/SvgIconButton/icons';
import PriceChange from '@/components/shared/PriceChange.vue';
import { useChartSpec } from '@/composables/useChartSpec';
import { useLoading } from '@/composables/useLoading';
import { createThemePalette, useThemePalette } from '@/composables/useThemePalette';
import { useTranslation } from '@/composables/useTranslation';
import { FontWeightRate } from '@/consts';
import { SECONDS_IN_TYPE } from '@/consts/snapshots';
import { normalizeSnapshots } from '@/components/shared/Widget/priceChart.utils';
import { fetchAssetPriceData } from '@/indexer/queries/asset/price';
import FormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import * as POLKASWAP_TYPES from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/types';
import { useSettingsStore } from '@/stores/settings';
import {
  calcPriceChange,
  debouncedInputHandler,
  formatAmountWithSuffix,
  formatDecimalPlaces,
  getCurrency,
  getTextWidth,
} from '@/utils';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { PageInfo } from '@/lib/soraneo-wallet/src/services/indexer/types';
import type { Currency, CurrencyFields } from '@/lib/soraneo-wallet/src/types/currency';
import type { OCLH, RequestMethod, RequestSubscription, SnapshotItem } from '@/types/chart';
import { Timeframes } from '@/types/filters';
import type { SnapshotFilter } from '@/types/filters';
import type { FnWithoutArgs, Nullable } from '@/types/common';

const USD_SYMBOL = 'USD';

type ChartDataItem = [number, ...OCLH, number];
type LastUpdates = Record<string, SnapshotItem>;
type Snapshot = {
  nodes: SnapshotItem[];
  hasNextPage: boolean;
  endCursor: string | undefined;
};

enum CHART_TYPES {
  LINE = 'line',
  CANDLE = 'candlestick',
}

const CHART_TYPE_ICONS = {
  [CHART_TYPES.LINE]: SvgIcons.LineIcon,
  [CHART_TYPES.CANDLE]: SvgIcons.CandleIcon,
};

const SNAPSHOT_TYPES = (POLKASWAP_TYPES?.SnapshotTypes ??
  ({
    DEFAULT: 'default',
    HOUR: 'hour',
    DAY: 'day',
    MONTH: 'month',
  } as const)) as Record<'DEFAULT' | 'HOUR' | 'DAY' | 'MONTH', SnapshotFilter['type']>;

const LINE_CHART_FILTERS: SnapshotFilter[] = [
  { name: Timeframes.FIVE_MINUTES, label: '5M', type: SNAPSHOT_TYPES.DEFAULT, count: 48 },
  {
    name: Timeframes.FIFTEEN_MINUTES,
    label: '15M',
    type: SNAPSHOT_TYPES.DEFAULT,
    count: 48 * 3,
    group: 3,
  },
  {
    name: Timeframes.THIRTY_MINUTES,
    label: '30M',
    type: SNAPSHOT_TYPES.DEFAULT,
    count: 48 * 6,
    group: 6,
  },
  { name: Timeframes.HOUR, label: '1H', type: SNAPSHOT_TYPES.HOUR, count: 48 },
  { name: Timeframes.FOUR_HOURS, label: '4H', type: SNAPSHOT_TYPES.HOUR, count: 48 * 4, group: 4 },
  { name: Timeframes.DAY, label: '1D', type: SNAPSHOT_TYPES.DAY, count: 90 },
  { name: Timeframes.YEAR, label: '1Y', type: SNAPSHOT_TYPES.DAY, count: 365 },
  { name: Timeframes.ALL, label: 'ALL', type: SNAPSHOT_TYPES.DAY, count: Infinity },
];

const LABEL_PADDING = 4;
const AXIS_OFFSET = 8;
const AXIS_LABEL_CSS = {
  fontFamily: 'Sora',
  fontSize: 10,
  fontWeight: 300,
  lineHeigth: 1.5,
};

const SYNC_INTERVAL = 6 * 1000;
const ZOOM_ID = 'chartZoom';

const defaultRequestSubscription = (callback: VoidFunction): VoidFunction => {
  const sub = setInterval(callback, SYNC_INTERVAL * 5);
  const unsub = () => clearInterval(sub);
  return unsub;
};

const signific =
  (value: FPNumber) =>
  (positive: string, negative: string, zero: string): string =>
    FPNumber.gt(value, FPNumber.ZERO) ? positive : FPNumber.lt(value, FPNumber.ZERO) ? negative : zero;

const formatChange = (value: FPNumber): string => {
  const sign = signific(value)('+', '', '');
  const priceChange = formatDecimalPlaces(value, true);
  return `${sign}${priceChange}`;
};

const formatAmount = (value: FPNumber, precision: number) => value.toLocaleString(precision);
const formatPrice = (value: FPNumber, precision: number, symbol: string) =>
  `${formatAmount(value, precision)} ${symbol}`;
const dividePrice = (priceA: number, priceB: number): number => (priceB !== 0 ? priceA / priceB : 0);
const dividePrices = (priceA: OCLH, priceB: OCLH): OCLH =>
  priceA.map((price, index) => dividePrice(price, priceB[index])) as OCLH;

const mergeSnapshots = (a: Nullable<SnapshotItem>, b: Nullable<SnapshotItem>): SnapshotItem => {
  const timestamp = (a?.timestamp ?? b?.timestamp) as number;
  const price = b?.price && a?.price ? dividePrices(a.price, b.price) : (a?.price ?? [0, 0, 0, 0]);
  const volume = b?.volume && a?.volume ? Math.min(b.volume, a.volume) : (a?.volume ?? 0);
  return { timestamp, price, volume };
};

const getPrecision = (value: number): number => {
  let precision = 2;
  if (value === 0 || !Number.isFinite(value)) return precision;
  let abs = Math.abs(value);
  while (Math.floor(abs) <= 0) {
    abs *= 10;
    precision++;
  }
  return precision;
};

defineOptions({
  name: 'PriceChartWidget',
});

const props = defineProps<{
  baseAsset?: Nullable<AccountAsset>;
  quoteAsset?: Nullable<AccountAsset>;
  requestEntityId?: Nullable<string>;
  requestMethod?: RequestMethod;
  requestSubscription?: RequestSubscription;
  isAvailable?: boolean;
  parentLoading?: boolean;
}>();

const parentLoading = computed(() => props.parentLoading ?? false);
const { loading, withApi } = useLoading({ parentLoading });
const { t } = useTranslation();
const { theme } = useThemePalette();
const settingsStore = useSettingsStore();
const palette = computed(() => theme.value ?? createThemePalette());
const { gridSpec, xAxisSpec, yAxisSpec, tooltipSpec, lineSeriesSpec, barSeriesSpec, candlestickSeriesSpec } =
  useChartSpec();

const currency = computed<Nullable<Currency>>(() => settingsStore.currency);
const currencies = computed<CurrencyFields[]>(() => settingsStore.currencies ?? []);
const exchangeRate = computed(() => settingsStore.exchangeRate ?? 1);
const currencySymbol = computed(() => settingsStore.currencySymbol ?? USD_SYMBOL);
const indexerEndpoint = computed(() => {
  const type = settingsStore.indexerType;

  return type ? (settingsStore.indexers?.[type]?.endpoint ?? '') : '';
});

const chart = ref<any>(null);
const isFetchingError = ref(false);
const dataset = ref<readonly SnapshotItem[]>(Object.freeze([]));
const zoomStart = ref(0);
const zoomEnd = ref(100);
const precision = ref(2);
const limits = reactive({ min: Infinity, max: 0 });
const chartType = ref<CHART_TYPES>(CHART_TYPES.LINE);
const selectedFilter = ref<SnapshotFilter>(LINE_CHART_FILTERS[0]);
const isReversedChart = ref(false);

let snapshotBuffer: Record<string, readonly SnapshotItem[]> = {};
let pageInfos: Record<string, Partial<PageInfo>> = {};
const priceUpdateRequestId = ref(0);
let priceUpdateSubscription: Nullable<FnWithoutArgs> = null;
let priceUpdateTimestampSync: Nullable<ReturnType<typeof setInterval>> = null;

const baseAsset = computed(() => props.baseAsset ?? null);
const quoteAsset = computed(() => props.quoteAsset ?? null);

const inputTokensAddresses = computed(() => {
  const filtered = [baseAsset.value, quoteAsset.value].filter((token): token is AccountAsset => Boolean(token));
  return filtered.map((token) => token.address);
});

const tokenA = computed(() => (isReversedChart.value ? quoteAsset.value : baseAsset.value));
const tokenB = computed(() => (isReversedChart.value ? baseAsset.value : quoteAsset.value));
const tokens = computed(() => [tokenA.value, tokenB.value].filter((token): token is AccountAsset => Boolean(token)));
const tokensAddresses = computed(() => tokens.value.map((token) => token.address));
const isTokensPair = computed(() => tokensAddresses.value.length === 2);
const chartRequestAvailable = computed(() => !isTokensPair.value || (props.isAvailable ?? false));
const reversible = computed(() => isTokensPair.value && !props.requestEntityId);
const entities = computed(() => (props.requestEntityId ? [props.requestEntityId] : tokensAddresses.value));

const fallbackFiatSymbol = computed(
  () => getCurrency(currency.value as Currency, currencies.value)?.key.toUpperCase() ?? USD_SYMBOL
);
const symbol = computed(() => tokenB.value?.symbol ?? fallbackFiatSymbol.value);

const chartTypeButtons = computed(() =>
  [CHART_TYPES.LINE, CHART_TYPES.CANDLE].map((type) => ({
    type,
    icon: CHART_TYPE_ICONS[type],
    active: chartType.value === type,
  }))
);

const filters = LINE_CHART_FILTERS;
const chartIsLoading = computed(() => parentLoading.value || loading.value);
const currentPrice = computed(() => new FPNumber(dataset.value[0]?.price[1] ?? 0));
const currentPriceFormatted = computed(() => toAmount(currentPrice.value, precision.value));

const timeDifference = computed(() => SECONDS_IN_TYPE[selectedFilter.value.type] * 1000);

const chartData = computed<readonly ChartDataItem[]>(() => {
  const ordered = dataset.value.slice().reverse();
  const group = selectedFilter.value.group;
  const groups: ChartDataItem[] = [];

  for (let i = 0; i < ordered.length; i++) {
    if (!group || i % group === 0) {
      groups.push([ordered[i].timestamp, ...ordered[i].price, ordered[i].volume]);
    } else {
      const lastGroup = last(groups);
      if (lastGroup) {
        lastGroup[2] = ordered[i].price[1];
        lastGroup[3] = Math.min(lastGroup[3], ordered[i].price[2]);
        lastGroup[4] = Math.max(lastGroup[4], ordered[i].price[3]);
        lastGroup[5] = lastGroup[5] + (ordered[i].volume ?? 0);
      }
    }
  }

  return Object.freeze(groups);
});

const chartKey = computed(() =>
  isTokensPair.value ? undefined : `price-chart-${symbol.value}-rate-${exchangeRate.value}`
);

const visibleChartItemsRange = computed<[number, number]>(() => {
  const itemsCount = chartData.value.length;
  if (!itemsCount) return [0, 0];

  const startIndex = Math.floor((itemsCount * zoomStart.value) / 100);
  const endIndex = Math.max(Math.ceil((itemsCount * zoomEnd.value) / 100) - 1, startIndex);

  return [startIndex, endIndex];
});

const priceChange = computed(() => {
  const [startIndex, endIndex] = visibleChartItemsRange.value;
  const rangeStartPrice = new FPNumber(chartData.value[startIndex]?.[2] ?? 0);
  const rangeClosePrice = new FPNumber(chartData.value[endIndex]?.[2] ?? 0);
  return calcPriceChange(rangeClosePrice, rangeStartPrice);
});

const gridLeftOffset = computed(() => {
  const maxLabel = limits.max * 10;
  const axisLabelWidth = getTextWidth(
    new FPNumber(maxLabel).toLocaleString(precision.value),
    AXIS_LABEL_CSS.fontFamily,
    AXIS_LABEL_CSS.fontSize
  );

  return AXIS_OFFSET + 2 * LABEL_PADDING + axisLabelWidth;
});

const chartSpec = computed(() => {
  const withVolume = entities.value.length === 1;
  const priceGrid = gridSpec({ top: 20, left: gridLeftOffset.value });
  const volumeGrid = gridSpec({ height: 72, left: gridLeftOffset.value });

  const priceXAxis = xAxisSpec({
    boundaryGap: chartType.value === CHART_TYPES.LINE ? false : [0.005, 0.005],
    axisLabel: { show: true },
    axisLine: {
      show: true,
      lineStyle: { color: palette.value.color.base.content.tertiary },
    },
    axisPointer: { label: { show: true } },
  });

  const volumeXAxis = xAxisSpec({
    gridIndex: 1,
    boundaryGap: false,
    axisLabel: { show: true },
    axisPointer: { type: 'none' },
  });

  const priceYAxis = yAxisSpec({
    axisLabel: {
      formatter: (value: number) => toAmount(value, precision.value),
      showMaxLabel: false,
      showMinLabel: false,
    },
    axisPointer: {
      label: {
        precision: precision.value,
        formatter: ({ value }: { value: number }) => toAmount(value, precision.value),
      },
    },
    min: 'dataMin',
    max: 'dataMax',
  });

  const volumeYAxis = yAxisSpec({
    gridIndex: 1,
    splitNumber: 2,
    axisLabel: {
      formatter: (value: number) => {
        const val = new FPNumber(value).mul(exchangeRate.value);
        const { amount, suffix } = formatAmountWithSuffix(val);
        return `${amount} ${suffix}`;
      },
      showMaxLabel: true,
    },
  });

  const dataZoom = {
    id: ZOOM_ID,
    type: 'inside',
    xAxisIndex: [0, 1],
    start: 0,
    end: 100,
    minValueSpan: timeDifference.value * 11,
  };

  const tooltip = tooltipSpec({
    axisPointer: { type: 'cross' },
    formatter: (params: any[]) => {
      const { data, seriesType } = params[0];
      const [, open, close, low, high, volume] = data;
      const rows: Array<{ title: string; data: string; color?: string }> = [];
      const closeFp = new FPNumber(close);

      if (seriesType === CHART_TYPES.CANDLE) {
        const openFp = new FPNumber(open);
        const change = calcPriceChange(closeFp, openFp);
        const changeColor = signific(change)(
          palette.value.color.status.success,
          palette.value.color.status.error,
          palette.value.color.base.content.primary
        );

        rows.push(
          { title: 'Open', data: toPrice(openFp, precision.value) },
          { title: 'High', data: toPrice(high, precision.value) },
          { title: 'Low', data: toPrice(low, precision.value) },
          { title: 'Close', data: toPrice(closeFp, precision.value) },
          { title: 'Change', data: formatChange(change), color: changeColor }
        );
      } else {
        rows.push({ title: 'Price', data: toPrice(closeFp, precision.value) });
      }

      if (withVolume) {
        rows.push({ title: 'Volume', data: `${currencySymbol.value} ${toAmount(volume, 2)}` });
      }

      return `
        <table>
          ${rows
            .map(
              (row) => `
            <tr>
              <td align="right" style="color:${palette.value.color.base.content.secondary}">${row.title}</td>
              <td style="color:${row.color ?? palette.value.color.base.content.primary}">${row.data}</td>
            </tr>
          `
            )
            .join('')}
        </table>
      `;
    },
  });

  const priceSeries =
    chartType.value === CHART_TYPES.LINE
      ? lineSeriesSpec({
          encode: { y: 'close' },
          areaStyle: {
            opacity: 0.8,
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(248, 8, 123, 0.25)' },
              { offset: 1, color: 'rgba(255, 49, 148, 0.03)' },
            ]),
          },
        })
      : candlestickSeriesSpec();

  const volumeSeries = {
    ...barSeriesSpec({}),
    barMaxWidth: 10,
    xAxisIndex: 1,
    yAxisIndex: 1,
    itemStyle: {
      color: ({ data }: { data: [number, number, number] }) => {
        const [, open, close] = data;
        if (open > close) return palette.value.color.status.error;
        if (open < close) return palette.value.color.status.success;
        return palette.value.color.base.content.secondary;
      },
      opacity: 0.7,
    },
    encode: { y: 'volume' },
  };

  const spec: Record<string, unknown> = {
    animation: false,
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    color: [palette.value.color.theme.accent, palette.value.color.status.success],
    dataset: {
      source: chartData.value,
      dimensions: ['timestamp', 'open', 'close', 'low', 'high', 'volume'],
    },
    dataZoom: [dataZoom],
    grid: [priceGrid],
    xAxis: [priceXAxis],
    yAxis: [priceYAxis],
    tooltip,
    series: [priceSeries],
  };

  if (withVolume) {
    priceGrid.bottom = 120;
    priceXAxis.axisLabel.show = false;
    priceXAxis.axisPointer.label.show = false;
    (spec.grid as any[]).push(volumeGrid);
    (spec.xAxis as any[]).push(volumeXAxis);
    (spec.yAxis as any[]).push(volumeYAxis);
    (spec.series as any[]).push(volumeSeries);
  }

  return spec;
});

const toAmount = (amount: FPNumber | number, digits: number): string => {
  const fp = amount instanceof FPNumber ? amount : new FPNumber(amount);
  const value = isTokensPair.value ? fp : fp.mul(exchangeRate.value);
  return formatAmount(value, digits);
};

const toPrice = (price: FPNumber | number, digits: number): string => {
  const fp = price instanceof FPNumber ? price : new FPNumber(price);
  const value = isTokensPair.value ? fp : fp.mul(exchangeRate.value);
  return formatPrice(value, digits, symbol.value);
};

const isAllHistoricalPricesFetched = () => {
  return Object.entries(pageInfos).some(([address, pageInfo]) => {
    const bufferIsFilled = (snapshotBuffer[address] ?? []).length === dataset.value.length;
    return !pageInfo.hasNextPage && bufferIsFilled;
  });
};

const requestIsAllowed = (entitiesSnapshot: string[]): boolean => {
  if (!chartRequestAvailable.value) return false;
  return isEqual(entitiesSnapshot)(entities.value);
};

const fillSnapshotBuffer = (entityId: string, normalized: SnapshotItem[]): void => {
  const existingNodes = snapshotBuffer[entityId] ?? [];
  snapshotBuffer = {
    ...snapshotBuffer,
    [entityId]: Object.freeze([...existingNodes, ...normalized]),
  };
};

const updateDataset = (items: SnapshotItem[]): void => {
  dataset.value = Object.freeze(items);
};

const clearData = (saveReversedState = false, clearBuffer = false): void => {
  snapshotBuffer = clearBuffer ? {} : (pick(entities.value, snapshotBuffer) as typeof snapshotBuffer);
  pageInfos = clearBuffer ? {} : (pick(entities.value, pageInfos) as typeof pageInfos);

  dataset.value = Object.freeze([]);
  zoomStart.value = 0;
  zoomEnd.value = 100;
  limits.min = Infinity;
  limits.max = 0;
  precision.value = 2;

  if (!saveReversedState) {
    isReversedChart.value = false;
  }
};

const requestData = async (
  entityId: string,
  type: SnapshotFilter['type'],
  count: number,
  hasNextPage = true,
  endCursor?: string
): Promise<Snapshot> => {
  const nodes: SnapshotItem[] = [];
  let cursor = endCursor;
  let remaining = count;
  let nextPage = hasNextPage;

  do {
    const first = Math.min(remaining, 100);
    const requestMethod = props.requestMethod ?? fetchAssetPriceData;
    const response = await requestMethod(entityId, type, first, cursor);

    if (!response) {
      return { nodes, hasNextPage: false, endCursor: cursor };
    }

    nextPage = response.pageInfo.hasNextPage;
    cursor = response.pageInfo.endCursor;
    nodes.push(...response.edges.map((edge) => edge.node));
    remaining -= response.edges.length;
  } while (nextPage && remaining > 0);

  return { nodes, hasNextPage: nextPage, endCursor: cursor };
};

const fetchData = async (entityId: string): Promise<SnapshotItem[]> => {
  const { type, count } = selectedFilter.value;

  const pageInfoBuffer = pageInfos[entityId];
  const hasNextPage = pageInfoBuffer?.hasNextPage ?? true;
  const endCursor = pageInfoBuffer?.endCursor;
  const snapshotsBuffer = snapshotBuffer[entityId] ?? [];
  const snapshotsUsedCount = dataset.value.length;
  const snapshotsUnused = snapshotsBuffer.slice(snapshotsUsedCount);

  if (snapshotsUnused.length >= count || !hasNextPage) {
    return snapshotsUnused;
  }

  const { nodes, ...pageInfo } = await requestData(entityId, type, count, hasNextPage, endCursor);
  const lastTimestamp = last(snapshotsUnused)?.timestamp ?? last(dataset.value)?.timestamp ?? Date.now();
  const normalizedLimit = Math.max(count - snapshotsUnused.length, 0);
  const snapshotsNormalized = normalizeSnapshots(nodes, timeDifference.value, lastTimestamp, normalizedLimit);

  fillSnapshotBuffer(entityId, snapshotsNormalized);
  pageInfos = { ...pageInfos, [entityId]: pageInfo };

  return [...snapshotsUnused, ...snapshotsNormalized];
};

const fetchDataLastUpdates = async (entitiesSnapshot: string[]): Promise<Nullable<LastUpdates>> => {
  const lastUpdates: LastUpdates = {};
  await Promise.all(
    entitiesSnapshot.map(async (entityId) => {
      try {
        const update = await requestData(entityId, selectedFilter.value.type, 1);
        const snapshot = update.nodes[0];
        lastUpdates[entityId] = snapshot;
      } catch {
        return null;
      }
    })
  );

  return lastUpdates;
};

const getUpdatedPrecision = (min: number, max: number): number => {
  const boundaries = [max, min, max - min].map((value) => getPrecision(value));
  return Math.max(...boundaries);
};

const getHistoricalPrices = async (): Promise<void> => {
  if (loading.value || !chartRequestAvailable.value || isAllHistoricalPricesFetched()) {
    return;
  }

  const addresses = [...entities.value];
  const requestId = Date.now();

  priceUpdateRequestId.value = requestId;
  await withApi(async () => {
    try {
      const snapshots = await Promise.all(addresses.map((address) => fetchData(address)));

      if (!(requestIsAllowed(addresses) && priceUpdateRequestId.value === requestId)) return;

      const datasetChunk: SnapshotItem[] = [];
      const size = Math.min(
        snapshots[0]?.length ?? Infinity,
        snapshots[1]?.length ?? Infinity,
        selectedFilter.value.count
      );
      let { min, max } = limits;

      for (let i = 0; i < size; i++) {
        const a = snapshots[0]?.[i];
        const b = snapshots[1]?.[i];
        const { timestamp, price, volume } = mergeSnapshots(a, b);

        if (price.some((part) => !Number.isFinite(part))) continue;
        if (price[0] === 0 && price[1] === 0) continue;

        datasetChunk.push({ timestamp, price, volume });
        min = Math.min(min, ...price);
        max = Math.max(max, ...price);
      }

      limits.min = min;
      limits.max = max;
      precision.value = getUpdatedPrecision(min, max);
      updateDataset([...dataset.value, ...datasetChunk]);
      isFetchingError.value = false;
    } catch (error) {
      isFetchingError.value = true;
      console.error(error);
    }
  });
};

const getCurrentSnapshotTimestamp = (): number => {
  const now = Math.floor(Date.now() / 1000);
  const seconds = timeDifference.value / 1000;
  const index = Math.floor(now / seconds);
  return seconds * index * 1000;
};

const handlePriceTimestampSync = (entitiesSnapshot: string[]): void => {
  if (!requestIsAllowed(entitiesSnapshot)) return;

  const timestamp = getCurrentSnapshotTimestamp();
  const lastItem = dataset.value[0];

  if (!lastItem || timestamp === lastItem.timestamp) return;

  const close = lastItem.price[1];
  const price: OCLH = [close, close, close, close];
  const volume = 0;
  const item: SnapshotItem = { timestamp, price, volume };

  updateDataset([item, ...dataset.value]);
};

const fetchAndHandleUpdate = async (entitiesSnapshot: string[]): Promise<void> => {
  if (!requestIsAllowed(entitiesSnapshot)) return;

  const lastUpdates = await fetchDataLastUpdates(entitiesSnapshot);
  if (!lastUpdates) return;

  const datasetClone = [...dataset.value];
  const lastItem = datasetClone[0];
  const [a, b] = entitiesSnapshot.map((entityId) => lastUpdates[entityId]);
  const item = mergeSnapshots(a, b);

  if (item.price.some((part) => !Number.isFinite(part))) return;
  if (lastItem?.timestamp > item.timestamp) return;

  if (lastItem?.timestamp === item.timestamp) {
    datasetClone.shift();
  }

  datasetClone.unshift(item);

  const min = Math.min(limits.min, ...item.price);
  const max = Math.max(limits.max, ...item.price);

  precision.value = getUpdatedPrecision(min, max);
  limits.min = min;
  limits.max = max;
  updateDataset(datasetClone);
};

const getPriceUpdatesSubscription = async (entitiesSnapshot: string[]): Promise<Nullable<FnWithoutArgs>> => {
  const callback = () => fetchAndHandleUpdate(entitiesSnapshot);
  const requestSubscription = props.requestSubscription ?? defaultRequestSubscription;
  return await requestSubscription(callback);
};

const subscribeToPriceUpdates = async (): Promise<void> => {
  unsubscribeFromPriceUpdates();
  if (!entities.value.length || !chartRequestAvailable.value) return;

  const entitiesSnapshot = [...entities.value];
  priceUpdateSubscription = await getPriceUpdatesSubscription(entitiesSnapshot);
  priceUpdateTimestampSync = setInterval(() => handlePriceTimestampSync(entitiesSnapshot), SYNC_INTERVAL);
};

const unsubscribeFromPriceUpdates = (): void => {
  if (priceUpdateSubscription) {
    priceUpdateSubscription();
  }
  if (priceUpdateTimestampSync) {
    clearInterval(priceUpdateTimestampSync);
  }
  priceUpdateSubscription = null;
  priceUpdateTimestampSync = null;
};

const updatePrices = debouncedInputHandler(getHistoricalPrices, 250, { leading: false });
const resetAndUpdatePrices = async (saveReversedState = false, clearBuffer = false): Promise<void> => {
  clearData(saveReversedState, clearBuffer);
  await updatePrices();
  await subscribeToPriceUpdates();
};
const forceUpdatePrices = debouncedInputHandler(resetAndUpdatePrices, 250, { leading: false });

const changeFilter = async (filter: SnapshotFilter): Promise<void> => {
  const prevType = selectedFilter.value.type;
  const { count, type } = filter;
  selectedFilter.value = filter;

  if (prevType !== type) {
    await forceUpdatePrices(true, true);
  } else if (dataset.value.length < count) {
    await updatePrices();
  } else {
    await resetChartTypeZoom();
  }
};

const resetChartTypeZoom = async (): Promise<void> => {
  const { count, group } = selectedFilter.value;
  const items = chartData.value.length;
  const visible = count / (group ?? 1);
  const start = items > visible ? ((items - visible) * 100) / items : 0;
  await setChartZoomLevel(start, 100);
};

const selectChartType = async (type: CHART_TYPES): Promise<void> => {
  chartType.value = type;
  await setChartZoomLevel(zoomStart.value, zoomEnd.value);
};

const handleZoom = (event: any): void => {
  event?.stop?.();
  if (event?.wheelDelta < 0 && zoomStart.value === 0 && zoomEnd.value === 100) {
    updatePrices();
  }
};

const changeZoomLevel = (event: any): void => {
  const data = event?.batch?.[0];
  zoomStart.value = data?.start ?? 0;
  zoomEnd.value = data?.end ?? 0;
};

const setChartZoomLevel = async (start: number, end: number): Promise<void> => {
  await nextTick();
  const chartInstance: any = chart.value;
  chartInstance?.dispatchAction?.({
    type: 'dataZoom',
    batch: [
      {
        dataZoomId: ZOOM_ID,
        start,
        end,
      },
    ],
  });
};

const revertChart = (): void => {
  isReversedChart.value = !isReversedChart.value;
  forceUpdatePrices(true, false);
};

watch(inputTokensAddresses, (current, prev) => {
  if (!prev) return;
  if (!isEqual(current)(prev)) {
    const currentChartPair = isReversedChart.value ? [...prev].reverse() : prev;
    isReversedChart.value = false;
    if (!isEqual(current)(currentChartPair)) {
      forceUpdatePrices();
    }
  }
});

watch(chartRequestAvailable, (available, previous) => {
  if (available === previous) return;

  if (!available) {
    clearData(true, false);
    unsubscribeFromPriceUpdates();
    return;
  }

  forceUpdatePrices(true, false);
});

watch(indexerEndpoint, (endpoint, previousEndpoint) => {
  if (!endpoint || endpoint === previousEndpoint) return;

  forceUpdatePrices(true, true);
});

onMounted(() => {
  forceUpdatePrices();
});

onBeforeUnmount(() => {
  unsubscribeFromPriceUpdates();
});
</script>

<style lang="scss">
.charts {
  &-price {
    display: flex;
    margin-bottom: $inner-spacing-tiny;
    font-weight: 800;
    font-size: var(--s-heading3-font-size);
    line-height: var(--s-line-height-extra-small);

    .formatted-amount {
      &__integer {
        font-weight: inherit;
      }
      &__decimal,
      &__symbol {
        font-weight: 600;
      }
      &__symbol {
        color: var(--s-color-base-content-secondary);
      }
    }
  }
}

@include desktop {
  .container--charts {
    position: relative;
    z-index: $app-content-layer;
  }
}
</style>
