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

        <div class="timeframes">
          <s-tabs type="rounded" :value="selectedFilter.name" @click="selectFilter">
            <s-tab v-for="filter in filters" :key="filter.name" :name="filter.name" :label="filter.label" />
          </s-tabs>
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
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';
import VChart from 'vue-echarts';
import {
  components,
  mixins,
  SubqueryExplorerService,
  WALLET_CONSTS,
  SUBQUERY_TYPES,
} from '@soramitsu/soraneo-wallet-web';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';

import { use } from 'echarts/core';
import { graphic } from 'echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, CandlestickChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, DataZoomComponent } from 'echarts/components';

import { getter } from '@/store/decorators';
import { debouncedInputHandler } from '@/utils';
import { AssetSnapshot } from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';

use([
  CanvasRenderer,
  LineChart,
  CandlestickChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
]);

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

type ChartFilter = {
  name: TIMEFRAME_TYPES;
  label: string;
  type: SUBQUERY_TYPES.AssetSnapshotTypes;
  count: number;
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
const CANDLE_CHART_FILTERS = [];

@Component({
  components: {
    VChart,
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class Charts extends Mixins(
  mixins.LoadingMixin,
  TranslationMixin,
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

  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;

  // ordered by timestamp DESC
  prices: Array<{ timestamp: number; price: number }> = [];
  pageInfos: any = [];
  zoomStart = 0; // percentage of zoom start position

  updatePrices = debouncedInputHandler(this.getHistoricalPrices, 250);

  selectedFilter: ChartFilter = LINE_CHART_FILTERS[0];

  get filters() {
    return LINE_CHART_FILTERS;
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
    const last = new FPNumber(this.prices[0]?.price ?? 0);
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
    switch (this.selectedFilter.name) {
      case TIMEFRAME_TYPES.DAY:
        return 'DD MMM';
      default:
        return 'HH:mm';
    }
  }

  // ordered by timestamp ASC
  get chartData(): Array<{ timestamp: number; price: number }> {
    return [...this.prices].reverse();
  }

  get chartSpec(): any {
    return {
      xAxis: {
        type: 'category',
        data: this.chartData.map((item) => item.timestamp),
        axisLine: {
          lineStyle: {
            color: '#A19A9D',
          },
        },
        axisLabel: {
          formatter: (value: string) => {
            return dayjs(+value).format(this.timeFormat);
          },
        },
        axisPointer: {
          lineStyle: {
            color: '#34AD87',
          },
          label: {
            backgroundColor: '#34AD87',
            color: '#fff',
            formatter: ({ value }) => {
              return this.formatDate(+value); // locale format
            },
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: '#A19A9D',
          },
        },
        axisPointer: {
          lineStyle: {
            color: '#34AD87',
          },
          label: {
            backgroundColor: '#34AD87',
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
      color: ['#F8087B'],
      tooltip: {
        show: true,
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        label: {
          formatter: (timestamp: string) => {
            return dayjs(+timestamp).format(this.timeFormat);
          },
        },
        valueFormatter: (value) => {
          return `${value.toFixed(4)} ${this.symbol}`;
        },
      },
      series: [
        {
          type: 'line',
          data: this.chartData.map((item) => item.price),
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
      ],
    };
  }

  created() {
    this.updatePrices();
  }

  // ordered ty timestamp DESC
  async fetchData(address: string, filter: ChartFilter, pageInfo?: { hasNextPage: boolean; endCursor: string }) {
    if (pageInfo && !pageInfo.hasNextPage) return;

    const { type, count } = filter; // how many items should be fetched by request
    const nodes: AssetSnapshot[] = [];

    let hasNextPage = pageInfo?.hasNextPage ?? true;
    let endCursor = pageInfo?.endCursor ?? '';
    let fetchCount = count;

    do {
      const first = Math.min(fetchCount, 100);
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
            collection.nodes.map((item) => ({
              timestamp: +item.timestamp * 1000,
              price: +item.priceUSD.open,
            }))
          );

          const size = Math.max(groups[0]?.length ?? 0, groups[1]?.length ?? 0);

          for (let i = 0; i < size; i++) {
            const a = groups[0]?.[i];
            const b = groups[1]?.[i];

            const timestamp = (a?.timestamp ?? b?.timestamp) as number;
            const price = (b?.price && a?.price ? a.price / b.price : a?.price ?? 0) as number;

            this.prices.push({
              timestamp,
              price,
            });
          }
        } catch (error) {
          console.error(error);
        }
      });
    });
  }

  clearData(): void {
    this.prices = [];
    this.pageInfos = [];
    this.zoomStart = 0;
  }

  selectFilter({ name }): void {
    const filter = this.filters.find((item) => item.name === name);

    if (!filter) return;

    this.selectedFilter = filter;
    this.clearData();
    this.updatePrices();
  }

  handleZoom(event) {
    event.stop();
    if (event.wheelDelta === -1 && this.zoomStart === 0) {
      this.updatePrices();
    }
  }

  changeZoomLevel(event) {
    this.zoomStart = event.batch[0]?.start ?? 0;
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

.timeframes {
  .el-tabs__header {
    margin-bottom: 0;
  }

  .s-tabs.s-rounded .el-tabs__nav-wrap .el-tabs__item {
    padding: 0 10px;
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
</style>
