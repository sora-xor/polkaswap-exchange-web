<template>
  <base-widget v-bind="$attrs" :title="TranslationConsts.TVL" :tooltip="t('tooltips.tvl')">
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
        <template #prefix>{{ currencySymbol }}</template>
        {{ amount.suffix }}
      </formatted-amount>
      <PriceChange :value="priceChange"></PriceChange>
      <v-chart ref="chart" class="chart" :key="chartKey" :option="chartSpec" autoresize></v-chart>
    </chart-skeleton>
  </base-widget>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { graphic } from 'echarts';
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
import { fetchData } from '@/indexer/queries/network/tvl';
import VChart from '@/lib/echarts/component';
import FormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import { useSettingsStore } from '@/stores/settings';
import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';
import type { Nullable } from '@/types/common';
import { calcPriceChange, formatAmountWithSuffix, formatDecimalPlaces } from '@/utils';

const props = withDefaults(
  defineProps<{
    parentLoading?: boolean;
  }>(),
  {
    parentLoading: false,
  }
);

const filters = NETWORK_STATS_FILTERS;
const filter = ref<SnapshotFilter>(filters[0]);
const data = ref<readonly { timestamp: number; value: number }[]>([]);
const isFetchingError = ref(false);

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
const { t, TranslationConsts } = useTranslation();
const { gridSpec, xAxisSpec, yAxisSpec, tooltipSpec, lineSeriesSpec } = useChartSpec();
const loadingState = computed(() => parentLoading.value || loading.value || !hasResolvedData.value);

const chart = ref<Nullable<unknown>>(null);
const chartKey = computed(() => `tvl-chart-${currencySymbol.value}-rate-${exchangeRate.value}`);

const firstValue = computed(() => new FPNumber(first(data.value)?.value ?? 0));
const lastValue = computed(() => new FPNumber(last(data.value)?.value ?? 0));

const amount = computed<AmountWithSuffix>(() => formatAmountWithSuffix(firstValue.value.mul(exchangeRate.value)));
const priceChange = computed(() => calcPriceChange(firstValue.value, lastValue.value));

const chartSpec = computed(() => ({
  dataset: {
    source: data.value.map((item) => [item.timestamp, item.value]),
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
      const [, value] = params[0].data;
      const currencyValue = new FPNumber(value).mul(exchangeRate.value);
      return `${currencySymbol.value} ${formatDecimalPlaces(currencyValue)}`;
    },
  }),
  series: [
    lineSeriesSpec({
      areaStyle: {
        opacity: 0.8,
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(248, 8, 123, 0.25)' },
          { offset: 1, color: 'rgba(255, 49, 148, 0.03)' },
        ]),
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
        const to = now - seconds * count;

        data.value = Object.freeze(await fetchData(now, to, type));
        isFetchingError.value = false;
        hasResolvedData.value = data.value.length > 0 || nodeIsConnected.value;
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
