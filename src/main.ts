import Vue from 'vue';

import store from './store';
import './store/decorators';
import App from './App.vue';
import router from './router';
import { initWorker } from './worker';
import { SendEvent, ReceiveEvent } from './worker/events';

import i18n from './lang';

import './plugins';
import './styles';
import { delay } from './utils';

Vue.config.productionTip = false;
Vue.config.devtools = process.env.NODE_ENV === 'development';

const worker = initWorker();

delay(10_000).then(() => {
  worker.onmessage = ({ data }) => {
    if (data.command === ReceiveEvent.GetAssets) {
      console.info('ASSETS RECEIVED!', data.res.length);
    }
  };
  worker.postMessage({ command: SendEvent.GetAssets });
  console.info('REQUEST SENT!');
});

new Vue({
  i18n,
  router,
  store: store.original,
  render: (h) => h(App),
}).$mount('#app');
