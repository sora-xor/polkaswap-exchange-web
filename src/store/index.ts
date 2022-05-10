import Vue from 'vue';
import Vuex from 'vuex';
import { createDirectStore, StoreOrModuleOptions } from 'direct-vuex';
import { vuex } from '@soramitsu/soraneo-wallet-web';
import type { DirectActions, DirectGetters, DirectMutations, DirectState } from 'direct-vuex/types/direct-types';

import assets from './assets';
import settings from './settings';
import swap from './swap';
import noir from './noir';

Vue.use(Vuex);

const modules = {
  wallet: vuex.walletModules.wallet,
  assets,
  settings,
  swap,
  noir,
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

export { modules, localGetterContext, localActionContext };

export default store;
