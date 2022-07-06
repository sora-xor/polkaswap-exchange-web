<template>
  <div class="container container--charts" v-loading="parentLoading">
    <div class="tokens-info-container">
      <div class="header">
        <div class="selected-tokens">
          <div class="token-logos">
            <token-logo v-if="tokenFrom" class="token-logo" :token="tokenFrom" />
            <token-logo v-if="tokenTo" class="token-logo" :token="tokenTo" />
          </div>
          <div v-if="tokenFrom" class="token-title">
            <span>{{ tokenFrom.symbol }}</span>
            <span v-if="tokenTo">/{{ tokenTo.symbol }}</span>
          </div>
        </div>

        <div class="s-flex chart-controls">
          <div class="chart-filters">
            <s-tabs type="rounded" :value="selectedFilter.name" @click="selectFilter">
              <s-tab v-for="filter in filters" :key="filter.name" :name="filter.name" :label="filter.label" />
            </s-tabs>
          </div>

          <div class="s-flex chart-types">
            <s-button
              v-for="{ type, icon, active } in chartTypeButtons"
              :key="type"
              type="action"
              size="small"
              :class="['chart-type', { 's-pressed': active }]"
              @click="selectChartType(type)"
            >
              <component :is="icon" :class="{ active }" />
            </s-button>
          </div>
        </div>
      </div>

      <div class="price">
        <formatted-amount
          :value="fiatPriceFormatted"
          :font-weight-rate="FontWeightRate.MEDIUM"
          :font-size-rate="FontWeightRate.MEDIUM"
          :asset-symbol="symbol"
          symbol-as-decimal
        />
      </div>
      <div :class="priceChangeClasses">
        <s-icon class="price-change-arrow" :name="priceChangeArrow" size="14px" />{{ priceChangeFormatted }}%
      </div>
    </div>
    <v-chart
      class="chart"
      :option="chartSpec"
      v-loading="loading"
      autoresize
      @zr:mousewheel="handleZoom"
      @datazoom="changeZoomLevel"
    />
  </div>
</template>

<script lang="ts">
import dayjs from 'dayjs';
import { graphic } from 'echarts';
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';

import {
  components,
  mixins,
  SubqueryExplorerService,
  WALLET_CONSTS,
  SUBQUERY_TYPES,
} from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import LineIcon from '@/assets/img/charts/line.svg?inline';
import CandleIcon from '@/assets/img/charts/candle.svg?inline';

import { getter } from '@/store/decorators';
import { debouncedInputHandler, getCssVariableValue } from '@/utils';
import { AssetSnapshot } from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';

import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

type ChartDataItem = {
  timestamp: number;
  price: number[];
};

enum TIMEFRAME_TYPES {
  FIVE_MINUTES = 'FIVE_MINUTES',
  FIFTEEN_MINUTES = 'FIFTEEN_MINUTES',
  THIRTY_MINUTES = 'THIRTY_MINUTES',
  HOUR = 'HOUR',
  FOUR_HOURS = 'FOUR_HOURS',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
  ALL = 'ALL',
}

enum CHART_TYPES {
  LINE = 'line',
  CANDLE = 'candle',
}

type ChartFilter = {
  name: TIMEFRAME_TYPES;
  label: string;
  type: SUBQUERY_TYPES.AssetSnapshotTypes;
  count: number;
  group?: number;
};

const CHART_TYPE_ICONS = {
  [CHART_TYPES.LINE]: LineIcon,
  [CHART_TYPES.CANDLE]: CandleIcon,
};

const LINE_CHART_FILTERS: ChartFilter[] = [
  {
    name: TIMEFRAME_TYPES.DAY,
    label: '1D',
    type: SUBQUERY_TYPES.AssetSnapshotTypes.DEFAULT,
    count: 288, // 5 mins in day
  },
  {
    name: TIMEFRAME_TYPES.WEEK,
    label: '1W',
    type: SUBQUERY_TYPES.AssetSnapshotTypes.HOUR,
    count: 24 * 7, // hours in week
  },
  {
    name: TIMEFRAME_TYPES.MONTH,
    label: '1M',
    type: SUBQUERY_TYPES.AssetSnapshotTypes.HOUR,
    count: 24 * 30, // hours in month
  },
  {
    name: TIMEFRAME_TYPES.YEAR,
    label: '1Y',
    type: SUBQUERY_TYPES.AssetSnapshotTypes.DAY,
    count: 365, // days in year
  },
  {
    name: TIMEFRAME_TYPES.ALL,
    label: 'ALL',
    type: SUBQUERY_TYPES.AssetSnapshotTypes.DAY,
    count: Infinity,
  },
];

const CANDLE_CHART_FILTERS = [
  {
    name: TIMEFRAME_TYPES.FIVE_MINUTES,
    label: '5m',
    type: SUBQUERY_TYPES.AssetSnapshotTypes.DEFAULT,
    count: 48, // 5 mins in 4 hours
  },
  {
    name: TIMEFRAME_TYPES.FIFTEEN_MINUTES,
    label: '15m',
    type: SUBQUERY_TYPES.AssetSnapshotTypes.DEFAULT,
    count: 48 * 3, // 5 mins in 12 hours,
    group: 3, // 5 min in 15 min
  },
  {
    name: TIMEFRAME_TYPES.THIRTY_MINUTES,
    label: '30m',
    type: SUBQUERY_TYPES.AssetSnapshotTypes.DEFAULT,
    count: 48 * 3 * 2, // 5 mins in 24 hours,
    group: 6, // 5 min in 30 min
  },
  {
    name: TIMEFRAME_TYPES.HOUR,
    label: '1h',
    type: SUBQUERY_TYPES.AssetSnapshotTypes.HOUR,
    count: 24, // hours in day
  },
  {
    name: TIMEFRAME_TYPES.FOUR_HOURS,
    label: '4h',
    type: SUBQUERY_TYPES.AssetSnapshotTypes.HOUR,
    count: 24 * 4, // hours in 4 days,
    group: 4, // 1 hour in 4 hours
  },
  {
    name: TIMEFRAME_TYPES.DAY,
    label: '1D',
    type: SUBQUERY_TYPES.AssetSnapshotTypes.DAY,
    count: 90, // days in 3 months
  },
];

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    LineIcon,
    CandleIcon,
  },
})
export default class Charts extends Mixins(
  mixins.LoadingMixin,
  TranslationMixin,
  mixins.NumberFormatterMixin,
  mixins.FormattedAmountMixin
) {
  @getter.libraryTheme libraryTheme!: Theme;
  @getter.swap.tokenFrom tokenFrom!: AccountAsset;
  @getter.swap.tokenTo tokenTo!: AccountAsset;

  @Watch('tokenFrom')
  @Watch('tokenTo')
  private handleTokenChange(): void {
    this.clearData();
    this.updatePrices();
  }

  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;

  // ordered by timestamp DESC
  prices: ChartDataItem[] = [];
  pageInfos: any = [];
  zoomStart = 0; // percentage of zoom start position
  precision = 2;
  limits = {
    min: Infinity,
    max: 0,
  };

  updatePrices = debouncedInputHandler(this.getHistoricalPrices, 250);

  chartType: CHART_TYPES = CHART_TYPES.LINE;
  selectedFilter: ChartFilter = LINE_CHART_FILTERS[0];

  get isLineChart(): boolean {
    return this.chartType === CHART_TYPES.LINE;
  }

  get chartTypeButtons(): { type: CHART_TYPES; icon: any; active: boolean }[] {
    return Object.values(CHART_TYPES).map((type) => ({
      type,
      icon: CHART_TYPE_ICONS[type],
      active: this.chartType === type,
    }));
  }

  get filters(): ChartFilter[] {
    return this.isLineChart ? LINE_CHART_FILTERS : CANDLE_CHART_FILTERS;
  }

  get symbol(): string {
    return this.tokenTo?.symbol ?? 'USD';
  }

  get fromFiatPrice(): FPNumber {
    return this.tokenFrom ? FPNumber.fromCodecValue(this.getAssetFiatPrice(this.tokenFrom) ?? 0) : FPNumber.ZERO;
  }

  get toFiatPrice(): FPNumber {
    return this.tokenTo ? FPNumber.fromCodecValue(this.getAssetFiatPrice(this.tokenTo) ?? 0) : FPNumber.ZERO;
  }

  get fiatPrice(): FPNumber {
    return this.toFiatPrice.isZero() ? this.fromFiatPrice : this.fromFiatPrice.div(this.toFiatPrice);
  }

  get fiatPriceFormatted(): string {
    return this.fiatPrice.toLocaleString();
  }

  /**
   * Price change between current price and the last shapshot
   */
  get priceChange(): FPNumber {
    const last = new FPNumber(this.prices[0]?.price?.[0] ?? 0);
    const current = this.fiatPrice;
    const change = last.isZero() ? FPNumber.ZERO : current.sub(last).div(last).mul(FPNumber.HUNDRED);

    return change;
  }

  get priceChangeFormatted(): string {
    return this.priceChange.dp(2).toLocaleString();
  }

  get priceChangeIncreased(): boolean {
    return FPNumber.gt(this.priceChange, FPNumber.ZERO);
  }

  get priceChangeArrow(): string {
    return `arrows-arrow-bold-${this.priceChangeIncreased ? 'top' : 'bottom'}-24`;
  }

  get priceChangeClasses(): Array<string> {
    const baseClass = 'price-change';
    const cssClasses: Array<string> = [baseClass];
    if (this.priceChangeIncreased) {
      cssClasses.push(`${baseClass}--increased`);
    }
    return cssClasses;
  }

  get timeFormat(): string {
    switch (this.selectedFilter.type) {
      case SUBQUERY_TYPES.AssetSnapshotTypes.DAY:
        return 'DD MMM';
      default:
        return 'HH:mm';
    }
  }

  // ordered by timestamp ASC
  get chartData(): ChartDataItem[] {
    const prices = [...this.prices].reverse();
    const group = this.selectedFilter.group;
    const type = this.chartType;

    if (!group) return prices;

    const groups: ChartDataItem[] = [];

    for (let i = 0; i < prices.length; i++) {
      if (i % group === 0) {
        groups.push(prices[i]);
      } else if (type === CHART_TYPES.CANDLE) {
        const last = groups[groups.length - 1];

        last.price[1] = prices[i].price[1]; // close
        last.price[2] = Math.min(last.price[2], prices[i].price[2]); // low
        last.price[3] = Math.max(last.price[3], prices[i].price[3]); // high
      }
    }

    return groups;
  }

  get chartSpec(): any {
    const theme = !!this.libraryTheme;
    const common = {
      grid: {
        left: 50,
        right: 0,
        bottom: 20,
        top: 20,
      },
      xAxis: {
        type: 'category',
        data: this.chartData.map((item) => item.timestamp),
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          formatter: (value: string) => {
            return dayjs(+value).format(this.timeFormat);
          },
          color: getCssVariableValue('--s-color-base-content-secondary'),
          fontFamily: 'Sora',
          fontSize: 10,
          fontWeight: 300,
          lineHeigth: 1.5,
        },
        axisPointer: {
          lineStyle: {
            color: getCssVariableValue('--s-color-status-success'),
          },
          label: {
            backgroundColor: getCssVariableValue('--s-color-status-success'),
            color: '#fff',
            fontSize: 11,
            fontWeight: 400,
            lineHeigth: 1.5,
            margin: 0,
            formatter: ({ value }) => {
              return this.formatDate(+value); // locale format
            },
          },
        },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: {
          fontFamily: 'Sora',
          fontSize: 10,
          fontWeight: 300,
          lineHeigth: 1.5,
          margin: 0,
          padding: 3,
          formatter: (value) => {
            return value.toFixed(this.precision);
          },
        },
        axisLine: {
          lineStyle: {
            color: getCssVariableValue('--s-color-base-content-secondary'),
          },
        },
        axisPointer: {
          lineStyle: {
            color: getCssVariableValue('--s-color-status-success'),
          },
          label: {
            backgroundColor: getCssVariableValue('--s-color-status-success'),
            fontFamily: 'Sora',
            fontSize: 10,
            fontWeight: 400,
            lineHeigth: 1.5,
            padding: [4, 4],
            precision: this.precision,
          },
        },
        splitLine: {
          lineStyle: {
            color: getCssVariableValue('--s-color-base-content-tertiary'),
          },
        },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
      ],
      color: [getCssVariableValue('--s-color-theme-accent')],
      tooltip: {
        show: true,
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        valueFormatter: (value) => {
          return Number.isFinite(value) ? `${value.toFixed(this.precision)} ${this.symbol}` : value;
        },
      },
    };

    const series = this.isLineChart
      ? [
          {
            type: 'line',
            showSymbol: false,
            data: this.chartData.map((item) => item.price[0]),
            areaStyle: {
              opacity: 0.8,
              color: new graphic.LinearGradient(0, 0, 0, 1, [
                {
                  offset: 0,
                  color: 'rgba(248, 8, 123, 0.25)',
                },
                {
                  offset: 1,
                  color: 'rgba(255, 49, 148, 0.03)',
                },
              ]),
            },
          },
        ]
      : [
          {
            type: 'candlestick',
            data: this.chartData.map((item) => item.price),
            itemStyle: {
              color: getCssVariableValue('--s-color-status-success'),
              borderColor: getCssVariableValue('--s-color-status-success'),
              color0: getCssVariableValue('--s-color-theme-accent-hover'),
              borderColor0: getCssVariableValue('--s-color-theme-accent-hover'),
              borderWidth: 2,
            },
          },
        ];

    return theme && { ...common, series };
  }

  created(): void {
    this.updatePrices();
  }

  // ordered ty timestamp DESC
  async fetchData(address: string, filter: ChartFilter, pageInfo?: { hasNextPage: boolean; endCursor: string }) {
    if (pageInfo && !pageInfo.hasNextPage) return;

    const { type, count } = filter;
    const nodes: AssetSnapshot[] = [];

    let hasNextPage = pageInfo?.hasNextPage ?? true;
    let endCursor = pageInfo?.endCursor ?? '';
    let fetchCount = count;

    do {
      const first = Math.min(fetchCount, 100); // how many items should be fetched by request
      const response = await SubqueryExplorerService.getHistoricalPriceForAsset(address, type, first as any, endCursor);

      if (!response) throw new Error('Chart data fetch error');

      hasNextPage = response.hasNextPage;
      endCursor = response.endCursor;
      nodes.push(...response.nodes);
      fetchCount -= response.nodes.length;
    } while (hasNextPage && fetchCount > 0);

    return { nodes, hasNextPage, endCursor };
  }

  getHistoricalPrices(): void {
    if (this.loading) return;

    this.withApi(async () => {
      await this.withLoading(async () => {
        try {
          const addresses = [this.tokenFrom?.address, this.tokenTo?.address].filter(Boolean);
          const collections = await Promise.all(
            addresses.map((address, index) => this.fetchData(address, this.selectedFilter, this.pageInfos[index]))
          );

          if (!collections.every((collection) => !!collection)) return;

          this.pageInfos = collections.map((item: any) => ({
            hasNextPage: item.hasNextPage,
            endCursor: item.endCursor,
          }));

          const groups = (collections as any).map((collection) =>
            collection.nodes.map((item) => {
              const price = this.preparePriceData(item, this.chartType);

              return {
                timestamp: +item.timestamp * 1000,
                price,
              };
            })
          );

          const size = Math.max(groups[0]?.length ?? 0, groups[1]?.length ?? 0);

          for (let i = 0; i < size; i++) {
            const a = groups[0]?.[i];
            const b = groups[1]?.[i];

            const timestamp = (a?.timestamp ?? b?.timestamp) as number;
            const price = (b?.price && a?.price ? this.dividePrices(a.price, b.price) : a?.price ?? [0]) as number[];

            this.prices.push({
              timestamp,
              price,
            });

            this.limits = {
              min: Math.min(this.limits.min, ...price),
              max: Math.max(this.limits.max, ...price),
            };
          }

          this.precision = Math.max(this.getPrecision(this.limits.min), this.getPrecision(this.limits.max));
        } catch (error) {
          console.error(error);
        }
      });
    });
  }

  private preparePriceData(item: AssetSnapshot, chartType: CHART_TYPES): number[] {
    const priceData = [+item.priceUSD.open];

    if (chartType === CHART_TYPES.CANDLE) {
      priceData.push(+item.priceUSD.close, +item.priceUSD.low, +item.priceUSD.high);
    }

    return priceData;
  }

  private dividePrices(priceA: number[], priceB: number[]) {
    const div = (a: number, b: number) => (b !== 0 ? a / b : 0);

    return priceA.map((price, index) => div(price, priceB[index]));
  }

  private clearData(): void {
    this.prices = [];
    this.pageInfos = [];
    this.zoomStart = 0;
    this.limits = {
      min: Infinity,
      max: 0,
    };
    this.precision = 2;
  }

  changeFilter(filter: ChartFilter): void {
    this.selectedFilter = filter;
    this.clearData();
    this.updatePrices();
  }

  selectFilter({ name }): void {
    const filter = this.filters.find((item) => item.name === name);

    if (!filter) return;

    this.changeFilter(filter);
  }

  selectChartType(type: CHART_TYPES): void {
    this.chartType = type;
    this.changeFilter(this.filters[0]);
  }

  handleZoom(event: any): void {
    event?.stop?.();
    if (event?.wheelDelta === -1 && this.zoomStart === 0) {
      this.updatePrices();
    }
  }

  changeZoomLevel(event: any): void {
    this.zoomStart = event?.batch?.[0]?.start ?? 0;
  }

  private getPrecision(value: number): number {
    let precision = 2;

    if (value === 0 || !Number.isFinite(value)) return precision;

    while (Math.floor(value) <= 0) {
      value = value * 10;
      precision++;
    }

    return precision;
  }
}
</script>

<style lang="scss">
.tokens-info-container {
  .price {
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

.chart-filters {
  .el-tabs__header {
    margin-bottom: 0;
  }

  .s-tabs.s-rounded .el-tabs__nav-wrap .el-tabs__item {
    padding: 0 10px;
    text-transform: initial;
  }
}

.chart-type {
  svg {
    & > path {
      fill: var(--s-color-base-content-tertiary);
    }

    &.active {
      & > path {
        fill: var(--s-color-theme-accent);
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.chart {
  height: 400px;
}
.tokens {
  display: flex;
  flex-direction: column;
  font-size: var(--s-heading2-font-size);
  line-height: var(--s-line-height-small);
  &-info-container {
    display: flex;
    flex-direction: column;
    .price {
      display: flex;
      margin-bottom: $inner-spacing-mini / 2;
      font-weight: 800;
      font-size: var(--s-heading3-font-size);
      line-height: var(--s-line-height-extra-small);
      letter-spacing: var(--s-letter-spacing-small);
      &-change {
        font-weight: 600;
        font-size: var(--s-font-size-medium);
        line-height: var(--s-line-height-medium);
        color: var(--s-color-theme-accent);
        letter-spacing: inherit;
        &--increased {
          color: var(--s-color-status-success);
        }
        &-arrow {
          color: inherit;
        }
      }
    }
  }
}
.token {
  display: flex;
  align-items: center;
  white-space: nowrap;
  margin-bottom: $inner-spacing-medium;
  &-logo {
    display: block;
    flex-shrink: 0;
  }
  &-title {
    margin-left: $inner-spacing-small;
    font-size: var(--s-font-size-medium);
    line-height: var(--s-line-height-medium);
    font-weight: 600;
    letter-spacing: var(--s-letter-spacing-small);
  }
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selected-tokens {
  display: flex;
  align-items: center;

  .token-logos {
    display: flex;
    align-items: center;
  }
}

.chart-controls {
  & > *:not(:last-child) {
    margin-right: $inner-spacing-medium;
  }
}
</style>
