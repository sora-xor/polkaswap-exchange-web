import { createPinia } from 'pinia';
import { createApp } from 'vue'; // eslint-disable-line import/named

import App from './App.vue';
import i18n from './lang';
import installPlugins from './plugins';
import router from './router';
import store from './store';

import './store/decorators';
import './styles';

const app = createApp(App);

installPlugins(app);

const pinia = createPinia();

app.use(store.original);
app.use(pinia);
app.use(router);
app.use(i18n);

app.mount('#app');
