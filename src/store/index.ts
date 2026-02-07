import { createDirectStore } from 'direct-vuex';
import { vuex } from '@wallet/vuex';
import walletModule from '@wallet/src/store/wallet';

import addLiquidity from './addLiquidity';
import assets from './assets';
import bridge from './bridge';
import dashboard from './dashboard';
import demeterFarming from './demeterFarming';
import moonpay from './moonpay';
import orderBook from './orderBook';
import pool from './pool';
import referrals from './referrals';
import removeLiquidity from './removeLiquidity';
import rewards from './rewards';
import router from './router';
import settings from './settings';
import soraCard from './soraCard';
import staking from './staking';
import vault from './vault';
import web3 from './web3';
import { localActionContext, localGetterContext, setStoreContext } from './context';
import { setLegacyStore } from '@/utils/legacy-store';

const modules = {
  router,
  web3,
  assets,
  referrals,
  pool,
  moonpay,
  bridge,
  addLiquidity,
  removeLiquidity,
  rewards,
  staking,
  demeterFarming,
  soraCard,
  orderBook,
  dashboard,
  vault,
};

const { store, rootGetterContext, rootActionContext } = createDirectStore({
  modules,
  strict: false,
});

// Register wallet module after the store instance exists to avoid circular init issues.
store.original.registerModule('wallet', walletModule as any);
store.original.registerModule('settings', settings as any);

setStoreContext(rootActionContext, rootGetterContext);
setLegacyStore(store);

if (typeof globalThis !== 'undefined') {
  (globalThis as Record<string, unknown>).__PS_APP_STORE__ = store;
}

export type AppStore = typeof store;
declare module 'vuex' {
  interface Store<S> {
    direct: AppStore;
  }
}

export { modules, localGetterContext, localActionContext, rootGetterContext, rootActionContext };

export default store;
