<template>
  <div class="container" v-loading="parentLoading">
    <generic-page-header :title="t('charts')" class="page-header-title--tokens" />
    <v-chart class="chart" :option="option" />
    <v-chart class="chart" :option="optionCandleStick" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Getter } from 'vuex-class';
import { mixins, SubqueryExplorerService } from '@soramitsu/soraneo-wallet-web';
import { SortDirection } from '@soramitsu/soramitsu-js-ui/lib/components/Table/consts';
import type { Asset } from '@sora-substrate/util/build/assets/types';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import AssetsSearchMixin from '@/components/mixins/AssetsSearchMixin';
import SortButton from '@/components/SortButton.vue';

import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, CandlestickChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import VChart, { THEME_KEY } from 'vue-echarts';

use([CanvasRenderer, LineChart, CandlestickChart, TitleComponent, TooltipComponent, LegendComponent]);

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SortButton,
    VChart,
  },
  provide: {
    // [THEME_KEY]: 'dark',
  },
})
export default class Charts extends Mixins(mixins.LoadingMixin, TranslationMixin, AssetsSearchMixin) {
  get option(): any {
    return {
      title: {
        text: `Asset price`,
      },
      xAxis: {
        type: 'category',
        name: 'Date',
        data: this.getGraphDates(7),
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          type: 'line',
          name: 'Price',
          data: [1, 4, 2, 5, 4, 2, 2, 5, 4],
        },
      ],
    };
  }

  get optionCandleStick(): any {
    return {
      title: {
        text: `Asset price`,
      },
      xAxis: {
        data: ['2017-10-24', '2017-10-25', '2017-10-26', '2017-10-27'],
      },
      yAxis: {},
      series: [
        {
          type: 'candlestick',
          data: [
            [20, 34, 10, 38],
            [40, 35, 30, 50],
            [31, 38, 33, 44],
            [38, 15, 5, 42],
          ],
        },
      ],
    };
  }

  created() {
    this.withApi(async () => {
      // add charts subquery call here
      // const pricesData = await SubqueryExplorerService;
    });
  }

  getGraphDates(daysNumber?: number): Array<string> {
    const now = new Date();
    const days: Array<string> = [];
    for (let i = daysNumber || 7; i > 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days.push(`${date.getUTCDate()}/${date.getUTCMonth()}/${date.getUTCFullYear().toString().substr(-2, 2)}`);
    }
    return days;
  }
}
</script>

<style lang="scss" scoped>
.chart {
  margin-top: 32px;
  height: 400px;
}
</style>
