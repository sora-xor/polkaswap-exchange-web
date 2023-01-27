<template>
  <div class="container container--charts" v-loading="parentLoading">
    <div class="tokens-info-container">
      <div class="header">
        <div class="selected-tokens">
          <tokens-row border :assets="tokens" size="medium" />
          <div v-if="tokenA" class="token-title">
            <span>{{ tokenA.symbol }}</span>
            <span v-if="tokenB">/{{ tokenB.symbol }}</span>
          </div>
          <s-button
            v-if="this.tokensPair"
            :class="{ 's-pressed': isReversedChart }"
            type="action"
            alternative
            icon="arrows-swap-90-24"
            @click="revertChart"
          />
        </div>
        <div class="chart-filters">
          <s-tabs type="rounded" :value="selectedFilter.name" @input="selectFilter">
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
          <svg-icon-button
            v-for="{ type, icon, active } in chartTypeButtons"
            :key="type"
            :icon="icon"
            :active="active"
            :disabled="parentLoading || loading"
            size="small"
            @click="selectChartType(type)"
          />
        </div>
      </div>
    </div>

    <s-skeleton :loading="parentLoading || loading || chartDataIssue" :throttle="0">
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
          <div v-if="chartDataIssue" class="charts-skeleton-error">
            <s-icon v-if="isFetchingError" name="clear-X-16" :size="'32px'" />
            <p class="charts-skeleton-error-message">
              <template v-if="isFetchingError">{{ t('swap.errorFetching') }}</template>
              <template v-else>{{ t('noDataText') }}</template>
            </p>
            <s-button
              v-if="isFetchingError"
              class="el-button--select-token"
              type="secondary"
              size="small"
              @click="updatePrices"
            >
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
        <v-chart
          ref="chart"
          class="chart"
          :option="chartSpec"
          autoresize
          @zr:mousewheel="handleZoom"
          @datazoom="changeZoomLevel"
        />
      </template>
    </s-skeleton>
  </div>
</template>

<script lang="ts">
import dayjs from 'dayjs';
import isEqual from 'lodash/fp/isEqual';
import last from 'lodash/fp/last';
import { graphic } from 'echarts';
import { Component, Mixins, Watch, Prop } from 'vue-property-decorator';
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

import { SvgIcons } from '@/components/Button/SvgIconButton/icons';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { debouncedInputHandler, getTextWidth, calcPriceChange, formatDecimalPlaces } from '@/utils';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type {
  PageInfo,
  AssetSnapshotEntity,
  FiatPriceObject,
} from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';

/** "open", "close", "low", "high" data */
type OCLH = [number, number, number, number];

type SnapshotItem = {
  timestamp: number;
  price: OCLH;
};

/** "timestamp", "open", "close", "low", "high" data */
type ChartDataItem = [number, ...OCLH];

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
  [CHART_TYPES.LINE]: SvgIcons.LineIcon,
  [CHART_TYPES.CANDLE]: SvgIcons.CandleIcon,
};

const SECONDS_IN_TYPE = {
  [SUBQUERY_TYPES.AssetSnapshotTypes.DEFAULT]: 5 * 60 * 1000,
  [SUBQUERY_TYPES.AssetSnapshotTypes.HOUR]: 60 * 60 * 1000,
  [SUBQUERY_TYPES.AssetSnapshotTypes.DAY]: 24 * 60 * 60 * 1000,
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
    type: SUBQUERY_TYPES.AssetSnapshotTypes.DAY,
    count: 30, // days in month
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
const AXIS_OFFSET = 8;
const AXIS_LABEL_CSS = {
  fontFamily: 'Sora',
  fontSize: 10,
  fontWeight: 300,
  lineHeigth: 1.5,
};

const SYNC_INTERVAL = 6 * 1000;

const signific =
  (value: FPNumber) =>
  (positive: string, negative: string, zero: string): string => {
    return FPNumber.gt(value, FPNumber.ZERO) ? positive : FPNumber.lt(value, FPNumber.ZERO) ? negative : zero;
  };

const formatChange = (value: FPNumber): string => {
  const sign = signific(value)('+', '', '');
  const priceChange = formatDecimalPlaces(value, true);

  return `${sign}${priceChange}`;
};

const formatPrice = (value: number, symbol: string) => {
  return `${new FPNumber(value).toLocaleString()} ${symbol}`;
};

const preparePriceData = (item: AssetSnapshotEntity): OCLH => {
  const { open, close, low, high } = item.priceUSD;

  return [+open, +close, +low, +high];
};

const dividePrice = (priceA: number, priceB: number): number => {
  return priceB !== 0 ? priceA / priceB : 0;
};

const dividePrices = (priceA: OCLH, priceB: OCLH): OCLH => {
  return priceA.map((price, index) => dividePrice(price, priceB[index])) as OCLH;
};

const transformSnapshot = (item: AssetSnapshotEntity): SnapshotItem => {
  const timestamp = +item.timestamp * 1000;
  const price = preparePriceData(item);
  return { timestamp, price };
};

const normalizeSnapshots = (collection: SnapshotItem[], difference: number, lastTimestamp: number): SnapshotItem[] => {
  const sample: SnapshotItem[] = [];

  for (const item of collection) {
    const buffer: SnapshotItem[] = [];
    const prevTimestamp = last(sample)?.timestamp ?? lastTimestamp;

    let currentTimestamp = item.timestamp;

    while ((currentTimestamp += difference) < prevTimestamp) {
      buffer.push({
        timestamp: currentTimestamp,
        price: [item.price[1], item.price[1], item.price[1], item.price[1]],
      });
    }

    sample.push(...buffer.reverse(), item);
  }

  return sample;
};

const getPrecision = (value: number): number => {
  let precision = 2;

  if (value === 0 || !Number.isFinite(value)) return precision;

  let abs = Math.abs(value);

  while (Math.floor(abs) <= 0) {
    abs = abs * 10;
    precision++;
  }

  return precision;
};

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    SvgIconButton: lazyComponent(Components.SvgIconButton),
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
  @Prop({ default: () => null, type: Object }) readonly tokenFrom!: Nullable<AccountAsset>;
  @Prop({ default: () => null, type: Object }) readonly tokenTo!: Nullable<AccountAsset>;
  @Prop({ default: false, type: Boolean }) readonly isAvailable!: boolean;

  @Watch('inputTokensAddresses')
  private handleTokensChange(current: string[], prev: string[]): void {
    if (!isEqual(current)(prev)) {
      const currentChartPair = this.isReversedChart ? [...prev].reverse() : prev;

      this.isReversedChart = false;

      if (!isEqual(current)(currentChartPair)) {
        this.forceUpdatePrices();
      }
    }
  }

  isFetchingError = false;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;

  // ordered by timestamp DESC
  private samplesBuffer: Record<string, readonly SnapshotItem[]> = {};
  private pageInfos: Record<string, Partial<PageInfo>> = {};
  private prices: readonly SnapshotItem[] = [];
  private zoomStart = 0; // percentage of zoom start position
  private zoomEnd = 100; // percentage of zoom end position
  private precision = 2;
  private limits = {
    min: Infinity,
    max: 0,
  };

  updatePrices = debouncedInputHandler(this.getHistoricalPrices, 250, { leading: false });
  private forceUpdatePrices = debouncedInputHandler(this.resetAndUpdatePrices, 250, { leading: false });
  private priceUpdateRequestId = 0;
  private priceUpdateWatcher: Nullable<FnWithoutArgs> = null;
  private priceUpdateTimestampSync: Nullable<NodeJS.Timer | number> = null;

  chartType: CHART_TYPES = CHART_TYPES.LINE;
  selectedFilter: ChartFilter = LINE_CHART_FILTERS[0];
  isReversedChart = false;

  get isLineChart(): boolean {
    return this.chartType === CHART_TYPES.LINE;
  }

  get inputTokensAddresses(): string[] {
    const filtered = [this.tokenFrom, this.tokenTo].filter((token) => !!token) as AccountAsset[];

    return filtered.map((token) => token.address);
  }

  get tokenA() {
    return this.isReversedChart ? this.tokenTo : this.tokenFrom;
  }

  get tokenB() {
    return this.isReversedChart ? this.tokenFrom : this.tokenTo;
  }

  get tokens(): AccountAsset[] {
    return [this.tokenA, this.tokenB].filter((token) => !!token) as AccountAsset[];
  }

  get tokensAddresses(): string[] {
    return this.tokens.map((token) => token.address);
  }

  get tokensPair(): boolean {
    return this.tokensAddresses.length === 2;
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
    return this.tokenB?.symbol ?? 'USD';
  }

  get fromFiatPrice(): FPNumber {
    return this.tokenA ? FPNumber.fromCodecValue(this.getAssetFiatPrice(this.tokenA) ?? 0) : FPNumber.ZERO;
  }

  get toFiatPrice(): FPNumber {
    return this.tokenB ? FPNumber.fromCodecValue(this.getAssetFiatPrice(this.tokenB) ?? 0) : FPNumber.ZERO;
  }

  get fiatPrice(): FPNumber {
    return this.toFiatPrice.isZero() ? this.fromFiatPrice : this.fromFiatPrice.div(this.toFiatPrice);
  }

  get fiatPriceFormatted(): string {
    return this.fiatPrice.toLocaleString();
  }

  get isAllHistoricalPricesFetched(): boolean {
    return Object.entries(this.pageInfos).some(([address, pageInfo]) => {
      return !pageInfo.hasNextPage && !this.samplesBuffer[address]?.length;
    });
  }

  get timeDifference(): number {
    return SECONDS_IN_TYPE[this.selectedFilter.type];
  }

  get visibleChartItemsRange(): [number, number] {
    const itemsCount = this.chartData.length;
    const startIndex = Math.floor((itemsCount * this.zoomStart) / 100);
    const endIndex = Math.ceil((itemsCount * this.zoomEnd) / 100) - 1;

    return [startIndex, endIndex];
  }

  /**
   * Price change in visible range
   */
  get priceChange(): FPNumber {
    const [startIndex, endIndex] = this.visibleChartItemsRange;
    const rangeStartPrice = new FPNumber(this.chartData[startIndex]?.[2] ?? 0); // "close" price
    const rangeClosePrice = new FPNumber(this.chartData[endIndex]?.[2] ?? 0); // "close" price

    return calcPriceChange(rangeClosePrice, rangeStartPrice);
  }

  get gridLeftOffset(): number {
    const maxLabel = this.limits.max * 10;
    const axisLabelWidth = getTextWidth(
      String(maxLabel.toFixed(this.precision)),
      AXIS_LABEL_CSS.fontFamily,
      AXIS_LABEL_CSS.fontSize
    );

    return AXIS_OFFSET + 2 * LABEL_PADDING + axisLabelWidth;
  }

  get chartData(): readonly ChartDataItem[] {
    const groups: ChartDataItem[] = [];
    const {
      prices,
      selectedFilter: { group },
    } = this;
    // ordered by timestamp ASC
    const ordered = prices.slice().reverse();

    for (let i = 0; i < ordered.length; i++) {
      if (!group || i % group === 0) {
        groups.push([ordered[i].timestamp, ...ordered[i].price]);
      } else {
        const lastGroup = last(groups);

        if (lastGroup) {
          lastGroup[2] = ordered[i].price[1]; // close
          lastGroup[3] = Math.min(lastGroup[3], ordered[i].price[2]); // low
          lastGroup[4] = Math.max(lastGroup[4], ordered[i].price[3]); // high
        }
      }
    }

    return Object.freeze(groups);
  }

  get chartDataIssue(): boolean {
    return !this.loading && (this.isFetchingError || this.chartData.length === 0);
  }

  get chartOptionSeries() {
    return this.isLineChart
      ? [
          {
            type: 'line',
            encode: {
              y: 'close',
            },
            showSymbol: false,
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
            barMaxWidth: 10,
            itemStyle: {
              color: this.theme.color.status.success,
              borderColor: this.theme.color.status.success,
              color0: this.theme.color.theme.accentHover,
              borderColor0: this.theme.color.theme.accentHover,
              borderWidth: 2,
            },
          },
        ];
  }

  get chartSpec() {
    return {
      dataset: {
        source: this.chartData,
        dimensions: ['timestamp', 'open', 'close', 'low', 'high'],
      },
      grid: {
        left: this.gridLeftOffset,
        right: 0,
        bottom: 20 + AXIS_OFFSET,
        top: 20,
      },
      xAxis: {
        offset: AXIS_OFFSET,
        type: 'time',
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          formatter: (value) => {
            const date = dayjs(+value);
            const isNewDay = date.hour() === 0 && date.minute() === 0;
            const isNewMonth = date.date() === 1 && isNewDay;
            // TODO: "LT" formatted labels (hours) sometimes overlaps (AM\PM issue)
            const timeFormat = isNewMonth ? 'MMMM' : isNewDay ? 'D' : 'HH:mm';
            const formatted = this.formatDate(+value, timeFormat);

            if (isNewMonth) {
              return `{monthStyle|${formatted.charAt(0).toUpperCase() + formatted.slice(1)}}`;
            }
            if (isNewDay) {
              return `{dateStyle|${formatted}}`;
            }

            return formatted;
          },
          rich: {
            monthStyle: {
              fontSize: 10,
              fontWeight: 'bold',
            },
            dateStyle: {
              fontSize: 10,
              fontWeight: 'bold',
            },
          },
          color: this.theme.color.base.content.secondary,
          ...AXIS_LABEL_CSS,
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
              return this.formatDate(+value, 'LLL'); // locale format
            },
          },
        },
        boundaryGap: this.isLineChart ? false : [0.005, 0.005],
      },
      yAxis: {
        type: 'value',
        offset: AXIS_OFFSET,
        scale: true,
        axisLabel: {
          ...AXIS_LABEL_CSS,
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
            ...AXIS_LABEL_CSS,
            backgroundColor: this.theme.color.status.success,
            fontWeight: 400,
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
          minValueSpan: this.timeDifference * 11, // minimum 11 elements like on skeleton
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
          const [timestamp, open, close, low, high] = data;
          if (seriesType === CHART_TYPES.LINE) return formatPrice(close, this.symbol);

          if (seriesType === CHART_TYPES.CANDLE) {
            const change = calcPriceChange(new FPNumber(close), new FPNumber(open));
            const changeColor = signific(change)(
              this.theme.color.status.success,
              this.theme.color.status.error,
              this.theme.color.base.content.primary
            );

            const rows = [
              { title: 'Open', data: formatPrice(open, this.symbol) },
              { title: 'High', data: formatPrice(high, this.symbol) },
              { title: 'Low', data: formatPrice(low, this.symbol) },
              { title: 'Close', data: formatPrice(close, this.symbol) },
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
      series: this.chartOptionSeries,
    };
  }

  created(): void {
    this.forceUpdatePrices();
  }

  beforeDestroy(): void {
    this.unsubscribeFromPriceUpdates();
  }

  // ordered ty timestamp DESC
  private async fetchData(address: string) {
    const { type, count } = this.selectedFilter;
    const pageInfo = this.pageInfos[address];
    const buffer = this.samplesBuffer[address] ?? [];
    const nodes: AssetSnapshotEntity[] = [];

    let hasNextPage = pageInfo?.hasNextPage ?? true;
    let endCursor = pageInfo?.endCursor ?? '';

    if (buffer.length >= count) {
      return {
        nodes,
        hasNextPage,
        endCursor,
      };
    }

    let fetchCount = count;

    do {
      const first = Math.min(fetchCount, 100); // how many items should be fetched by request
      const response = await SubqueryExplorerService.price.getHistoricalPriceForAsset(address, type, first, endCursor);

      if (!response) throw new Error('Chart data fetch error');

      hasNextPage = response.pageInfo.hasNextPage;
      endCursor = response.pageInfo.endCursor;
      nodes.push(...response.nodes);
      fetchCount -= response.nodes.length;
    } while (hasNextPage && fetchCount > 0);

    return { nodes, hasNextPage, endCursor };
  }

  private getUpdatedPrecision(min: number, max: number): number {
    return Math.max(getPrecision(min), getPrecision(max));
  }

  private async getHistoricalPrices(): Promise<void> {
    if (this.loading || this.isAllHistoricalPricesFetched) {
      return;
    }

    // prevent fetching if tokens pair not created
    if (this.tokensPair && !this.isAvailable) return;

    const addresses = [...this.tokensAddresses];
    const requestId = Date.now();
    const lastTimestamp = last(this.prices)?.timestamp ?? Date.now();

    this.priceUpdateRequestId = requestId;

    await this.withApi(async () => {
      try {
        const snapshots = await Promise.all(addresses.map((address) => this.fetchData(address)));

        // if no response, or tokens were changed, return
        if (!(snapshots && isEqual(addresses)(this.tokensAddresses) && isEqual(requestId)(this.priceUpdateRequestId)))
          return;

        const pageInfos: Record<string, Partial<PageInfo>> = {};
        const prices: SnapshotItem[] = [];
        const groups: SnapshotItem[][] = [];
        const timestamp =
          lastTimestamp ??
          Math.max(snapshots[0]?.nodes[0]?.timestamp ?? 0, snapshots[1]?.nodes[0]?.timestamp ?? 0) * 1000;

        snapshots.forEach(({ hasNextPage, endCursor, nodes }, index) => {
          const address = addresses[index];
          const items = nodes.map((node) => transformSnapshot(node));
          const buffer = this.samplesBuffer[address] ?? [];
          const normalized = normalizeSnapshots(buffer.concat(items), this.timeDifference, timestamp);
          groups.push(normalized);
          pageInfos[address] = { hasNextPage, endCursor };
        });

        const size = Math.min(groups[0]?.length ?? Infinity, groups[1]?.length ?? Infinity, this.selectedFilter.count);

        let { min, max } = this.limits;

        for (let i = 0; i < size; i++) {
          const a = groups[0]?.[i];
          const b = groups[1]?.[i];

          const timestamp = (a?.timestamp ?? b?.timestamp) as number;
          const price = b?.price && a?.price ? dividePrices(a.price, b.price) : a?.price ?? [0, 0, 0, 0];

          // if "open" & "close" prices are zero, we are going to time, where pool is not created
          if (price[0] === 0 && price[1] === 0) break;

          prices.push({ timestamp, price });

          min = Math.min(min, ...price);
          max = Math.max(max, ...price);
        }

        addresses.forEach((address, index) => {
          this.samplesBuffer[address] = Object.freeze(groups[index].slice(size));
        });

        this.limits = { min, max };
        this.pageInfos = pageInfos;
        this.precision = this.getUpdatedPrecision(min, max);
        this.updatePricesCollection([...this.prices, ...prices]);

        this.isFetchingError = false;
      } catch (error) {
        this.isFetchingError = true;
        console.error(error);
      }
    });
  }

  private unsubscribeFromPriceUpdates(): void {
    if (this.priceUpdateWatcher) {
      this.priceUpdateWatcher();
    }
    if (this.priceUpdateTimestampSync) {
      clearInterval(this.priceUpdateTimestampSync as number);
    }
    this.priceUpdateWatcher = null;
    this.priceUpdateTimestampSync = null;
  }

  private subscribeToPriceUpdates(): void {
    this.unsubscribeFromPriceUpdates();

    const addresses = [...this.tokensAddresses];

    this.priceUpdateWatcher = this.$watch(
      () => this.fiatPriceObject,
      (updated, prev) => {
        if (updated && (!prev || addresses.some((addr) => updated[addr] !== prev[addr]))) {
          this.handlePriceUpdates(addresses, updated);
        }
      }
    );

    this.priceUpdateTimestampSync = setInterval(() => this.handlePriceTimestampSync(addresses), SYNC_INTERVAL);
  }

  private getCurrentSnapshotTimestamp(): number {
    const now = Math.floor(Date.now() / 1000);
    const seconds = this.timeDifference / 1000;
    const index = Math.floor(now / seconds);
    const timestamp = seconds * index * 1000;

    return timestamp;
  }

  /**
   * Creates new price item snapshot
   */
  private handlePriceTimestampSync(addresses: string[]): void {
    if (!isEqual(addresses)(this.tokensAddresses)) return;

    const timestamp = this.getCurrentSnapshotTimestamp();
    const lastItem = this.prices[0];

    if (!lastItem || timestamp === lastItem.timestamp) return;

    const close = lastItem.price[1];
    const price: OCLH = [close, close, close, close];
    const item: SnapshotItem = { timestamp, price };

    this.updatePricesCollection([item, ...this.prices]);
  }

  private handlePriceUpdates(addresses: string[], fiatPriceObject: FiatPriceObject): void {
    if (!isEqual(addresses)(this.tokensAddresses)) return;

    const timestamp = this.getCurrentSnapshotTimestamp();
    const lastItem = this.prices[0];

    const [priceA, priceB] = this.tokensAddresses.map((address) =>
      FPNumber.fromCodecValue(fiatPriceObject[address] ?? 0).toNumber()
    );
    const price = Number.isFinite(priceB) ? dividePrice(priceA, priceB) : priceA;
    const min = Math.min(this.limits.min, price);
    const max = Math.max(this.limits.max, price);

    const open = lastItem?.price?.[0] ?? price;
    const low = lastItem?.price?.[2] ?? price;
    const high = lastItem?.price?.[3] ?? price;

    const isCurrentTimeframe = lastItem?.timestamp === timestamp;

    const priceData: OCLH = [isCurrentTimeframe ? open : price, price, Math.min(low, price), Math.max(high, price)];
    const item = { timestamp, price: priceData };
    const prices = [...this.prices];
    if (isCurrentTimeframe) {
      prices.shift();
    }
    prices.unshift(item);
    this.precision = this.getUpdatedPrecision(min, max);
    this.limits = { min, max };
    this.updatePricesCollection(prices);
  }

  private clearData(saveReversedState = false): void {
    this.samplesBuffer = {};
    this.pageInfos = {};
    this.prices = [];
    this.zoomStart = 0;
    this.zoomEnd = 100;
    this.limits = {
      min: Infinity,
      max: 0,
    };
    this.precision = 2;

    if (!saveReversedState) {
      this.isReversedChart = false;
    }
  }

  private updatePricesCollection(items: SnapshotItem[]): void {
    this.prices = Object.freeze(items);
  }

  changeFilter(filter: ChartFilter): void {
    this.selectedFilter = filter;
    this.forceUpdatePrices(true);
  }

  private async resetAndUpdatePrices(saveReversedState = false): Promise<void> {
    this.clearData(saveReversedState);
    await this.updatePrices();
    this.subscribeToPriceUpdates();
  }

  selectFilter(name: string): void {
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
    if (event?.wheelDelta < 0 && this.zoomStart === 0 && this.zoomEnd === 100) {
      this.updatePrices();
    }
  }

  changeZoomLevel(event: any): void {
    const data = event?.batch?.[0];
    this.zoomStart = data?.start ?? 0;
    this.zoomEnd = data?.end ?? 0;
  }

  revertChart(): void {
    this.isReversedChart = !this.isReversedChart;
    this.forceUpdatePrices(true);
  }
}
</script>

<style lang="scss">
$skeleton-label-width: 34px;
.charts {
  &-price {
    display: flex;
    margin-bottom: $inner-spacing-tiny;
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

.charts-skeleton {
  $margin-right: #{$inner-spacing-tiny};
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
    width: calc(100% - #{$skeleton-label-width-mobile} - #{$margin-right});
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
    z-index: $app-content-layer;
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

  & > *:not(:first-child) {
    margin-left: $inner-spacing-mini;
  }
}

@include large-desktop {
  .chart {
    height: 323px;
  }
}
</style>
