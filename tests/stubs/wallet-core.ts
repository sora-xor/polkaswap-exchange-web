export async function loadWalletCore() {
  return {
    api: {
      swap: {
        isALT: false,
      },
      bridgeProxy: {
        eth: {},
      },
      setStorage: () => undefined,
      shouldPairBeLocked: false,
    },
    connection: {},
    WALLET_CONSTS: {
      ETH_BRIDGE_STATES: {
        INITIAL: 'INITIAL',
      },
      RouteNames: {
        Wallet: 'Wallet',
        WalletConnection: 'WalletConnection',
      },
      TranslationConsts: {},
      SoraNetwork: {
        Main: 'main',
        Test: 'test',
      },
    },
    WALLET_TYPES: {},
  };
}

export default {
  loadWalletCore,
};
