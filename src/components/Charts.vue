<template>
  <div class="container container--charts" v-loading="parentLoading">
    <div class="tokens-info-container">
      <div class="token">
        <token-logo class="token-logo" :token="tokenFrom" />
        {{ tokenFrom.symbol }}
      </div>
    </div>
    <v-chart class="chart" :option="chartData" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import VChart from 'vue-echarts';
import { components, mixins, SubqueryExplorerService } from '@soramitsu/soraneo-wallet-web';
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
  },
})
export default class Charts extends Mixins(mixins.LoadingMixin, TranslationMixin, mixins.NumberFormatterMixin) {
  @getter.swap.tokenFrom tokenFrom!: AccountAsset;

  prices: Array<[string, any]> = [];
  chartSeriesData: number[] = [];
  chartXAxisData: string[] = [];

  yAxeLimits = {
    min: 0,
    max: 70,
  };

  get chartData(): any {
    // TODO: Change this data to real one
    return {
      xAxis: {
        type: 'category',
        name: 'Date',
        data: this.chartXAxisData,
      },
      yAxis: {
        type: 'value',
        min: this.yAxeLimits.min,
        max: this.yAxeLimits.max,
      },
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
          this.prices = Object.entries(data).reverse();
          // Sort prices to identify min and max yAxe values
          const sortedPrices = [...this.prices];
          sortedPrices.sort((a, b) => {
            return +a[1] - +b[1];
          });

          this.yAxeLimits.min = Math.round(+this.getFPNumberFromCodec(sortedPrices[0][1]));
          this.yAxeLimits.max = Math.round(+this.getFPNumberFromCodec(sortedPrices[sortedPrices.length - 1][1]));

          if (this.chartXAxisData.length) {
            this.chartXAxisData = [];
            this.chartSeriesData = [];
          }
          for (let i = 0; i < this.prices.length; i++) {
            const date = new Date(+this.prices[i][0]);
            this.chartXAxisData.push(`
    ${date.getUTCDate()}/${this.formatDateItem(date.getUTCMonth() + 1)}
    ${this.formatDateItem(date.getUTCHours())}:${this.formatDateItem(date.getUTCMinutes())}
  `);
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
    align-items: center;
    font-weight: 800;
  }
}
.token {
  display: flex;
  align-items: center;
  white-space: nowrap;
  &-logo {
    display: block;
    margin-right: $inner-spacing-medium;
    flex-shrink: 0;
  }
}
</style>
