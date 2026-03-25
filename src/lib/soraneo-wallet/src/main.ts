// Local development bootstrap
import { createApp } from 'vue';
import pinia from '@/plugins/pinia';

import env from '../public/env.json';

import { connection } from './api';
import App from './App.vue';
import i18n from './lang';
import installWalletPlugins from './plugins';

import './styles';

connection.endpoint = env.BLOCKCHAIN_URL;

const app = createApp(App);

app.use(pinia);
installWalletPlugins(app);

app.use(i18n);

app.mount('#app');
