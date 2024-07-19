import Vue from 'vue';

import App from './App.vue';
import i18n from './lang';
import router from './router';
import store from './store';

import './store/decorators';
import './plugins';
import './styles';
import './utils/localStorageInterceptor';

Vue.config.productionTip = false;
Vue.config.devtools = process.env.NODE_ENV === 'development';

new Vue({
  i18n,
  router,
  store: store.original,
  render: (h) => h(App),
}).$mount('#app');
