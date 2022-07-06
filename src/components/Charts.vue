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
      <div v-if="!isFetchingError" :class="priceChangeClasses">
        <s-icon class="price-change-arrow" :name="priceChangeArrow" size="14px" />{{ priceChangeFormatted }}%
      </div>
    </div>
    <v-chart
      v-if="!isFetchingError"
      class="chart"
      :option="chartSpec"
      v-loading="loading"
      autoresize
      @zr:mousewheel="handleZoom"
      @datazoom="changeZoomLevel"
    />
    <div v-else class="fetching-error">
      <!-- TODO: Add error screen + preview -->
      <span>Error fetching the data</span>
    </div>
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

import { getter } from '@/store/decorators';
import { debouncedInputHandler, getCssVariableValue } from '@/utils';
import { AssetSnapshot } from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';

import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

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
    name: TIMEFRAME_TYPES.HOUR,
    label: '1h',
    type: SUBQUERY_TYPES.AssetSnapshotTypes.HOUR,
    count: 24, // hours in day
  },
  {
    name: TIMEFRAME_TYPES.DAY,
    label: '1D',
    type: SUBQUERY_TYPES.AssetSnapshotTypes.DAY,
    count: 14, // days in 2 weeks
  },
];

@Component({
  components: {
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
  @getter.libraryTheme libraryTheme!: Theme;
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
  prices: Array<{ timestamp: number; price: number }> = [];
  pageInfos: any = [];
  zoomStart = 0; // percentage of zoom start position

  updatePrices = debouncedInputHandler(this.getHistoricalPrices, 250);
  customStyles = {
    axisLineColor: '#A19A9D', // var(--s-color-base-content-secondary)
    pointer: {
      lineColor: '#34AD87', // var(--s-color-status-success)
      label: {
        bgColor: '#34AD87', // var(--s-color-status-success)
        color: '#FFF', // var(--s-color-base-on-accent)
      },
    },
    graphsColors: ['#F8087B', '#34AD87'], // var(--s-color-theme-accent), var(--s-color-status-success)
    tooltip: {
      bgColor: '#F7F3F4', // var(--s-color-utility-body)
      borderColor: '#EDE4E7', // var(--s-color-base-border-secondary)
      extraCssText: `box-shadow:
        -10px -10px 30px rgba(255, 255, 255, 0.9), 20px 20px 60px rgba(0, 0, 0, 0.1), inset 1px 1px 10px #FFFFFF`,
    },
  };

  chartType: CHART_TYPES = CHART_TYPES.LINE;
  selectedFilter: ChartFilter = LINE_CHART_FILTERS[0];

  get isLineChart(): boolean {
    return this.chartType === CHART_TYPES.LINE;
  }

  get filters() {
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
    switch (this.selectedFilter.type) {
      case SUBQUERY_TYPES.AssetSnapshotTypes.DAY:
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
    return this.isLineChart ? this.lineChartSpec : this.candleChartSpec;
  }

  get lineChartSpec(): any {
    return (
      this.libraryTheme && {
        grid: {
          left: 40,
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
          },
          axisPointer: {
            lineStyle: {
              color: getCssVariableValue('--s-color-status-success'),
            },
            label: {
              backgroundColor: getCssVariableValue('--s-color-status-success'),
              color: getCssVariableValue('--s-color-base-on-accent'),
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
              color: getCssVariableValue('--s-color-base-content-secondary'),
            },
          },
          axisPointer: {
            lineStyle: {
              color: getCssVariableValue('--s-color-status-success'),
            },
            label: {
              backgroundColor: getCssVariableValue('--s-color-status-success'),
              color: getCssVariableValue('--s-color-base-on-accent'),
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
        color: [getCssVariableValue('--s-color-theme-accent'), getCssVariableValue('--s-color-status-success')],
        tooltip: {
          show: true,
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
          },
          backgroundColor: getCssVariableValue('--s-color-utility-body'),
          borderColor: getCssVariableValue('--s-color-base-border-secondary'),
          extraCssText: `box-shadow: ${getCssVariableValue('--s-shadow-dialog')}`,
          label: {
            formatter: (timestamp: string) => {
              return dayjs(+timestamp).format(this.timeFormat);
            },
          },
          textStyle: {
            color: getCssVariableValue('--s-color-base-content-primary'),
          },
          valueFormatter: (value) => {
            return `${value.toFixed(4)} ${this.symbol}`;
          },
        },
        series: [
          {
            type: 'line',
            showSymbol: false,
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
      }
    );
  }

  // TODO: add spec
  get candleChartSpec(): any {
    return {};
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
          this.isFetchingError = true;
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

  handleZoom(event: any): void {
    event?.stop?.();
    if (event?.wheelDelta === -1 && this.zoomStart === 0) {
      this.updatePrices();
    }
  }

  changeZoomLevel(event: any): void {
    this.zoomStart = event?.batch?.[0]?.start ?? 0;
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
