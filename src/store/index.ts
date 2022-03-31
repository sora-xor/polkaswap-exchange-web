import Vue from 'vue';
import Vuex from 'vuex';
import { createDirectStore } from 'direct-vuex';
import { vuex } from '@soramitsu/soraneo-wallet-web';

import prices from './prices';
import router from './router';

Vue.use(Vuex);

const modules = {
  wallet: vuex.walletModules.wallet,
  prices,
  router,
};

const { store, rootActionContext, rootGetterContext } = createDirectStore({
  modules,
  strict: false,
});

// To enable types in the injected store '$store'.
export type AppStore = typeof store;
declare module 'vuex' {
  interface Store<S> {
    direct: AppStore;
  }
}

export { modules, rootActionContext, rootGetterContext };

export default store;
