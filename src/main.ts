import Vue from 'vue';

import store from './store';
import './store/decorators';
import App from './App.vue';
import router from './router';

import i18n from './lang';

import './plugins';
import './styles';

import { init, BrowserTracing, vueRouterInstrumentation } from '@sentry/vue';

Vue.config.productionTip = false;
Vue.config.devtools = process.env.NODE_ENV === 'development';

init({
  Vue,
  dsn: 'https://562a0a5f5f8945ce99dc59322bca7e5e@o4504655239512064.ingest.sentry.io/4504959049400320',
  integrations: [
    new BrowserTracing({
      routingInstrumentation: vueRouterInstrumentation(router),
      // As the documentation mention:
      // If your frontend is making requests to a different domain, you'll need to add it there to propagate
      // the sentry-trace and baggage headers to the backend services, which is required to link transactions
      // together as part of a single trace.
      tracingOrigins: ['localhost', /^\//], // --> deprecated prop
    }),
  ],
  tracesSampleRate: 1.0, // tracesSampleRate == 1.0 is to capture 100%
  environment: 'development', // depends on env
  logErrors: true, // depends on env
});

new Vue({
  i18n,
  router,
  store: store.original,
  render: (h) => h(App),
}).$mount('#app');
