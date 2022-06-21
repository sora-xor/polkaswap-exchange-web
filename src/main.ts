import Vue from 'vue';

import store from './store';
import './store/decorators';
import App from './App.vue';
import router from './router';

import i18n from './lang';
import { updateDocumentTitle } from './utils';

import ECharts from 'vue-echarts';
import { use } from 'echarts/core';

import './plugins';
import './styles';

// import ECharts modules manually to reduce bundle size
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent]);

Vue.config.productionTip = false;
Vue.config.devtools = process.env.NODE_ENV === 'development';

router.beforeEach((to, from, next): void => {
  updateDocumentTitle(to);
  next();
});

Vue.component('v-chart', ECharts);

new Vue({
  i18n,
  router,
  store: store.original,
  render: (h) => h(App),
}).$mount('#app');
