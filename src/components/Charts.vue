<template>
  <div class="container container--charts" v-loading="parentLoading">
    <div class="tokens-info-container">
      <div class="header">
        <div class="selected-tokens">
          <div class="token-logos">
            <token-logo v-if="tokenFrom" class="token-logo" :token="tokenFrom" />
            <token-logo v-if="tokenTo" class="token-logo" :token="tokenTo" />
          </div>
          <div class="token-title">
            <span>{{ tokenFrom.symbol }}</span>
            <span v-if="tokenTo">/{{ tokenTo.symbol }}</span>
          </div>
        </div>

        <div class="timeframes">
          <s-tabs type="rounded" :value="selectedTimeframe" @click="selectTimeframe">
            <s-tab
              v-for="timeframe in timeframes"
              :key="timeframe.name"
              :name="timeframe.name"
              :label="timeframe.content"
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
      <div class="price-change">
        <s-icon class="price-change-arrow" :name="priceChangeArrow" size="14px" />{{ priceChangeFormatted }}%
      </div>
    </div>
    <v-chart class="chart" :option="chartData" v-loading="loading" />
  </div>
</template>

<script lang="ts">
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
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, CandlestickChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { getter } from '@/store/decorators';

use([CanvasRenderer, LineChart, CandlestickChart, TitleComponent, TooltipComponent, LegendComponent]);

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
  private handleTokenFromChange(): void {
    this.getHistoricalPrices();
  }

  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;

  selectedTimeframe = SUBQUERY_TYPES.AssetSnapshotTypes.DEFAULT; // 5 min

  readonly timeframes = [
    {
      name: SUBQUERY_TYPES.AssetSnapshotTypes.DEFAULT,
      content: '5m',
    },
    {
      name: SUBQUERY_TYPES.AssetSnapshotTypes.HOUR,
      content: '1h',
    },
    {
      name: SUBQUERY_TYPES.AssetSnapshotTypes.DAY,
      content: '1d',
    },
  ];

  prices: Array<[number, number]> = [];

  chartSeriesData: number[] = [];
  chartXAxisData: string[] = [];

  get symbol(): string {
    return this.tokenTo?.symbol ?? this.tokenFrom.symbol ?? '';
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
    const last = new FPNumber(this.prices[0]?.[1] ?? 0);
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

  get chartData(): any {
    return {
      xAxis: {
        type: 'category',
        data: this.chartXAxisData,
        axisLine: {
          lineStyle: {
            color: '#A19A9D',
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
      },
      color: ['#F8087B'],
      tooltip: {
        show: true,
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
        valueFormatter: (value) => {
          const strValue = value.toString();
          return `$${strValue.substring(0, strValue.indexOf('.') + 3)}`;
        },
      },
      series: [
        {
          type: 'line',
          data: this.chartSeriesData,
        },
      ],
    };
  }

  created() {
    this.getHistoricalPrices();
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
            addresses.map((address) => this.fetchData(address, this.selectedTimeframe))
          );

          const groups = collections.map((collection) =>
            collection.map((item) => ({
              timestamp: +item.timestamp * 1000,
              price: +item.priceUSD.open,
            }))
          );

          const size = Math.max(groups[0].length, groups[1]?.length ?? 0);

          for (let i = size - 1; i >= 0; i--) {
            const a = groups[0]?.[i];
            const b = groups[1]?.[i];

            const date = new Date((a?.timestamp ?? b?.timestamp) * 1000);
            const price = b?.price && a?.price ? a.price / b.price : a?.price ?? 0;

            // TODO: Change the title due to filter (h/d/m)
            // ${date.getUTCDate()}/${this.formatDateItem(date.getUTCMonth() + 1)}
            this.chartXAxisData.push(
              `${this.formatDateItem(date.getUTCHours())}:${this.formatDateItem(date.getUTCMinutes())}`
            );
            this.chartSeriesData.push(price);
          }
        } catch (error) {
          console.error(error);
        }
      });
    });
  }

  formatDateItem(dateItem: number): string {
    return (dateItem.toString().length < 2 ? '0' : '') + dateItem;
  }

  clearData(): void {
    this.chartXAxisData = [];
    this.chartSeriesData = [];
    this.prices = [];
  }

  selectTimeframe({ name }): void {
    this.selectedTimeframe = name;
    this.getHistoricalPrices();
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
