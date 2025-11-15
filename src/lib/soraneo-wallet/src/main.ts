// Local development bootstrap
import { createApp } from 'vue';

import env from '../public/env.json';

import { connection } from './api';
import App from './App.vue';
import i18n from './lang';
import installWalletPlugins from './plugins';
import store from './store';

import './store/decorators';
import './styles';

connection.endpoint = env.BLOCKCHAIN_URL;

const app = createApp(App);

installWalletPlugins(app);

app.use(store.original);
app.use(i18n);

app.mount('#app');
