import { LineChart, CandlestickChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, DataZoomComponent, LegendComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import Vue from 'vue';
import ECharts from 'vue-echarts';

// import ECharts modules manually to reduce bundle size

use([
  CanvasRenderer,
  LineChart,
  CandlestickChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
]);

Vue.component('VChart', ECharts);
