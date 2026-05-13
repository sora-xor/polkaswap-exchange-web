<template>
  <base-widget v-bind="$attrs" :title="title" :tooltip="tooltip">
    <template #filters>
      <stats-filter
        is-dropdown
        :filters="filters"
        :model-value="filter"
        @update:model-value="changeFilter"
      ></stats-filter>
    </template>

    <chart-skeleton
      :loading="loadingState"
      :is-empty="data.length === 0"
      :is-error="isFetchingError"
      @retry="updateData"
    >
      <formatted-amount class="chart-price" :value="amount.amount">
        <template #prefix>{{ symbol }}</template>
        {{ amount.suffix }}
      </formatted-amount>
      <PriceChange :value="priceChange"></PriceChange>
      <v-chart ref="chart" class="chart" :key="chartKey" :option="chartSpec" autoresize></v-chart>
    </chart-skeleton>
  </base-widget>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import first from 'lodash/fp/first';
import last from 'lodash/fp/last';
import { computed, getCurrentScope, onMounted, onScopeDispose, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import ChartSkeleton from '@/components/shared/Chart/ChartSkeleton.vue';
import PriceChange from '@/components/shared/PriceChange.vue';
import StatsFilter from '@/components/shared/Stats/StatsFilter.vue';
import BaseWidget from '@/components/shared/Widget/Base.vue';
import { SECONDS_IN_TYPE, NETWORK_STATS_FILTERS } from '@/consts/snapshots';
import { useChartSpec } from '@/composables/useChartSpec';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { fetchData } from '@/indexer/queries/network/volume';
import VChart from '@/lib/echarts/component';
import FormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import { useSettingsStore } from '@/stores/settings';
import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';
import type { Nullable } from '@/types/common';
import { calcPriceChange, formatAmountWithSuffix, formatDecimalPlaces } from '@/utils';

type ChartData = {
  timestamp: number;
  value: FPNumber;
};

const getTotalValue = (data: readonly ChartData[]): FPNumber =>
  data.reduce((acc, item) => acc.add(item.value), FPNumber.ZERO);

const iterate = (prevTimestamp: number, currentTimestamp: number, difference: number): ChartData[] => {
  const buffer: ChartData[] = [];

  while ((currentTimestamp += difference) < prevTimestamp) {
    buffer.push({
      timestamp: currentTimestamp,
      value: FPNumber.ZERO,
    });
  }

  return buffer.reverse();
};

const normalizeTo = (sample: ChartData[], difference: number, from: number, to: number): void => {
  const prevTimestamp = last(sample)?.timestamp ?? from;
  const buffer = iterate(prevTimestamp, to, difference);

  sample.push(...buffer);
};

const normalizeData = (collection: ChartData[], difference: number, from: number, to: number): ChartData[] => {
  const sample: ChartData[] = [];

  for (const item of collection) {
    normalizeTo(sample, difference, from, item.timestamp);
    sample.push(item);
  }

  normalizeTo(sample, difference, from, to);

  return sample;
};

const props = withDefaults(
  defineProps<{
    fees?: boolean;
    parentLoading?: boolean;
  }>(),
  {
    fees: false,
    parentLoading: false,
  }
);

const chart = ref<Nullable<unknown>>(null);

const filters = NETWORK_STATS_FILTERS;
const filter = ref<SnapshotFilter>(filters[0]);

const settingsStore = useSettingsStore();
const { exchangeRate, currencySymbol } = storeToRefs(settingsStore);
const nodeIsConnected = computed(() => settingsStore.nodeIsConnected);
const indexerEndpoint = computed(() => {
  const type = settingsStore.indexerType;

  return type ? (settingsStore.indexers?.[type]?.endpoint ?? '') : '';
});
const hasResolvedData = ref(false);

const parentLoading = computed(() => props.parentLoading);
const { loading, withLoading, withParentLoading } = useLoading({ parentLoading });
const { t } = useTranslation();
const { gridSpec, xAxisSpec, yAxisSpec, tooltipSpec, barSeriesSpec } = useChartSpec();
const loadingState = computed(() => parentLoading.value || loading.value || !hasResolvedData.value);

const data = ref<readonly ChartData[]>([]);
const prevData = ref<readonly ChartData[]>([]);
const isFetchingError = ref(false);

const chartKey = computed(() =>
  props.fees ? undefined : `bar-chart-${currencySymbol.value}-rate-${exchangeRate.value}`
);

const symbol = computed(() => (props.fees ? XOR.symbol : currencySymbol.value));
const title = computed(() => (props.fees ? 'Fees' : 'Volume'));
const tooltip = computed(() => t(props.fees ? 'tooltips.fees' : 'tooltips.volume'));

const total = computed(() => getTotalValue(data.value));

const amount = computed<AmountWithSuffix>(() =>
  props.fees ? formatAmountWithSuffix(total.value) : formatAmountWithSuffix(total.value.mul(exchangeRate.value))
);

const priceChange = computed(() => calcPriceChange(total.value, getTotalValue(prevData.value)));

const chartSpec = computed(() => ({
  dataset: {
    source: data.value.map((item) => [item.timestamp, item.value.toNumber()]),
    dimensions: ['timestamp', 'value'],
  },
  grid: gridSpec({
    top: 20,
    left: 45,
  }),
  xAxis: xAxisSpec(),
  yAxis: yAxisSpec({
    axisLabel: {
      formatter: (value: number) => {
        const val = new FPNumber(value).mul(exchangeRate.value);
        const formatted = formatAmountWithSuffix(val);
        return `${formatted.amount} ${formatted.suffix}`;
      },
    },
  }),
  tooltip: tooltipSpec({
    formatter: (params: Array<{ data: [number, number] }>) => {
      const { data: datum } = params[0];
      const [, value] = datum;

      if (props.fees) {
        return `${formatDecimalPlaces(value)} ${XOR.symbol}`;
      }

      const currencyAmount = new FPNumber(value).mul(exchangeRate.value);
      return `${currencySymbol.value} ${formatDecimalPlaces(currencyAmount)}`;
    },
  }),
  series: [
    barSeriesSpec({
      itemStyle: {
        color: '#C86FFF',
      },
    }),
  ],
}));

const changeFilter = (next: SnapshotFilter) => {
  filter.value = next;
  updateData();
};

const updateData = async () => {
  await withLoading(async () => {
    await withParentLoading(async () => {
      try {
        const { type, count } = filter.value;
        const seconds = SECONDS_IN_TYPE[type];
        const now = Math.floor(Date.now() / (seconds * 1000)) * seconds;
        const aTime = now - seconds * count;
        const bTime = aTime - seconds * count;

        const [curr, prev] = await Promise.all([
          fetchData(props.fees, now, aTime, type),
          fetchData(props.fees, aTime, bTime, type),
        ]);

        data.value = Object.freeze(normalizeData(curr, seconds * 1000, now * 1000, aTime * 1000));
        prevData.value = Object.freeze(prev);

        isFetchingError.value = false;
        hasResolvedData.value = curr.length > 0 || prev.length > 0 || nodeIsConnected.value;
      } catch (error) {
        console.error(error);
        isFetchingError.value = true;
        hasResolvedData.value = nodeIsConnected.value;
      }
    });
  });
};

watch(nodeIsConnected, (connected) => {
  if (!connected) {
    hasResolvedData.value = false;
    return;
  }

  if (!hasResolvedData.value) {
    void updateData();
  }
});

watch(indexerEndpoint, (endpoint, previousEndpoint) => {
  if (!endpoint || endpoint === previousEndpoint) return;

  void updateData();
});

onMounted(() => {
  void updateData();
});

if (getCurrentScope()) {
  onScopeDispose(() => {
    chart.value = null;
    hasResolvedData.value = false;
  });
}
</script>
