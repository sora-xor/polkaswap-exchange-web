<template>
  <div class="container container--charts" v-loading="parentLoading">
    <div class="tokens-info-container">
      <div class="header">
        <div class="selected-tokens">
          <tokens-row border :assets="tokens" size="medium" />
          <div v-if="tokenFrom" class="token-title">
            <span>{{ tokenFrom.symbol }}</span>
            <span v-if="tokenTo">/{{ tokenTo.symbol }}</span>
          </div>
        </div>
        <div class="chart-filters">
          <s-tabs type="rounded" :value="selectedFilter.name" @click="selectFilter">
            <s-tab
              v-for="filter in filters"
              :key="filter.name"
              :name="filter.name"
              :label="filter.label"
              :disabled="parentLoading || loading"
            />
          </s-tabs>
        </div>
        <div class="s-flex chart-types">
          <s-button
            v-for="{ type, icon, active } in chartTypeButtons"
            :key="type"
            type="action"
            size="small"
            :class="['chart-type', { 's-pressed': active }]"
            :disabled="parentLoading || loading"
            @click="selectChartType(type)"
          >
            <component :is="icon" :class="{ active }" />
          </s-button>
        </div>
      </div>
    </div>

    <s-skeleton :loading="parentLoading || loading || isFetchingError" :throttle="0">
      <template #template>
        <div v-loading="loading" class="charts-skeleton">
          <s-skeleton-item element="rect" class="charts-skeleton-price" />
          <div class="charts-skeleton-price-impact">
            <s-skeleton-item element="circle" />
            <s-skeleton-item element="rect" />
          </div>
          <div v-for="i in 9" :key="i" class="charts-skeleton-line">
            <s-skeleton-item element="rect" class="charts-skeleton-label" />
            <s-skeleton-item element="rect" class="charts-skeleton-border" />
          </div>
          <div class="charts-skeleton-line charts-skeleton-line--lables">
            <s-skeleton-item v-for="i in 11" :key="i" element="rect" class="charts-skeleton-label" />
          </div>
          <div v-if="isFetchingError && !loading" class="charts-skeleton-error">
            <s-icon name="clear-X-16" :size="'32px'" />
            <p class="charts-skeleton-error-message">{{ t('swap.errorFetching') }}</p>
            <s-button class="el-button--select-token" type="secondary" size="small" @click="retryUpdatePrices">
              {{ t('retryText') }}
            </s-button>
          </div>
        </div>
      </template>
      <template>
        <div class="charts-price">
          <formatted-amount
            :value="fiatPriceFormatted"
            :font-weight-rate="FontWeightRate.MEDIUM"
            :font-size-rate="FontWeightRate.MEDIUM"
            :asset-symbol="symbol"
            symbol-as-decimal
          />
        </div>
        <price-change v-if="!isFetchingError" :value="priceChange" />
        <v-chart class="chart" :option="chartSpec" autoresize @zr:mousewheel="handleZoom" @datazoom="changeZoomLevel" />
      </template>
    </s-skeleton>
  </div>
</template>

<script lang="ts">
import dayjs from 'dayjs';
import last from 'lodash/fp/last';
import { graphic } from 'echarts';
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';
import { SSkeleton, SSkeletonItem } from '@soramitsu/soramitsu-js-ui/lib/components/Skeleton';

import {
  components,
  mixins,
  SubqueryExplorerService,
  WALLET_CONSTS,
  SUBQUERY_TYPES,
} from '@soramitsu/soraneo-wallet-web';

import ThemePaletteMixin from '@/components/mixins/ThemePaletteMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import LineIcon from '@/assets/img/charts/line.svg?inline';
import CandleIcon from '@/assets/img/charts/candle.svg?inline';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { getter } from '@/store/decorators';
import { debouncedInputHandler, getTextWidth, calcPriceChange } from '@/utils';
import { AssetSnapshot } from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';

import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';

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
  CANDLE = 'candlestick',
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

const LABEL_PADDING = 4;

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    LineIcon,
    CandleIcon,
    TokensRow: lazyComponent(Components.TokensRow),
    PriceChange: lazyComponent(Components.PriceChange),
    SSkeleton,
    SSkeletonItem,
  },
})
export default class SwapChart extends Mixins(
  TranslationMixin,
  ThemePaletteMixin,
  mixins.LoadingMixin,
  mixins.NumberFormatterMixin,
  mixins.FormattedAmountMixin
) {
  @getter.swap.tokenFrom tokenFrom!: AccountAsset;
  @getter.swap.tokenTo tokenTo!: AccountAsset;

  @Watch('tokenFrom')
  @Watch('tokenTo')
  private handleTokenChange(): void {
    this.clearData();
    this.updatePrices();
  }

  isFetchingError = false;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;

  // ordered by timestamp DESC
  prices: ChartDataItem[] = [];
  pageInfos: SUBQUERY_TYPES.PageInfo[] = [];
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

  get tokens(): Asset[] {
    return [this.tokenFrom, this.tokenTo].filter((token) => !!token);
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
    const lastFiatPrice = new FPNumber(last(this.chartData)?.price?.[0] ?? 0);

    return calcPriceChange(this.fiatPrice, lastFiatPrice);
  }

  get timeFormat(): string {
    switch (this.selectedFilter.type) {
      case SUBQUERY_TYPES.AssetSnapshotTypes.DAY:
        return 'll';
      default:
        return 'LT';
    }
  }

  get axisLabelCSS() {
    return {
      fontFamily: 'Sora',
      fontSize: 10,
      fontWeight: 300,
      lineHeigth: 1.5,
    };
  }

  get gridLeftOffset(): number {
    return (
      2 * LABEL_PADDING +
      getTextWidth(
        String(this.limits.max.toFixed(this.precision)),
        this.axisLabelCSS.fontFamily,
        this.axisLabelCSS.fontSize
      )
    );
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
    const common = {
      grid: {
        left: this.gridLeftOffset,
        right: 0,
        bottom: 20,
        top: 20,
      },
      xAxis: {
        type: 'category',
        data: this.chartData.map((item, index, arr) => {
          return {
            value: item.timestamp,
            isNewDay:
              index !== 0 ? new Date(arr[index - 1].timestamp).getDate() !== new Date(item.timestamp).getDate() : false,
          };
        }),
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          formatter: (value: string, isNewDay: boolean) => {
            // TODO: Check this place, add date instead of new first new date time
            if (this.selectedFilter.type === SUBQUERY_TYPES.AssetSnapshotTypes.HOUR && isNewDay) {
              return dayjs(+value).format('MMM DD');
            }
            return dayjs(+value).format(this.timeFormat);
          },
          color: this.theme.color.base.content.secondary,
          ...this.axisLabelCSS,
        },
        axisPointer: {
          lineStyle: {
            color: this.theme.color.status.success,
          },
          label: {
            backgroundColor: this.theme.color.status.success,
            color: this.theme.color.base.onAccent,
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
          ...this.axisLabelCSS,
          margin: 0,
          padding: LABEL_PADDING - 1,
          formatter: (value) => {
            return value.toFixed(this.precision);
          },
        },
        axisLine: {
          lineStyle: {
            color: this.theme.color.base.content.secondary,
          },
        },
        axisPointer: {
          lineStyle: {
            color: this.theme.color.status.success,
          },
          label: {
            backgroundColor: this.theme.color.status.success,
            fontFamily: 'Sora',
            fontSize: 10,
            fontWeight: 400,
            lineHeigth: 1.5,
            padding: [LABEL_PADDING, LABEL_PADDING],
            precision: this.precision,
            color: this.theme.color.base.onAccent,
          },
        },
        splitLine: {
          lineStyle: {
            color: this.theme.color.base.content.tertiary,
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
      color: [this.theme.color.theme.accent, this.theme.color.status.success],
      tooltip: {
        show: true,
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        backgroundColor: this.theme.color.utility.body,
        borderColor: this.theme.color.base.border.secondary,
        extraCssText: `box-shadow: ${this.theme.shadow.dialog}; border-radius: ${this.theme.border.radius.mini}`,
        textStyle: {
          color: this.theme.color.base.content.secondary,
          fontSize: 11,
          fontFamily: 'Sora',
          fontWeight: 400,
        },
        formatter: (params) => {
          const { data, seriesType } = params[0];

          const signific = (value: FPNumber) => (positive: string, negative: string, zero: string) =>
            FPNumber.gt(value, FPNumber.ZERO) ? positive : FPNumber.lt(value, FPNumber.ZERO) ? negative : zero;
          const formatPrice = (value: number) => `${new FPNumber(value).toLocaleString()} ${this.symbol}`;
          const formatChange = (value: FPNumber) => {
            const sign = signific(value)('+', '', '');
            const priceChange = this.formatPriceChange(value);

            return `${sign}${priceChange}%`;
          };

          if (seriesType === CHART_TYPES.LINE) return formatPrice(data);

          if (seriesType === CHART_TYPES.CANDLE) {
            const [index, open, close, low, high] = data;
            const change = calcPriceChange(new FPNumber(close), new FPNumber(open));
            const changeColor = signific(change)(
              this.theme.color.status.success,
              this.theme.color.status.error,
              this.theme.color.base.content.primary
            );

            const rows = [
              { title: 'Open', data: formatPrice(open) },
              { title: 'High', data: formatPrice(high) },
              { title: 'Low', data: formatPrice(low) },
              { title: 'Close', data: formatPrice(close) },
              { title: 'Change', data: formatChange(change), color: changeColor },
            ];

            return `
              <table>
                ${rows
                  .map(
                    (row) => `
                  <tr>
                    <td align="right" style="color:${this.theme.color.base.content.secondary}">${row.title}</td>
                    <td style="color:${row.color ?? this.theme.color.base.content.primary}">${row.data}</td>
                  </tr>
                `
                  )
                  .join('')}
              </table>
            `;
          }
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
              color: this.theme.color.status.success,
              borderColor: this.theme.color.status.success,
              color0: this.theme.color.theme.accentHover,
              borderColor0: this.theme.color.theme.accentHover,
              borderWidth: 2,
            },
          },
        ];

    return { ...common, series };
  }

  created(): void {
    this.updatePrices();
  }

  // ordered ty timestamp DESC
  async fetchData(address: string, filter: ChartFilter, pageInfo?: SUBQUERY_TYPES.PageInfo) {
    const { type, count } = filter;
    const nodes: AssetSnapshot[] = [];

    let hasNextPage = pageInfo?.hasNextPage ?? true;
    let endCursor = pageInfo?.endCursor ?? '';
    let fetchCount = count;

    do {
      const first = Math.min(fetchCount, 100); // how many items should be fetched by request
      const response = await SubqueryExplorerService.getHistoricalPriceForAsset(address, type, first, endCursor);

      if (!response) throw new Error('Chart data fetch error');

      hasNextPage = response.hasNextPage;
      endCursor = response.endCursor;
      nodes.push(...response.nodes);
      fetchCount -= response.nodes.length;
    } while (hasNextPage && fetchCount > 0);

    return { nodes, hasNextPage, endCursor };
  }

  getHistoricalPrices(): void {
    if (this.loading || this.pageInfos.some((pageInfo) => !pageInfo.hasNextPage)) return;

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

          const groups = collections.map((collection: any) =>
            collection.nodes.map((item) => {
              const price = this.preparePriceData(item, this.chartType);

              return {
                timestamp: +item.timestamp * 1000,
                price,
              };
            })
          );

          const prices: ChartDataItem[] = [];
          const size = Math.max(groups[0]?.length ?? 0, groups[1]?.length ?? 0);
          let { min, max } = this.limits;

          for (let i = 0; i < size; i++) {
            const a = groups[0]?.[i];
            const b = groups[1]?.[i];

            const timestamp = (a?.timestamp ?? b?.timestamp) as number;
            const price = (b?.price && a?.price ? this.dividePrices(a.price, b.price) : a?.price ?? [0]) as number[];

            prices.push({
              timestamp,
              price,
            });

            min = Math.min(min, ...price);
            max = Math.max(max, ...price);
          }

          this.precision = Math.max(this.getPrecision(min), this.getPrecision(max));
          this.limits = { min, max };
          this.prices = [...this.prices, ...prices];
          this.isFetchingError = false;
        } catch (error) {
          this.isFetchingError = true;
          console.error(error);
        }
      });
    });
  }

  private preparePriceData(item: AssetSnapshot, chartType: CHART_TYPES): number[] {
    const { open, close, low, high } = item.priceUSD;
    const priceData = [+open];

    if (chartType === CHART_TYPES.CANDLE) {
      priceData.push(+close, +low, +high);
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

  retryUpdatePrices(event: any): void {
    this.updatePrices();
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

  private formatPriceChange(value: FPNumber): string {
    return value.dp(2).toLocaleString();
  }
}
</script>

<style lang="scss">
$skeleton-label-width: 34px;
.charts {
  &-price {
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
        color: var(--s-color-theme-secondary-hover);
      }
      &-arrow {
        color: inherit;
      }
    }
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
  width: 100%;
  order: 1;
  .el-tabs__header {
    margin-bottom: 0;
  }

  .s-tabs.s-rounded .el-tabs__nav-wrap .el-tabs__item {
    padding: 0 $inner-spacing-mini;
    text-transform: initial;
    &:not(.is-active).is-disabled {
      color: var(--s-color-base-content-primary);
    }
    &.is-disabled {
      cursor: not-allowed;
    }
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

.charts-skeleton {
  $margin-right: #{$inner-spacing-mini / 2};
  $skeleton-label-width-mobile: calc((100% - #{$margin-right} * 10) / 11);
  $skeleton-spacing: 18px;
  position: relative;
  .el-loading-mask {
    background-color: transparent;
  }
  .el-skeleton__item {
    background: var(--s-color-base-border-secondary);
  }
  &-price {
    width: 157px;
    &.el-skeleton__item.el-skeleton__rect {
      height: $skeleton-spacing;
      margin-bottom: $inner-spacing-medium;
    }
    &-impact {
      display: flex;
      max-width: 150px;
      > :first-child,
      > :last-child {
        height: 9px;
      }
      > :first-child {
        width: 9px;
        margin-right: $margin-right;
      }
      > :last-child {
        width: 42px;
      }
      + .charts-skeleton-line {
        margin-top: 19px;
      }
    }
  }
  &-line {
    display: flex;
    align-items: center;
    flex-grow: 0;
    margin-top: 22px;
    &--lables {
      justify-content: space-between;
      margin-top: $inner-spacing-medium;
      padding-left: calc(#{$margin-right} + #{$skeleton-label-width});
    }
  }
  &-label.el-skeleton__item.el-skeleton__rect {
    height: 8px;
    width: $skeleton-label-width-mobile;
    margin-bottom: 0;
    margin-right: $margin-right;
  }
  &-border.el-skeleton__rect {
    width: calc(100% - $skeleton-label-width-mobile - $margin-right);
    height: 1px;
  }
  &-error {
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    top: 0;
    height: 100%;
    width: 100%;
    &-message {
      margin-top: $skeleton-spacing;
      margin-bottom: $skeleton-spacing;
      font-weight: 400;
      font-size: var(--s-font-size-medium);
      line-height: var(--s-line-height-medium);
      letter-spacing: var(--s-letter-spacing-small);
    }
    .el-button.s-secondary {
      padding-right: $inner-spacing-big;
      padding-left: $inner-spacing-big;
    }
  }
  .s-icon-clear-X-16:before {
    color: var(--s-color-status-error);
  }
}

@include desktop {
  .container--charts {
    position: relative;
    z-index: 1;
  }
  .chart-filters {
    .s-tabs.s-rounded .el-tabs__nav-wrap .el-tabs__item {
      padding: 0 $basic-spacing-small;
    }
  }
}

@include large-desktop {
  .charts-skeleton {
    &-price {
      &-impact {
        + .charts-skeleton-line {
          margin-top: 20px;
        }
      }
    }
    &-line {
      margin-top: 26px;
    }
    &-label.el-skeleton__item.el-skeleton__rect {
      max-width: $skeleton-label-width;
    }
  }
  .chart-filters {
    margin-left: auto;
    width: auto;
    order: initial;
  }
}
</style>

<style lang="scss" scoped>
.chart {
  height: 283px;
}
.tokens {
  display: flex;
  flex-direction: column;
  font-size: var(--s-heading2-font-size);
  line-height: var(--s-line-height-small);
  &-info-container {
    display: flex;
    flex-direction: column;
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
    margin-left: $inner-spacing-mini;
    font-size: var(--s-font-size-medium);
    line-height: var(--s-line-height-medium);
    font-weight: 600;
    letter-spacing: var(--s-letter-spacing-small);
  }
}

.header {
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  justify-content: space-between;

  & > * {
    margin-bottom: $inner-spacing-small;

    &:not(:last-child) {
      margin-right: $inner-spacing-medium;
    }
  }
}

.selected-tokens {
  display: flex;
  align-items: center;
}

@include large-desktop {
  .chart {
    height: 323px;
  }
}
</style>
