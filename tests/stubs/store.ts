const noop = () => undefined;

export const localActionContext = () => ({
  state: {},
  getters: {},
  commit: {},
  dispatch: {
    web3: {
      disconnectExternalNetwork: noop,
      resetEvmProviderConnection: noop,
      resetSubAccount: noop,
      changeEvmNetworkProvided: noop,
      selectEvmProvider: noop,
    },
    bridge: {},
  },
  rootState: {},
  rootGetters: {},
  rootCommit: {},
  rootDispatch: {},
});

export const localGetterContext = () => ({
  state: {},
  getters: {},
  rootState: {},
  rootGetters: {},
});

const store = {
  state: {
    wallet: {
      settings: {
        apiKeys: {
          moonpay: '',
        },
        soraNetwork: 'test',
        shouldBalanceBeHidden: false,
        isWalletLoaded: true,
        currencies: [
          { key: 'usd', name: 'US Dollar', symbol: '$', disabled: false },
          { key: 'eur', name: 'Euro', symbol: '€', disabled: false },
        ],
        currency: 'usd',
        networkFees: {},
        selectLanguageDialogVisibility: false,
        selectCurrencyDialogVisibility: false,
      },
      account: {
        address: '',
        fiatPriceObject: {},
        isLoggedIn: false,
        accountAssetsAddressTable: {},
      },
      router: {
        currentRoute: '',
      },
    },
    settings: {
      isWalletLoaded: true,
    },
    orderBook: {
      deals: [],
    },
  },
  getters: {
    libraryTheme: null,
    assets: {
      assetDataByAddress: (address: string) => ({
        address,
        symbol: address ? address.toUpperCase() : '',
        decimals: 18,
        balance: {
          transferable: '0',
        },
      }),
      xor: {
        address: 'xor',
        symbol: 'XOR',
        decimals: 18,
        balance: {
          transferable: '0',
        },
      },
    },
    settings: {
      debugEnabled: false,
      liquiditySource: null,
    },
    wallet: {
      account: {
        isLoggedIn: false,
        accountAssetsAddressTable: {},
      },
      settings: {
        currencySymbol: '$',
        exchangeRate: 1,
      },
    },
  },
  commit: {
    wallet: {
      router: {
        navigate: noop,
      },
      account: {
        setIsDesktop: noop,
        syncWithStorage: noop,
      },
      settings: {
        toggleHideBalance: noop,
      },
      transactions: {
        addActiveTx: noop,
      },
    },
    router: {
      setRoute: noop,
      setLoading: noop,
    },
    bridge: {
      setHistoryPage: noop,
    },
    referrals: {
      setStorageReferrer: noop,
    },
    settings: {
      enableTMA: noop,
      disableTMA: noop,
      setTelegramBotUrl: noop,
      setAccessGranted: noop,
      setIsAccessAccelerometrEventDeclined: noop,
      setIsRotatePhoneHideBalanceFeatureEnabled: noop,
    },
  },
  dispatch: {},
  original: {
    watch: (selector: (state: typeof store.state) => unknown, callback: (value: unknown) => void) => {
      try {
        const value = selector(store.state);
        if (value !== undefined) {
          callback(value);
        }
      } catch {
        /* ignore selector errors in tests */
      }
      return noop;
    },
  },
};

export default store;
