import Vue from 'vue';
import Vuex from 'vuex';
import { createDirectStore, StoreOrModuleOptions } from 'direct-vuex';
import { vuex } from '@soramitsu/soraneo-wallet-web';
import type { DirectActions, DirectGetters, DirectMutations, DirectState } from 'direct-vuex/types/direct-types';

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
import removeLiquidity from './removeLiquidity';
import rewards from './rewards';
import demeterFarming from './demeterFarming';
import soraCard from './soraCard';

Vue.use(Vuex);

const modules = {
  wallet: vuex.walletModules.wallet,
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
  removeLiquidity,
  rewards,
  demeterFarming,
  soraCard,
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
