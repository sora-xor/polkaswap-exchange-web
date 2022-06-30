<template>
  <div class="container container--charts" v-loading="parentLoading">
    <div class="tokens-info-container">
      <div v-if="tokenFrom" class="token">
        <token-logo class="token-logo" :token="tokenFrom" />
        <span class="token-title">{{ tokenFrom.symbol }}</span>
      </div>
      <div class="price">
        <formatted-amount
          :value="fromFiatPriceFormatted"
          :font-weight-rate="FontWeightRate.MEDIUM"
          :font-size-rate="FontWeightRate.MEDIUM"
          :asset-symbol="'USD'"
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

  @Watch('tokenFrom')
  private handleTokenFromChange(): void {
    this.getHistoricalPrices();
  }

  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;

  prices: Array<[number, number]> = [];
  chartSeriesData: number[] = [];
  chartXAxisData: string[] = [];

  get fromFiatPrice(): FPNumber {
    return this.tokenFrom ? FPNumber.fromCodecValue(this.getAssetFiatPrice(this.tokenFrom) ?? 0) : FPNumber.ZERO;
  }

  get fromFiatPriceFormatted(): string {
    return this.fromFiatPrice.toLocaleString();
  }

  /**
   * Price change between current price and the last shapshot
   */
  get priceChange(): FPNumber {
    const last = new FPNumber(this.prices[0]?.[1] ?? 0);
    const current = this.fromFiatPrice;
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

  getHistoricalPrices(): void {
    this.withApi(async () => {
      await this.withLoading(async () => {
        this.clearData();

        try {
          const response = await SubqueryExplorerService.getHistoricalPriceForAsset(
            this.tokenFrom.address,
            SUBQUERY_TYPES.AssetSnapshotTypes.DAY
          );

          if (!response || !response.nodes) return;

          // format to tuple [timestamp, price]
          // ordered ty timestamp DESC
          this.prices = response.nodes.map((item) => [+item.timestamp * 1000, +item.priceUSD.open] as [number, number]);

          for (let i = this.prices.length - 1; i >= 0; i--) {
            const date = new Date(this.prices[i][0]);
            // TODO: Change the title due to filter (h/d/m)
            // ${date.getUTCDate()}/${this.formatDateItem(date.getUTCMonth() + 1)}
            this.chartXAxisData.push(
              `${this.formatDateItem(date.getUTCHours())}:${this.formatDateItem(date.getUTCMinutes())}`
            );
            this.chartSeriesData.push(this.prices[i][1]);
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
</style>
