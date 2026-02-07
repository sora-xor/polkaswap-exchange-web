const walletModule = {
  namespaced: true,
  modules: {
    account: { namespaced: true },
    router: { namespaced: true },
    settings: { namespaced: true },
    subscriptions: { namespaced: true },
    transactions: { namespaced: true },
  },
};

export default walletModule;
