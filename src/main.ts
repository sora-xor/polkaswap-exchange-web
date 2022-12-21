import Vue from 'vue';

import store from './store';
import './store/decorators';
import App from './App.vue';
import router from './router';

import i18n from './lang';

import './plugins';
import './styles';

Vue.config.productionTip = false;
Vue.config.devtools = process.env.NODE_ENV === 'development';

new Vue({
  i18n,
  router,
  store: store.original,
  render: (h) => h(App),
}).$mount('#app');
