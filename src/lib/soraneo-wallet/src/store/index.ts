import { createAppStoreBridge } from '@/store/app-store-bridge';

import wallet from './wallet';
import { setWalletStore } from './instance';

const modules = {
  wallet,
};

const { store, rootActionContext, rootGetterContext } = createAppStoreBridge({
  modules,
  strict: false,
});

setWalletStore(store as WalletStore);

export type WalletStore = typeof store.original;

export { modules, rootActionContext, rootGetterContext };

export default store;
