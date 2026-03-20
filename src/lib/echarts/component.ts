import { LineChart, CandlestickChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, DataZoomComponent, LegendComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import ECharts from 'vue-echarts';

// Register only the chart modules used by the app's local chart widgets.
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

export default ECharts;
