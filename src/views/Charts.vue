<template>
  <div class="container container--charts" v-loading="parentLoading">
    <generic-page-header title="Charts" class="page-header-title--tokens" />
    <div class="charts-confirm">
      <div class="charts-confirm-settings">
        <div class="line">
          <s-switch v-model="isCandlestickType" :disabled="loading" />
          <span>Show Candlestick type</span>
        </div>
        <div v-if="isCandlestickType" class="line">
          <s-radio-group v-model="candleTimeStep">
            <s-radio v-for="step in candleTimeSteps" :key="step" :label="step" :value="step" size="medium" />
          </s-radio-group>
          <span>Candle Time Step</span>
        </div>
      </div>
    </div>
    <v-chart class="chart" :option="isCandlestickType ? optionCandleStick : chartData" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
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
  isCandlestickType = false;
  // Set XOR asset as default
  prices: Array<[string, any]> = [];
  currentAsset: Asset = KnownAssets.get(KnownSymbols.XOR);
  chartSeriesData: number[] = [];
  chartXAxisData: string[] = [];
  candleChartXAxisData: string[] = [];
  candleStickSeriesData: Array<Array<number>> = [];
  candleTimeSteps = [4, 8, 12, 24];
  candleTimeStep = this.candleTimeSteps[0];

  yAxeLimits = {
    min: 45,
    max: 70,
  };

  @Watch('candleTimeStep')
  private handleChangeTimeStep(value: number): void {
    this.updateCandleGraph();
  }

  get chartTitle(): string {
    return `Token ${this.currentAsset?.symbol} historical prices`;
  }

  get chartData(): any {
    return {
      title: {
        text: this.chartTitle,
      },
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
          this.prices = Object.entries(data).reverse();
          // Sort prices to identify min and max yAxe values
          const sortedPrices = [...this.prices];
          sortedPrices.sort((a, b) => {
            return +a[1] - +b[1];
          });

          this.yAxeLimits.min = Math.round(+this.getFPNumberFromCodec(sortedPrices[0][1])) - 1;
          this.yAxeLimits.max = Math.round(+this.getFPNumberFromCodec(sortedPrices[sortedPrices.length - 1][1])) + 1;

          for (let i = 0; i < this.prices.length; i++) {
            const date = new Date(+this.prices[i][0]);
            this.chartXAxisData.push(`
              ${date.getUTCDate()}/${this.formatDateItem(date.getUTCMonth() + 1)}
              ${this.formatDateItem(date.getUTCHours())}:${this.formatDateItem(date.getUTCMinutes())}
            `);
            this.chartSeriesData.push(this.formatPrice(this.prices[i][1]));
            this.updateCandleGraph();
          }
        }
      } catch (error) {
        console.error(error);
      }
    });
  }

  updateCandleGraph(): void {
    if (this.candleChartXAxisData.length) {
      this.candleChartXAxisData = [];
      this.candleStickSeriesData = [];
    }
    const closeIndex = this.candleTimeStep - 1;
    let i = 0;
    while (i + closeIndex - 1 < this.prices.length - 2) {
      if (i % closeIndex === 0) {
        this.candleChartXAxisData.push(this.chartXAxisData[i]);
        const mediumPrices = [...this.prices.slice(i + 1, i + closeIndex - 1)].map((item) => item[1]).sort();
        this.candleStickSeriesData.push([
          this.formatPrice(this.prices[i + closeIndex][1]),
          this.formatPrice(this.prices[i][1]),
          this.formatPrice(mediumPrices[mediumPrices.length - 1]),
          this.formatPrice(mediumPrices[0]),
        ]);
      }
      i++;
    }
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
  &-settings {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    .line {
      display: flex;
      align-items: center;
      width: 100%;
      &:first-child {
        margin-bottom: $inner-spacing-medium;
        + .line {
          height: 32px;
          margin-bottom: -40px;
          margin-top: -#{$inner-spacing-mini};
        }
      }
    }
    .el-radio {
      margin-right: $inner-spacing-mini;
      &-group {
        display: flex;
      }
    }
  }
}
</style>
