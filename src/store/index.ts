import { vuex } from '@soramitsu/soraneo-wallet-web';
import { createDirectStore } from 'direct-vuex';
import Vue from 'vue';
import Vuex from 'vuex';

import assets from './assets';
import bridge from './bridge';
import router from './router';
import settings from './settings';
import web3 from './web3';

import type { StoreOrModuleOptions } from 'direct-vuex';
import type { DirectActions, DirectGetters, DirectMutations, DirectState } from 'direct-vuex/types/direct-types';

Vue.use(Vuex);

const modules = {
  wallet: vuex.walletModules.wallet,
  router,
  web3,
  assets,
  settings,
  bridge,
};

const { store, rootGetterContext, rootActionContext } = createDirectStore({
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

const localActionContext = <O extends StoreOrModuleOptions>(context: any, moduleName: string, module: O) => {
  const { rootCommit, rootDispatch, rootGetters, rootState } = rootActionContext(context);
  return {
    state: rootState[moduleName] as DirectState<O>,
    getters: rootGetters[moduleName] as DirectGetters<O>,
    commit: rootCommit[moduleName] as DirectMutations<O>,
    dispatch: rootDispatch[moduleName] as DirectActions<O>,
    rootState,
    rootGetters,
    rootCommit,
    rootDispatch,
  };
};

const localGetterContext = <O extends StoreOrModuleOptions>(args: any, moduleName: string, module: O) => {
  const [, , rsArgs, rgArgs] = args;
  const { rootGetters, rootState } = rootGetterContext([rsArgs, rgArgs]);
  return {
    state: rootState[moduleName] as DirectState<O>,
    getters: rootGetters[moduleName] as DirectGetters<O>,
    rootState,
    rootGetters,
  };
};

export { modules, localGetterContext, localActionContext, rootGetterContext, rootActionContext };

export default store;
