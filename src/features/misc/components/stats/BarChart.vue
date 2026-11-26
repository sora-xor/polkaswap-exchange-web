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
      <formatted-amount v-if="amount" class="chart-price" :value="amount.amount">
        <template #prefix>{{ symbol }}</template>
        {{ amount.suffix }}
      </formatted-amount>
      <span v-else class="chart-price" data-testid="network-flow-unavailable">{{
        t('footer.statistics.title.unavailable')
      }}</span>
      <PriceChange v-if="priceChange !== null" :value="priceChange"></PriceChange>
      <v-chart ref="chart" class="chart" :key="chartKey" :option="chartSpec" autoresize></v-chart>
    </chart-skeleton>
  </base-widget>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
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
import { fetchData, type FlowPoint } from '@/indexer/queries/network/volume';
import VChart from '@/lib/echarts/component';
import FormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import { useSettingsStore } from '@/stores/settings';
import { createStatsRange } from '@/features/misc/components/stats/range';
import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';
import type { Nullable } from '@/types/common';
import { calcPriceChange, formatAmountWithSuffix, formatDecimalPlaces } from '@/utils';

/** A missing observation makes the selected period's total and percentage change unknown. */
const getTotalValue = (points: readonly FlowPoint[]): FPNumber | null => {
  if (!points.length) return null;
  let total = FPNumber.ZERO;
  for (const point of points) {
    if (point.value === null) return null;
    total = total.add(point.value);
  }
  return total;
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
const { withParentLoading } = useLoading({ parentLoading });
const { t } = useTranslation();
const { gridSpec, xAxisSpec, yAxisSpec, tooltipSpec, barSeriesSpec } = useChartSpec();
const loadingState = computed(() => parentLoading.value || !hasResolvedData.value);

const data = ref<readonly FlowPoint[]>([]);
const prevData = ref<readonly FlowPoint[]>([]);
const isFetchingError = ref(false);
let requestController: AbortController | undefined;

const chartKey = computed(() =>
  props.fees ? undefined : `bar-chart-${currencySymbol.value}-rate-${exchangeRate.value}`
);

const symbol = computed(() => (props.fees ? XOR.symbol : currencySymbol.value));
const title = computed(() => (props.fees ? 'Fees' : 'Volume'));
const tooltip = computed(() => t(props.fees ? 'tooltips.fees' : 'tooltips.volume'));

const total = computed(() => getTotalValue(data.value));

const amount = computed<AmountWithSuffix | null>(() => {
  if (total.value === null) return null;
  return formatAmountWithSuffix(props.fees ? total.value : total.value.mul(exchangeRate.value));
});

const priceChange = computed(() => {
  const previous = getTotalValue(prevData.value);
  return total.value !== null && previous !== null ? calcPriceChange(total.value, previous) : null;
});

const chartSpec = computed(() => ({
  dataset: {
    source: data.value.map((item) => [item.timestamp, item.value?.toNumber() ?? null]),
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
        const raw = new FPNumber(value);
        const formatted = formatAmountWithSuffix(props.fees ? raw : raw.mul(exchangeRate.value));
        return `${formatted.amount} ${formatted.suffix}`;
      },
    },
  }),
  tooltip: tooltipSpec({
    formatter: (params: Array<{ data: [number, number | null] }>) => {
      const value = params[0]?.data[1];
      if (value == null) return t('footer.statistics.title.unavailable');

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
  requestController?.abort();
  requestController = new AbortController();
  const { signal } = requestController;
  const active = () => !signal.aborted;
  hasResolvedData.value = false;
  isFetchingError.value = false;
  data.value = [];
  prevData.value = [];

  await withParentLoading(async () => {
    if (!active()) return;
    const { type, count } = filter.value;
    const { from, to, previousFrom, previousTo } = createStatsRange(Date.now(), SECONDS_IN_TYPE[type], count);
    const showCurrent = (points: FlowPoint[]) => {
      if (!active()) return;
      data.value = Object.freeze(points);
      hasResolvedData.value = true;
    };
    const current = fetchData(props.fees, from, to, type, showCurrent, signal);
    // The comparison is optional and must never hold the current period's chart behind a spinner.
    void fetchData(props.fees, previousFrom, previousTo, type, undefined, signal)
      .then((points) => {
        if (active()) prevData.value = Object.freeze(points);
      })
      .catch(() => {
        /* No percentage is shown when the comparison is unavailable. */
      });

    try {
      showCurrent(await current);
    } catch {
      if (!active()) return;
      isFetchingError.value = true;
      hasResolvedData.value = true;
    }
  });
};

watch(nodeIsConnected, (connected) => {
  if (connected && (!hasResolvedData.value || isFetchingError.value)) {
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
    requestController?.abort();
    chart.value = null;
    hasResolvedData.value = false;
  });
}
</script>
