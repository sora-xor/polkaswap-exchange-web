import Vue from 'vue';
import Wallet from '@soramitsu/soraneo-wallet-web';

import store from '@/store';

Vue.use(Wallet, { store });
