import Vue from 'vue';
import ECharts from 'vue-echarts';
import { use } from 'echarts/core';

// import ECharts modules manually to reduce bundle size
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, CandlestickChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, DataZoomComponent } from 'echarts/components';

use([CanvasRenderer, LineChart, CandlestickChart, BarChart, GridComponent, TooltipComponent, DataZoomComponent]);

Vue.component('v-chart', ECharts);
