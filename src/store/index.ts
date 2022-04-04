import Vue from 'vue';
import Vuex from 'vuex';
import { createDirectStore } from 'direct-vuex';
import { vuex } from '@soramitsu/soraneo-wallet-web';

import prices from './prices';
import router from './router';
import web3 from './web3';
import assets from './assets';
import settings from './settings';
import swap from './swap';
import referrals from './referrals';
import pool from './pool';
import moonpay from './moonpay';
import bridge from './bridge';
import addLiquidity from './addLiquidity';
import createPair from './createPair';
import removeLiquidity from './removeLiquidity';
import rewards from './rewards';

Vue.use(Vuex);

const Modules = [
  'prices',
  'router',
  'web3',
  'assets',
  'settings',
  'swap',
  'referrals',
  'pool',
  'moonpay',
  'bridge',
  'addLiquidity',
  'createPair',
  'removeLiquidity',
  'rewards',
];

const modules = {
  wallet: vuex.walletModules.wallet,
  prices,
  router,
  web3,
  assets,
  settings,
  swap,
  referrals,
  pool,
  moonpay,
  bridge,
  addLiquidity,
  createPair,
  removeLiquidity,
  rewards,
};

const { store, rootActionContext, rootGetterContext } = createDirectStore({
  modules,
  strict: false,
});

// To enable types in the injected store '$store'.
// export type AppStore = typeof store;
// declare module 'vuex' {
//   interface Store<S> {
//     direct: AppStore;
//   }
// }

export { modules, Modules, rootActionContext, rootGetterContext };

export default store;
