import { createAppStoreBridge } from '@/store/app-store-bridge';
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
import staking from './staking';
import vault from './vault';
import web3 from './web3';
import { localActionContext, localGetterContext, setStoreContext } from './context';
import { setAppStore } from '@/utils/app-store';

const modules = {
  router,
  web3,
  assets,
  settings,
  wallet: walletModule,
  referrals,
  pool,
  moonpay,
  bridge,
  addLiquidity,
  removeLiquidity,
  rewards,
  staking,
  demeterFarming,
  orderBook,
  dashboard,
  vault,
};

const { store, rootGetterContext, rootActionContext } = createAppStoreBridge({
  modules,
  strict: false,
});

setStoreContext(rootActionContext, rootGetterContext);
setAppStore(store);

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
