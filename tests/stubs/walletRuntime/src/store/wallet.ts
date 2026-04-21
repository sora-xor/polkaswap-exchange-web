import { WalletModule, WalletModules } from './registry';

const walletRuntimeStore = {
  namespaced: true,
  modules: {
    account: { namespaced: true },
    router: { namespaced: true },
    settings: { namespaced: true },
    subscriptions: { namespaced: true },
    transactions: { namespaced: true },
  },
};

export default walletRuntimeStore;
export { WalletModule, WalletModules };
