import Wallet from '@soramitsu/soraneo-wallet-web';
import Vue from 'vue';

import store from '@/store';

import '@soramitsu/soraneo-wallet-web/lib/soraneo-wallet-web.css';

Vue.use(Wallet, { store });
