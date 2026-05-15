import { LineChart, CandlestickChart, BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
  DatasetComponent,
} from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import ECharts from 'vue-echarts';

import type { App } from 'vue';

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
  DatasetComponent,
]);

export function install(app: App): void {
  app.component('VChart', ECharts);
}
