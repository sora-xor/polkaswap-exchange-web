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
          <s-tabs type="rounded" :value="selectedTimeframe.name" @click="selectTimeframe">
            <s-tab
              v-for="timeframe in timeframes"
              :key="timeframe.name"
              :name="timeframe.name"
              :label="timeframe.label"
            />
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
    <v-chart v-if="!isFetchingError" class="chart" :option="chartSpec" v-loading="loading" autoresize />
    <div v-else class="fetching-error">
      <!-- TODO: Add error screen + preview -->
      <span>Error fetching the data</span>
    </div>
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

import { graphic } from 'echarts';

import { getter } from '@/store/decorators';
import { debouncedInputHandler } from '@/utils';

enum TIMEFRAME_TYPES {
  FIVE_MINUTES = 'FIVE_MINUTES',
  HOUR = 'HOUR',
  FOUR_HOURS = 'FOUR_HOURS',
  DAY = 'DAY',
  MONTH = 'MONTH',
}

const TIMEFRAMES = [
  {
    name: TIMEFRAME_TYPES.FIVE_MINUTES,
    type: SUBQUERY_TYPES.AssetSnapshotTypes.DEFAULT,
    label: '5m',
  },
  {
    name: TIMEFRAME_TYPES.HOUR,
    type: SUBQUERY_TYPES.AssetSnapshotTypes.HOUR,
    label: '1h',
  },
  {
    name: TIMEFRAME_TYPES.FOUR_HOURS,
    type: SUBQUERY_TYPES.AssetSnapshotTypes.HOUR,
    label: '4h',
  },
  {
    name: TIMEFRAME_TYPES.DAY,
    type: SUBQUERY_TYPES.AssetSnapshotTypes.DAY,
    label: '1d',
  },
  {
    name: TIMEFRAME_TYPES.MONTH,
    type: SUBQUERY_TYPES.AssetSnapshotTypes.DAY,
    label: '1m',
  },
];

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
  private handleTokenChange(value): void {
    this.updatePrices();
  }

  isFetchingError = false;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;

  selectedTimeframe = TIMEFRAMES[0]; // 5 min

  readonly timeframes = TIMEFRAMES;

  // ordered by timestamp DESC
  prices: Array<{ timestamp: number; price: number }> = [];

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
    switch (this.selectedTimeframe.name) {
      case TIMEFRAME_TYPES.MONTH:
        return 'MMM YY';
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
            color: this.customStyles.axisLineColor,
          },
        },
        axisLabel: {
          formatter: (value: string) => {
            return dayjs(+value).format(this.timeFormat);
          },
        },
        axisPointer: {
          lineStyle: {
            color: this.customStyles.pointer.lineColor,
          },
          label: {
            backgroundColor: this.customStyles.pointer.label.bgColor,
            color: this.customStyles.pointer.label.color,
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
            color: this.customStyles.axisLineColor,
          },
        },
        axisPointer: {
          lineStyle: {
            color: this.customStyles.pointer.lineColor,
          },
          label: {
            backgroundColor: this.customStyles.pointer.label.bgColor,
          },
        },
      },
      color: this.customStyles.graphsColors,
      tooltip: {
        show: true,
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        backgroundColor: this.customStyles.tooltip.bgColor,
        borderColor: this.customStyles.tooltip.borderColor,
        extraCssText: this.customStyles.tooltip.extraCssText,
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
                // var(--s-color-theme-accent)
                color: 'rgba(248, 8, 123, 0.18)',
              },
              {
                offset: 1,
                color: 'rgba(248, 8, 123, 0.02)',
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
  async fetchData(address: string, timeframe: SUBQUERY_TYPES.AssetSnapshotTypes) {
    try {
      const response = await SubqueryExplorerService.getHistoricalPriceForAsset(address, timeframe);

      if (!response || !response.nodes) return [];

      return response.nodes;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  getHistoricalPrices(): void {
    this.withApi(async () => {
      await this.withLoading(async () => {
        this.clearData();

        try {
          const addresses = [this.tokenFrom?.address, this.tokenTo?.address].filter(Boolean);
          const collections = await Promise.all(
            addresses.map((address) => this.fetchData(address, this.selectedTimeframe.type))
          );

          const groups = collections.map((collection) =>
            collection.map((item) => ({
              timestamp: +item.timestamp * 1000,
              price: +item.priceUSD.open,
            }))
          );

          const size = Math.max(groups[0]?.length, groups[1]?.length ?? 0);

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

  formatDateItem(dateItem: number): string {
    return (dateItem.toString().length < 2 ? '0' : '') + dateItem;
  }

  clearData(): void {
    this.prices = [];
  }

  selectTimeframe({ name }): void {
    const timeframe = this.timeframes.find((item) => item.name === name);

    if (!timeframe) return;

    this.selectedTimeframe = timeframe;
    this.updatePrices();
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
