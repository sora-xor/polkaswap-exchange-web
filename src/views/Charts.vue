<template>
  <div class="container container--charts" v-loading="parentLoading">
    <generic-page-header :title="t('charts.title')" class="page-header-title--tokens" />
    <div class="charts-confirm">
      <s-switch v-model="isCandlestickType" :disabled="loading" />
      <span>{{ t('charts.candlestick') }}</span>
    </div>
    <v-chart class="chart" :option="isCandlestickType ? optionCandleStick : chartData" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins, SubqueryExplorerService } from '@soramitsu/soraneo-wallet-web';
import { KnownAssets, KnownSymbols } from '@sora-substrate/util/build/assets/consts';
import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { CodecString } from '@sora-substrate/util';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import SortButton from '@/components/SortButton.vue';

import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, CandlestickChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';

use([CanvasRenderer, LineChart, CandlestickChart, TitleComponent, TooltipComponent, LegendComponent]);

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SortButton,
    VChart,
  },
})
export default class Charts extends Mixins(mixins.LoadingMixin, TranslationMixin, mixins.NumberFormatterMixin) {
  isCandlestickType = true;
  // Set XOR asset as default
  currentAsset: Asset = KnownAssets.get(KnownSymbols.XOR);
  chartSeriesData: number[] = [];
  chartXAxisData: string[] = [];
  candleChartXAxisData: string[] = [];
  candleStickSeriesData: Array<Array<number>> = [];
  candleTimeStep = 4;

  yAxeLimits = {
    min: 45,
    max: 70,
  };

  get chartTitle(): string {
    return this.t('charts.chartTitle', { assetSymbol: this.currentAsset?.symbol });
  }

  get chartData(): any {
    return {
      title: {
        text: this.chartTitle,
      },
      xAxis: {
        type: 'category',
        name: this.t('charts.date'),
        data: this.chartXAxisData,
      },
      yAxis: {
        type: 'value',
        min: this.yAxeLimits.min,
        max: this.yAxeLimits.max,
      },
      series: [
        {
          type: 'line',
          data: this.chartSeriesData,
        },
      ],
    };
  }

  get optionCandleStick(): any {
    return {
      title: {
        text: this.chartTitle,
      },
      xAxis: {
        data: this.candleChartXAxisData,
      },
      yAxis: {
        min: this.yAxeLimits.min,
        max: this.yAxeLimits.max,
      },
      series: [
        {
          type: 'candlestick',
          data: this.candleStickSeriesData,
        },
      ],
    };
  }

  created() {
    this.withApi(async () => {
      try {
        const data = await SubqueryExplorerService.getHistoricalPriceForAsset(this.currentAsset.address, 100);
        if (data) {
          const prices = Object.entries(data).reverse();

          // Sort prices to identify min and max yAxe values
          const sortedPrices = [...prices];
          sortedPrices.sort((a, b) => {
            return +a[1] - +b[1];
          });

          this.yAxeLimits.min = Math.round(+this.getFPNumberFromCodec(sortedPrices[0][1])) - 1;
          this.yAxeLimits.max = Math.round(+this.getFPNumberFromCodec(sortedPrices[sortedPrices.length - 1][1])) + 1;

          const closeIndex = this.candleTimeStep - 1;
          for (let i = 0; i < prices.length; i++) {
            const date = new Date(+prices[i][0]);
            this.chartXAxisData.push(`
              ${date.getUTCDate()}/${this.formatDateItem(date.getUTCMonth() + 1)}
              ${this.formatDateItem(date.getUTCHours())}:${this.formatDateItem(date.getUTCMinutes())}
            `);
            this.chartSeriesData.push(this.formatPrice(prices[i][1]));

            if ((i === 0 || i % closeIndex === 0) && i + closeIndex - 1 < prices.length - 2) {
              this.candleChartXAxisData.push(this.chartXAxisData[i]);
              const mediumPrices = [...prices.slice(i + 1, i + closeIndex - 1)].map((item) => item[1]).sort();
              this.candleStickSeriesData.push([
                this.formatPrice(prices[i + closeIndex][1]),
                this.formatPrice(prices[i][1]),
                this.formatPrice(mediumPrices[mediumPrices.length - 1]),
                this.formatPrice(mediumPrices[0]),
              ]);
            }
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
  margin-top: 32px;
  height: 400px;
}
.charts-confirm {
  display: flex;
  align-items: center;
  .s-switch {
    margin-right: $inner-spacing-mini;
  }
}
</style>
