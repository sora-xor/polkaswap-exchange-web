<template>
  <base-widget v-bind="$attrs" :title="t('createToken.tokenSupply.placeholder')" :tooltip="t('tooltips.supply')">
    <template #filters>
      <stats-filter
        is-dropdown
        :filters="filters"
        :model-value="filter"
        @update:model-value="changeFilter"
      ></stats-filter>
    </template>

    <template v-if="!predefinedToken" #types>
      <token-select-button
        :icon="selectTokenIcon"
        :token="selectedToken"
        :tabindex="tokenTabIndex"
        @click.stop="handleSelectToken"
      ></token-select-button>
    </template>

    <chart-skeleton
      :loading="areActionsDisabled"
      :is-empty="data.length === 0"
      :is-error="isFetchingError"
      @retry="updateData"
    >
      <formatted-amount class="chart-price" :value="amount.amount">
        {{ amount.suffix }}
      </formatted-amount>
      <PriceChange :value="priceChange"></PriceChange>
      <v-chart ref="chart" class="chart" :option="chartSpec" autoresize></v-chart>
    </chart-skeleton>
    <select-token
      v-if="!predefinedToken"
      disabled-custom
      v-model:visible="showSelectTokenDialog"
      :asset="selectedToken"
      @select="onTokenChange"
    ></select-token>
  </base-widget>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/math';
import ChartSkeleton from '@/components/shared/Chart/ChartSkeleton.vue';
import TokenSelectButton from '@/components/shared/Input/TokenSelectButton.vue';
import PriceChange from '@/components/shared/PriceChange.vue';
import SelectToken from '@/components/shared/SelectAsset/SelectToken.vue';
import StatsFilter from '@/components/shared/Stats/StatsFilter.vue';
import BaseWidget from '@/components/shared/Widget/Base.vue';
import first from 'lodash/fp/first';
import last from 'lodash/fp/last';
import { computed, getCurrentScope, onMounted, onScopeDispose, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import { SECONDS_IN_TYPE, ASSET_SUPPLY_FILTERS } from '@/consts/snapshots';
import { useChartSpec } from '@/composables/useChartSpec';
import { useLoading } from '@/composables/useLoading';
import { useThemePalette, createThemePalette } from '@/composables/useThemePalette';
import { useTranslation } from '@/composables/useTranslation';
import { useWidgetTokenSelect } from '@/composables/useWidgetTokenSelect';
import { fetchAssetSupplyData } from '@/indexer/queries/asset/supply';
import VChart from '@/lib/echarts/component';
import FormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import { useSettingsStore } from '@/stores/settings';
import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';
import type { Nullable } from '@/types/common';
import { calcPriceChange, formatAmountWithSuffix, formatDecimalPlaces } from '@/utils';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

type ChartData = {
  timestamp: number;
  value: number;
  mint: number;
  burn: number;
};

const props = withDefaults(
  defineProps<{
    parentLoading?: boolean;
    predefinedToken?: Nullable<Asset>;
    defaultAsset?: Asset;
  }>(),
  {
    parentLoading: false,
    predefinedToken: null,
    defaultAsset: undefined,
  }
);

const predefinedToken = computed<Nullable<Asset>>(() => props.predefinedToken);
const filters = ASSET_SUPPLY_FILTERS;
const filter = ref<SnapshotFilter>(filters[0]);
const data = ref<readonly ChartData[]>([]);
const isFetchingError = ref(false);

const settingsStore = useSettingsStore();
const { exchangeRate } = storeToRefs(settingsStore);
const indexerEndpoint = computed(() => {
  const type = settingsStore.indexerType;

  return type ? (settingsStore.indexers?.[type]?.endpoint ?? '') : '';
});

const parentLoading = computed(() => props.parentLoading);
const { loading, withLoading, withParentLoading } = useLoading({ parentLoading });
const { t } = useTranslation();
const { theme } = useThemePalette();
const { gridSpec, xAxisSpec, yAxisSpec, tooltipSpec, seriesSpec, lineSeriesSpec } = useChartSpec();

const {
  selectedToken,
  areActionsDisabled,
  selectTokenIcon,
  tokenTabIndex,
  showSelectTokenDialog,
  handleSelectToken,
  changeToken,
  closeTokenDialog,
} = useWidgetTokenSelect({
  defaultAsset: props.defaultAsset,
  predefinedToken,
  parentLoading: () => parentLoading.value,
  loading: () => loading.value,
});

const chart = ref<Nullable<unknown>>(null);

const palette = computed(() => theme.value ?? createThemePalette());
const chartKey = computed(() => `supply-chart-${selectedToken.value.address}`);

const firstValue = computed(() => new FPNumber(first(data.value)?.value ?? 0));
const lastValue = computed(() => new FPNumber(last(data.value)?.value ?? 0));

const amount = computed<AmountWithSuffix>(() => formatAmountWithSuffix(firstValue.value));
const priceChange = computed(() => calcPriceChange(firstValue.value, lastValue.value));

const chartSpec = computed(() => {
  const formatter = (value: number | string): string => {
    const val = new FPNumber(value);
    const formatted = formatAmountWithSuffix(val);
    return `${formatted.amount} ${formatted.suffix}`;
  };

  const paletteValue = palette.value;

  return {
    dataset: {
      source: data.value.map((item) => [item.timestamp, item.value, item.mint, item.burn]),
      dimensions: ['timestamp', 'supply', 'mint', 'burn'],
    },
    grid: gridSpec({
      top: 40,
      left: 50,
      right: 50,
    }),
    xAxis: xAxisSpec(),
    yAxis: [
      yAxisSpec({
        name: 'Remint\nBurn',
        nameGap: 12,
        nameTextStyle: {
          align: 'right',
        },
        type: 'log',
        min: 1,
        axisLabel: {
          formatter,
        },
        splitLine: false,
      }),
      yAxisSpec({
        name: 'Supply',
        nameGap: 22,
        nameTextStyle: {
          align: 'left',
        },
        axisLabel: {
          formatter,
        },
      }),
    ],
    tooltip: tooltipSpec({
      formatter: (params: Array<{ marker: string; seriesName: string; seriesIndex: number; data: number[] }>) => `
          <table>
            ${params
              .map(
                (param) => `
              <tr>
                <td>${param.marker} ${param.seriesName}</td>
                <td align="right">${formatDecimalPlaces(param.data[param.seriesIndex + 1])}</td>
              </tr>
            `
              )
              .join('')}
          </table>
        `,
    }),
    series: [
      lineSeriesSpec({
        encode: { y: 'value' },
        itemStyle: {
          color: paletteValue.color.status.info,
        },
        name: 'Supply',
        yAxisIndex: 1,
        areaStyle: undefined,
      }),
      seriesSpec({
        type: 'bar',
        encode: { y: 'mint' },
        itemStyle: {
          color: paletteValue.color.status.success,
          opacity: 0.5,
        },
        name: 'Remint',
        yAxisIndex: 0,
        areaStyle: undefined,
      }),
      seriesSpec({
        type: 'bar',
        encode: { y: 'burn' },
        itemStyle: {
          color: paletteValue.color.status.error,
          opacity: 0.5,
        },
        name: 'Burn',
        yAxisIndex: 0,
        areaStyle: undefined,
      }),
    ],
    legend: {
      orient: 'horizontal' as const,
      top: 0,
      left: 'center',
      icon: 'circle',
      textStyle: {
        color: paletteValue.color.base.content.primary,
        fontSize: 12,
        fontWeight: 400,
        lineHeight: 1.5,
      },
      selectedMode: false,
    },
  };
});

const changeFilter = (next: SnapshotFilter) => {
  filter.value = next;
  updateData();
};

const onTokenChange = (token: Asset) => {
  changeToken(token);
  closeTokenDialog();
};

const updateData = async () => {
  await withLoading(async () => {
    await withParentLoading(async () => {
      try {
        const id = selectedToken.value.address;
        const { type, count } = filter.value;
        const seconds = SECONDS_IN_TYPE[type];
        const now = Math.floor(Date.now() / (seconds * 1000)) * seconds;
        const aTime = now - seconds * count;

        data.value = Object.freeze(await fetchAssetSupplyData(id, now, aTime, type));
        isFetchingError.value = false;
      } catch (error) {
        console.error(error);
        isFetchingError.value = true;
      }
    });
  });
};

onMounted(updateData);

watch(
  () => selectedToken.value.address,
  (current, previous) => {
    if (!previous || current === previous) return;
    updateData();
  }
);

watch(indexerEndpoint, (endpoint, previousEndpoint) => {
  if (!endpoint || endpoint === previousEndpoint) return;

  updateData();
});

if (getCurrentScope()) {
  onScopeDispose(() => {
    chart.value = null;
  });
}
</script>
