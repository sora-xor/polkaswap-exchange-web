import Vue from 'vue';

import App from './App.vue';
import i18n from './lang';
import router from './router';
import store from './store';

import './store/decorators';
import './plugins';
import './styles';

Vue.config.productionTip = false;
Vue.config.devtools = import.meta.env.DEV;

new Vue({
  i18n,
  router,
  store: store.original,
  render: (h) => h(App),
}).$mount('#app');
