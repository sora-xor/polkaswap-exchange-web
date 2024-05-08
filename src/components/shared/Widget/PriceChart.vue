<template>
  <base-widget v-loading="parentLoading">
    <template #title>
      <tokens-row border :assets="tokens" size="medium" />
      <div v-if="tokenA" class="token-title">
        <span>{{ tokenA.symbol }}</span>
        <span v-if="tokenB">/{{ tokenB.symbol }}</span>
      </div>
      <s-button
        v-if="isTokensPair && !isOrderBook"
        :class="{ 's-pressed': isReversedChart }"
        :disabled="chartIsLoading"
        size="small"
        type="action"
        alternative
        icon="arrows-swap-90-24"
        @click="revertChart"
      />
    </template>

    <template #filters>
      <stats-filter :filters="filters" :value="selectedFilter" :disabled="chartIsLoading" @change="changeFilter" />
    </template>

    <template #types>
      <svg-icon-button
        v-for="{ type, icon, active } in chartTypeButtons"
        :key="type"
        :icon="icon"
        :active="active"
        :disabled="chartIsLoading"
        size="small"
        @click="selectChartType(type)"
      />
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
      />
      <price-change v-if="!isFetchingError" :value="priceChange" />
      <v-chart
        ref="chart"
        class="chart"
        :option="chartSpec"
        autoresize
        @zr:mousewheel="handleZoom"
        @datazoom="changeZoomLevel"
      />
    </chart-skeleton>
  </base-widget>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { DexId } from '@sora-substrate/util/build/dex/consts';
import { components, mixins, WALLET_CONSTS, SUBQUERY_TYPES } from '@soramitsu/soraneo-wallet-web';
import { graphic } from 'echarts';
import isEqual from 'lodash/fp/isEqual';
import last from 'lodash/fp/last';
import { Component, Mixins, Watch, Prop } from 'vue-property-decorator';

import ChartSpecMixin from '@/components/mixins/ChartSpecMixin';
import { SvgIcons } from '@/components/shared/Button/SvgIconButton/icons';
import { Components } from '@/consts';
import { SECONDS_IN_TYPE } from '@/consts/snapshots';
import { subscribeOnOrderBookUpdates } from '@/indexer/queries/orderBook';
import { fetchAssetData } from '@/indexer/queries/price/asset';
import { fetchOrderBookData } from '@/indexer/queries/price/orderBook';
import { lazyComponent } from '@/router';
import type { OCLH, SnapshotItem } from '@/types/chart';
import { Timeframes } from '@/types/filters';
import type { SnapshotFilter } from '@/types/filters';
import {
  debouncedInputHandler,
  getTextWidth,
  calcPriceChange,
  formatDecimalPlaces,
  formatAmountWithSuffix,
} from '@/utils';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { PageInfo, SnapshotTypes } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const USD_SYMBOL = 'USD';

/** "timestamp", "open", "close", "low", "high", "volume" data */
type ChartDataItem = [number, ...OCLH, number];

type LastUpdates = Record<string, SnapshotItem>;

enum CHART_TYPES {
  LINE = 'line',
  CANDLE = 'candlestick',
  BAR = 'bar',
}

const CHART_TYPE_ICONS = {
  [CHART_TYPES.LINE]: SvgIcons.LineIcon,
  [CHART_TYPES.CANDLE]: SvgIcons.CandleIcon,
};

const LINE_CHART_FILTERS: SnapshotFilter[] = [
  {
    name: Timeframes.FIVE_MINUTES,
    label: '5m',
    type: SUBQUERY_TYPES.SnapshotTypes.DEFAULT,
    count: 48, // 5 mins in 4 hours
  },
  {
    name: Timeframes.FIFTEEN_MINUTES,
    label: '15m',
    type: SUBQUERY_TYPES.SnapshotTypes.DEFAULT,
    count: 48 * 3, // 5 mins in 12 hours,
    group: 3, // 5 min in 15 min
  },
  {
    name: Timeframes.THIRTY_MINUTES,
    label: '30m',
    type: SUBQUERY_TYPES.SnapshotTypes.DEFAULT,
    count: 48 * 6, // 5 mins in 24 hours,
    group: 6, // 5 min in 30 min
  },
  {
    name: Timeframes.HOUR,
    label: '1h',
    type: SUBQUERY_TYPES.SnapshotTypes.HOUR,
    count: 48, // hours in 2 days,
  },
  {
    name: Timeframes.FOUR_HOURS,
    label: '4h',
    type: SUBQUERY_TYPES.SnapshotTypes.HOUR,
    count: 48 * 4, // hours in 4 days,
    group: 4, // 1 hour in 4 hours
  },
  {
    name: Timeframes.DAY,
    label: '1D',
    type: SUBQUERY_TYPES.SnapshotTypes.DAY,
    count: 90, // days in 1 month
  },
  {
    name: Timeframes.YEAR,
    label: '1Y',
    type: SUBQUERY_TYPES.SnapshotTypes.DAY,
    count: 365, // days in year
  },
  {
    name: Timeframes.ALL,
    label: 'ALL',
    type: SUBQUERY_TYPES.SnapshotTypes.DAY,
    count: Infinity,
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

const ZOOM_ID = 'chartZoom';

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

const formatAmount = (value: number, precision: number) => {
  return new FPNumber(value).toLocaleString(precision);
};

const formatPrice = (value: number, precision: number, symbol: string) => {
  return `${formatAmount(value, precision)} ${symbol}`;
};

const dividePrice = (priceA: number, priceB: number): number => {
  return priceB !== 0 ? priceA / priceB : 0;
};

const dividePrices = (priceA: OCLH, priceB: OCLH): OCLH => {
  return priceA.map((price, index) => dividePrice(price, priceB[index])) as OCLH;
};

const mergeSnapshots = (a: Nullable<SnapshotItem>, b: Nullable<SnapshotItem>): SnapshotItem => {
  const timestamp = (a?.timestamp ?? b?.timestamp) as number;
  const price = b?.price && a?.price ? dividePrices(a.price, b.price) : a?.price ?? [0, 0, 0, 0];
  const volume = b?.volume && a?.volume ? Math.min(b.volume, a.volume) : a?.volume ?? 0;

  return { timestamp, price, volume };
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
        volume: 0,
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
    BaseWidget: lazyComponent(Components.BaseWidget),
    SvgIconButton: lazyComponent(Components.SvgIconButton),
    TokensRow: lazyComponent(Components.TokensRow),
    PriceChange: lazyComponent(Components.PriceChange),
    StatsFilter: lazyComponent(Components.StatsFilter),
    ChartSkeleton: lazyComponent(Components.ChartSkeleton),
  },
})
export default class PriceChartWidget extends Mixins(
  ChartSpecMixin,
  mixins.LoadingMixin,
  mixins.NumberFormatterMixin,
  mixins.FormattedAmountMixin
) {
  @Prop({ default: DexId.XOR, type: Number }) readonly dexId!: DexId;
  @Prop({ default: () => null, type: Object }) readonly baseAsset!: Nullable<AccountAsset>;
  @Prop({ default: () => null, type: Object }) readonly quoteAsset!: Nullable<AccountAsset>;
  @Prop({ default: false, type: Boolean }) readonly isAvailable!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isOrderBook!: boolean;

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
  private dataset: readonly SnapshotItem[] = [];
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
  private priceUpdateSubscription: Nullable<FnWithoutArgs> = null;
  private priceUpdateTimestampSync: Nullable<NodeJS.Timer | number> = null;

  chartType: CHART_TYPES = CHART_TYPES.LINE;
  selectedFilter: SnapshotFilter = LINE_CHART_FILTERS[0];
  isReversedChart = false;

  get isLineChart(): boolean {
    return this.chartType === CHART_TYPES.LINE;
  }

  get inputTokensAddresses(): string[] {
    const filtered = [this.baseAsset, this.quoteAsset].filter((token) => !!token) as AccountAsset[];

    return filtered.map((token) => token.address);
  }

  get tokenA() {
    return this.isReversedChart ? this.quoteAsset : this.baseAsset;
  }

  get tokenB() {
    return this.isReversedChart ? this.baseAsset : this.quoteAsset;
  }

  get tokens(): AccountAsset[] {
    return [this.tokenA, this.tokenB].filter((token) => !!token) as AccountAsset[];
  }

  get tokensAddresses(): string[] {
    return this.tokens.map((token) => token.address);
  }

  get isTokensPair(): boolean {
    return this.tokensAddresses.length === 2;
  }

  get orderBookId(): Nullable<string> {
    if (!(this.baseAsset && this.quoteAsset)) return null;
    return [this.dexId, this.baseAsset.address, this.quoteAsset.address].join('-');
  }

  get entities(): string[] {
    if (this.isOrderBook) {
      return this.orderBookId ? [this.orderBookId] : [];
    }
    return this.tokensAddresses;
  }

  get chartTypeButtons(): { type: CHART_TYPES; icon: any; active: boolean }[] {
    return [CHART_TYPES.LINE, CHART_TYPES.CANDLE].map((type) => ({
      type,
      icon: CHART_TYPE_ICONS[type],
      active: this.chartType === type,
    }));
  }

  get filters(): SnapshotFilter[] {
    return LINE_CHART_FILTERS;
  }

  get chartIsLoading(): boolean {
    return this.parentLoading || this.loading;
  }

  get symbol(): string {
    return this.tokenB?.symbol ?? USD_SYMBOL;
  }

  get currentPrice(): FPNumber {
    return new FPNumber(this.dataset[0]?.price[1] ?? 0); // "close" price
  }

  get currentPriceFormatted(): string {
    return this.currentPrice.toLocaleString(this.precision);
  }

  get isAllHistoricalPricesFetched(): boolean {
    return Object.entries(this.pageInfos).some(([address, pageInfo]) => {
      return !pageInfo.hasNextPage && !this.samplesBuffer[address]?.length;
    });
  }

  get timeDifference(): number {
    return SECONDS_IN_TYPE[this.selectedFilter.type] * 1000;
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
      formatAmount(maxLabel, this.precision),
      AXIS_LABEL_CSS.fontFamily,
      AXIS_LABEL_CSS.fontSize
    );

    return AXIS_OFFSET + 2 * LABEL_PADDING + axisLabelWidth;
  }

  get chartData(): readonly ChartDataItem[] {
    const groups: ChartDataItem[] = [];
    const {
      dataset,
      selectedFilter: { group },
    } = this;
    // ordered by timestamp ASC
    const ordered = dataset.slice().reverse();

    for (let i = 0; i < ordered.length; i++) {
      if (!group || i % group === 0) {
        groups.push([ordered[i].timestamp, ...ordered[i].price, ordered[i].volume]);
      } else {
        const lastGroup = last(groups);

        if (lastGroup) {
          lastGroup[2] = ordered[i].price[1]; // close
          lastGroup[3] = Math.min(lastGroup[3], ordered[i].price[2]); // low
          lastGroup[4] = Math.max(lastGroup[4], ordered[i].price[3]); // high
          lastGroup[5] = lastGroup[5] + (ordered[i].volume ?? 0); // volume
        }
      }
    }

    return Object.freeze(groups);
  }

  get chartSpec() {
    // [TODO]: until we haven't two tokens volume
    const withVolume = this.entities.length === 1;

    const priceGrid = this.gridSpec({
      top: 20,
      left: this.gridLeftOffset,
    });

    const volumeGrid = this.gridSpec({
      height: 72,
      left: this.gridLeftOffset,
    });

    const priceXAxis = this.xAxisSpec({
      boundaryGap: this.isLineChart ? false : [0.005, 0.005],
      axisLabel: {
        show: true,
      },
      axisLine: {
        show: true,
        lineStyle: {
          color: this.theme.color.base.content.tertiary,
        },
      },
      axisPointer: {
        label: {
          show: true,
        },
      },
    });

    const volumeXAxis = this.xAxisSpec({
      gridIndex: 1,
      boundaryGap: false,
      axisLabel: {
        show: true,
      },
      axisPointer: {
        type: 'none',
      },
    });

    const priceYAxis = this.yAxisSpec({
      axisLabel: {
        formatter: (value) => {
          return formatAmount(value, this.precision);
        },
        showMaxLabel: false,
        showMinLabel: false,
      },
      axisPointer: {
        label: {
          precision: this.precision,
          formatter: ({ value }) => {
            return formatAmount(value, this.precision);
          },
        },
      },
      min: 'dataMin',
      max: 'dataMax',
    });

    const volumeYAxis = this.yAxisSpec({
      gridIndex: 1,
      splitNumber: 2,
      axisLabel: {
        formatter: (value) => {
          const val = new FPNumber(value);
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
      minValueSpan: this.timeDifference * 11, // minimum 11 elements like on skeleton
    };

    const tooltip = this.tooltipSpec({
      axisPointer: {
        type: 'cross',
      },
      formatter: (params) => {
        const { data, seriesType } = params[0];
        const [timestamp, open, close, low, high, volume] = data;
        const rows: any[] = [];

        if (seriesType === CHART_TYPES.CANDLE) {
          const change = calcPriceChange(new FPNumber(close), new FPNumber(open));
          const changeColor = signific(change)(
            this.theme.color.status.success,
            this.theme.color.status.error,
            this.theme.color.base.content.primary
          );

          rows.push(
            { title: 'Open', data: formatPrice(open, this.precision, this.symbol) },
            { title: 'High', data: formatPrice(high, this.precision, this.symbol) },
            { title: 'Low', data: formatPrice(low, this.precision, this.symbol) },
            { title: 'Close', data: formatPrice(close, this.precision, this.symbol) },
            { title: 'Change', data: formatChange(change), color: changeColor }
          );
        } else {
          rows.push({ title: 'Price', data: formatPrice(close, this.precision, this.symbol) });
        }

        if (withVolume) {
          rows.push({ title: 'Volume', data: `$${formatAmount(volume, 2)}` });
        }

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
      },
    });

    const priceSeria = this.isLineChart
      ? this.lineSeriesSpec({
          encode: { y: 'close' },
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
        })
      : this.candlestickSeriesSpec();

    const volumeSeria = {
      type: 'bar',
      barMaxWidth: 10,
      xAxisIndex: 1,
      yAxisIndex: 1,
      itemStyle: {
        color: ({ data }) => {
          const [_timestamp, open, close] = data;
          return open > close ? this.theme.color.status.error : this.theme.color.status.success;
        },
        opacity: 0.7,
      },
      encode: { y: 'volume' },
    };

    const spec = {
      animation: false,
      axisPointer: {
        link: [
          {
            xAxisIndex: 'all',
          },
        ],
      },
      color: [this.theme.color.theme.accent, this.theme.color.status.success],
      dataset: {
        source: this.chartData,
        dimensions: ['timestamp', 'open', 'close', 'low', 'high', 'volume'],
      },
      dataZoom: [dataZoom],
      grid: [priceGrid],
      xAxis: [priceXAxis],
      yAxis: [priceYAxis],
      tooltip,
      series: [priceSeria],
    };

    if (withVolume) {
      priceGrid.bottom = 120;
      priceXAxis.axisLabel.show = false;
      priceXAxis.axisPointer.label.show = false;

      spec.grid.push(volumeGrid);
      spec.xAxis.push(volumeXAxis);
      spec.yAxis.push(volumeYAxis);
      spec.series.push(volumeSeria);
    }

    return spec;
  }

  created(): void {
    this.forceUpdatePrices();
  }

  beforeDestroy(): void {
    this.unsubscribeFromPriceUpdates();
  }

  private async requestData(
    entityId: string,
    type: SnapshotTypes,
    count: number,
    hasNextPage = true,
    endCursor?: string
  ) {
    const handler = this.isOrderBook ? fetchOrderBookData : fetchAssetData;
    const nodes: SnapshotItem[] = [];

    do {
      const first = Math.min(count, 100); // how many items should be fetched by request

      const response = await handler(entityId, type, first, endCursor);

      if (!response) throw new Error('Chart data fetch error');

      hasNextPage = response.pageInfo.hasNextPage;
      endCursor = response.pageInfo.endCursor;
      nodes.push(...response.edges.map((edge) => edge.node));
      count -= response.edges.length;
    } while (hasNextPage && count > 0);

    return { nodes, hasNextPage, endCursor };
  }

  // ordered ty timestamp DESC
  private async fetchData(entityId: string) {
    const { type, count } = this.selectedFilter;

    const pageInfo = this.pageInfos[entityId];
    const hasNextPage = pageInfo?.hasNextPage ?? true;
    const endCursor = pageInfo?.endCursor ?? undefined;

    const buffer = this.samplesBuffer[entityId] ?? [];

    if (buffer.length >= count) {
      return {
        nodes: [],
        hasNextPage,
        endCursor,
      };
    }

    return await this.requestData(entityId, type, count, hasNextPage, endCursor);
  }

  private async fetchDataLastUpdates(entities: string[]): Promise<Nullable<LastUpdates>> {
    const lastUpdates: LastUpdates = {};

    await Promise.all(
      entities.map(async (entityId) => {
        try {
          const update = await this.requestData(entityId, this.selectedFilter.type, 1);
          const snapshot = update.nodes[0];

          lastUpdates[entityId] = snapshot;
        } catch {
          return null;
        }
      })
    );

    return lastUpdates;
  }

  private getUpdatedPrecision(min: number, max: number): number {
    const boundaries = [max, min, max - min].map((v) => getPrecision(v));
    return Math.max(...boundaries);
  }

  private async getHistoricalPrices(): Promise<void> {
    if (this.loading || this.isAllHistoricalPricesFetched) {
      return;
    }

    // prevent fetching if tokens pair not available
    if (this.isTokensPair && !this.isAvailable) return;

    const addresses = [...this.entities];
    const requestId = Date.now();
    const lastTimestamp = last(this.dataset)?.timestamp ?? Date.now();

    this.priceUpdateRequestId = requestId;

    await this.withApi(async () => {
      try {
        const snapshots = await Promise.all(addresses.map((address) => this.fetchData(address)));

        // if no response, or tokens were changed, return
        if (!(snapshots && isEqual(addresses)(this.entities) && isEqual(requestId)(this.priceUpdateRequestId))) return;

        const pageInfos: Record<string, Partial<PageInfo>> = {};
        const dataset: SnapshotItem[] = [];
        const groups: SnapshotItem[][] = [];
        const timestamp =
          lastTimestamp ??
          Math.max(snapshots[0]?.nodes[0]?.timestamp ?? 0, snapshots[1]?.nodes[0]?.timestamp ?? 0) * 1000;

        snapshots.forEach(({ hasNextPage, endCursor, nodes }, index) => {
          const address = addresses[index];
          const buffer = this.samplesBuffer[address] ?? [];
          const normalized = normalizeSnapshots(buffer.concat(nodes), this.timeDifference, timestamp);
          groups.push(normalized);
          pageInfos[address] = { hasNextPage, endCursor };
        });

        const size = Math.min(groups[0]?.length ?? Infinity, groups[1]?.length ?? Infinity, this.selectedFilter.count);

        let { min, max } = this.limits;

        for (let i = 0; i < size; i++) {
          const a = groups[0]?.[i];
          const b = groups[1]?.[i];

          const { timestamp, price, volume } = mergeSnapshots(a, b);
          // skip item, if one of the prices is incorrect
          if (price.some((part) => !Number.isFinite(part))) continue;
          // if "open" & "close" prices are zero, we are going to time, where pool is not created
          if (price[0] === 0 && price[1] === 0) break;

          dataset.push({ timestamp, price, volume });

          min = Math.min(min, ...price);
          max = Math.max(max, ...price);
        }

        addresses.forEach((address, index) => {
          this.samplesBuffer[address] = Object.freeze(groups[index].slice(size));
        });

        this.limits = { min, max };
        this.pageInfos = pageInfos;
        this.precision = this.getUpdatedPrecision(min, max);
        this.updateDataset([...this.dataset, ...dataset]);

        this.isFetchingError = false;
      } catch (error) {
        this.isFetchingError = true;
        console.error(error);
      }
    });
  }

  // common
  private async subscribeToPriceUpdates(): Promise<void> {
    this.unsubscribeFromPriceUpdates();

    if (!this.entities.length) return;

    const entities = [...this.entities];

    this.priceUpdateSubscription = await this.getPriceUpdatesSubscription(entities);
    this.priceUpdateTimestampSync = setInterval(() => this.handlePriceTimestampSync(entities), SYNC_INTERVAL);
  }

  // common
  private unsubscribeFromPriceUpdates(): void {
    if (this.priceUpdateSubscription) {
      this.priceUpdateSubscription();
    }
    if (this.priceUpdateTimestampSync) {
      clearInterval(this.priceUpdateTimestampSync as number);
    }
    this.priceUpdateSubscription = null;
    this.priceUpdateTimestampSync = null;
  }

  private async getPriceUpdatesSubscription(entities: string[]): Promise<Nullable<FnWithoutArgs>> {
    if (this.isOrderBook) {
      return await subscribeOnOrderBookUpdates(
        this.dexId,
        this.baseAsset!.address,
        this.quoteAsset!.address,
        () => this.fetchAndHandleUpdate(entities),
        console.error
      );
    } else {
      const interval = setInterval(() => {
        this.fetchAndHandleUpdate(entities);
      }, SYNC_INTERVAL * 5);

      return () => clearInterval(interval);
    }
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
  private handlePriceTimestampSync(entities: string[]): void {
    if (!isEqual(entities)(this.entities)) return;

    const timestamp = this.getCurrentSnapshotTimestamp();
    const lastItem = this.dataset[0];

    if (!lastItem || timestamp === lastItem.timestamp) return;

    const close = lastItem.price[1];
    const price: OCLH = [close, close, close, close];
    const volume = 0; // we don't know volume
    const item: SnapshotItem = { timestamp, price, volume };

    this.updateDataset([item, ...this.dataset]);
  }

  private async fetchAndHandleUpdate(entities: string[]): Promise<void> {
    if (!isEqual(entities)(this.entities)) return;

    const lastUpdates = await this.fetchDataLastUpdates(entities);

    if (!lastUpdates) return;

    const dataset = [...this.dataset];
    const lastItem = dataset[0];
    const [a, b] = entities.map((entityId) => lastUpdates[entityId]);
    const item = mergeSnapshots(a, b);
    // skip item, if one of the prices is incorrect
    if (item.price.some((part) => !Number.isFinite(part))) return;
    // skip item, if snapshot is outdated
    if (lastItem?.timestamp > item.timestamp) return;

    if (lastItem?.timestamp === item.timestamp) {
      dataset.shift();
    }

    dataset.unshift(item);

    const min = Math.min(this.limits.min, ...item.price);
    const max = Math.max(this.limits.max, ...item.price);

    this.precision = this.getUpdatedPrecision(min, max);
    this.limits = { min, max };
    this.updateDataset(dataset);
  }

  private clearData(saveReversedState = false): void {
    this.samplesBuffer = {};
    this.pageInfos = {};
    this.dataset = [];
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

  private updateDataset(items: SnapshotItem[]): void {
    this.dataset = Object.freeze(items);
  }

  async changeFilter(filter: SnapshotFilter): Promise<void> {
    const prevType = this.selectedFilter.type;
    const { count, type } = filter;

    this.selectedFilter = filter;

    if (prevType !== type) {
      await this.forceUpdatePrices(true);
    } else if (this.dataset.length < count) {
      await this.updatePrices();
    } else {
      await this.resetChartTypeZoom();
    }
  }

  private async resetChartTypeZoom(): Promise<void> {
    const { count, group } = this.selectedFilter;
    const items = this.chartData.length;
    const visible = count / (group ?? 1);
    const start = items > visible ? ((items - visible) * 100) / items : 0;
    const end = 100;

    await this.setChartZoomLevel(start, end);
  }

  private async resetAndUpdatePrices(saveReversedState = false): Promise<void> {
    this.clearData(saveReversedState);
    await this.updatePrices();
    await this.subscribeToPriceUpdates();
  }

  async selectChartType(type: CHART_TYPES): Promise<void> {
    this.chartType = type;

    await this.setChartZoomLevel(this.zoomStart, this.zoomEnd);
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

  private async setChartZoomLevel(start: number, end: number): Promise<void> {
    await this.$nextTick();

    const chart = this.$refs.chart as any;

    chart.dispatchAction({
      type: 'dataZoom',
      batch: [
        {
          dataZoomId: ZOOM_ID,
          start,
          end,
        },
      ],
    });
  }

  revertChart(): void {
    this.isReversedChart = !this.isReversedChart;
    this.forceUpdatePrices(true);
  }
}
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
