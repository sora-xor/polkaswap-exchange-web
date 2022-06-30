<template>
  <div class="container container--charts" v-loading="parentLoading">
    <div class="tokens-info-container">
      <div class="token">
        <token-logo class="token-logo" :token="tokenFrom" />
        <span class="token-title">{{ tokenFrom.symbol }}</span>
      </div>
      <div class="price">
        <formatted-amount
          :value="fromFiatAmount"
          :font-weight-rate="FontWeightRate.MEDIUM"
          :font-size-rate="FontWeightRate.MEDIUM"
          :asset-symbol="'USD'"
          symbol-as-decimal
        />
      </div>
      <div class="price-change">
        <s-icon class="price-change-arrow" :name="priceChangeArrow" size="14px" />{{ priceChange }}
      </div>
    </div>
    <v-chart class="chart" :option="chartData" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import VChart from 'vue-echarts';
import { components, mixins, SubqueryExplorerService, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { CodecString } from '@sora-substrate/util';

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

  isLoading = true;

  prices: Array<[string, any]> = [];
  chartSeriesData: number[] = [];
  chartXAxisData: string[] = [];

  yAxeLimits = {
    min: 0,
    max: 10,
  };

  get fromFiatAmount(): string {
    // TODO: Crop the value to two decimals
    if (!this.tokenFrom) return '0';
    return this.getFiatAmountByString('1', this.tokenFrom) || '0';
  }

  get priceChangeIncreased(): boolean {
    return false;
  }

  get priceChangeArrow(): string {
    return `arrows-arrow-bold-${this.priceChangeIncreased ? 'top' : 'bottom'}-24`;
  }

  get priceChange(): string {
    // TODO: Chenge to appropriate priceChange
    return '1.68%';
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
        min: this.yAxeLimits.min,
        max: this.yAxeLimits.max,
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
      try {
        const data = await SubqueryExplorerService.getHistoricalPriceForAsset(this.tokenFrom.address, 100);
        if (data) {
          this.isLoading = true;
          this.prices = Object.entries(data).reverse();
          // Sort prices to identify min and max yAxe values
          const sortedPrices = [...this.prices];
          sortedPrices.sort((a, b) => {
            return +a[1] - +b[1];
          });

          this.yAxeLimits.min = Math.round(+this.getFPNumberFromCodec(sortedPrices[0][1]));
          this.yAxeLimits.max = Math.round(+this.getFPNumberFromCodec(sortedPrices[sortedPrices.length - 1][1])) + 1;

          if (this.chartXAxisData.length) {
            this.chartXAxisData = [];
            this.chartSeriesData = [];
          }

          for (let i = 0; i < this.prices.length; i++) {
            const date = new Date(+this.prices[i][0]);
            // TODO: Change the title due to filter (h/d/m)
            // ${date.getUTCDate()}/${this.formatDateItem(date.getUTCMonth() + 1)}
            this.chartXAxisData.push(
              `${this.formatDateItem(date.getUTCHours())}:${this.formatDateItem(date.getUTCMinutes())}`
            );
            this.chartSeriesData.push(this.formatPrice(this.prices[i][1]));
          }
        }
      } catch (error) {
        console.error(error);
      }
    });
  }

  formatPrice(price: any): number {
    return +this.getFPNumberFromCodec((price as CodecString).toString());
  }

  formatDateItem(dateItem: number): string {
    return (dateItem.toString().length < 2 ? '0' : '') + dateItem;
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
