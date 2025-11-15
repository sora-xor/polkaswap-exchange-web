import { createDirectStore } from 'direct-vuex';
import Vuex from 'vuex';

import wallet from './wallet';
import { setWalletStore } from './instance';

import type { Store } from 'vuex';

const modules = {
  wallet,
};

const { store, rootActionContext, rootGetterContext } = createDirectStore({
  modules,
  strict: false,
});

setWalletStore(store as WalletStore);

export type WalletStore = typeof store.original;

export { modules, rootActionContext, rootGetterContext };

export default store;
