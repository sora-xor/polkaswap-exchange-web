declare const settings: {
  namespaced: true;
  state: import('./types').SettingsState;
  mutations: {
    setIndexerType(state: import('./types').SettingsState, indexerType: import('../../consts').IndexerType): void;
    setIndexerStatus(
      state: import('./types').SettingsState,
      {
        indexer,
        status,
      }: {
        indexer: import('../../consts').IndexerType;
        status: import('../../types/common').ConnectionStatus;
      }
    ): void;
    setIndexerEndpoint(
      state: import('./types').SettingsState,
      {
        indexer,
        endpoint,
      }: {
        indexer: import('../../consts').IndexerType;
        endpoint: string;
      }
    ): void;
    setWalletLoaded(state: import('./types').SettingsState, flag: boolean): void;
    setPermissions(state: import('./types').SettingsState, permissions: import('../../consts').WalletPermissions): void;
    setSoraNetwork(state: import('./types').SettingsState, value: Nullable<import('../../consts').SoraNetwork>): void;
    setNetworkFees(
      state: import('./types').SettingsState,
      fees?: import('@sora-substrate/sdk').NetworkFeesObject
    ): void;
    updateNetworkFees(state: import('./types').SettingsState, fees?: any): void;
    toggleHideBalance(state: import('./types').SettingsState): void;
    setFilterOptions(state: import('./types').SettingsState, filters: import('../../consts').WalletAssetFilters): void;
    setAllowFeePopup(state: import('./types').SettingsState, flag: boolean): void;
    setFeeMultiplier(state: import('./types').SettingsState, multiplier: number): void;
    setRuntimeVersion(state: import('./types').SettingsState, version: number): void;
    setBlockNumber(state: import('./types').SettingsState, blockNumber: number): void;
    setBlockNumberSubscription(state: import('./types').SettingsState, subscription: import('rxjs').Subscription): void;
    resetBlockNumberSubscription(state: import('./types').SettingsState): void;
    setFeeMultiplierAndRuntimeSubscriptions(
      state: import('./types').SettingsState,
      subscription: import('rxjs').Subscription
    ): void;
    resetFeeMultiplierAndRuntimeSubscriptions(state: import('./types').SettingsState): void;
    setApiKeys(state: import('./types').SettingsState, keys?: import('../../types/common').ApiKeysObject): void;
    setNftStorage(
      state: import('./types').SettingsState,
      {
        marketplaceDid,
        ucan,
      }: {
        marketplaceDid?: string;
        ucan?: string;
      }
    ): void;
    setDepositNotifications(state: import('./types').SettingsState, allow: boolean): void;
    addPriceAlert(state: import('./types').SettingsState, alert: import('../../types/common').Alert): void;
    removePriceAlert(state: import('./types').SettingsState, position: number): void;
    editPriceAlert(state: import('./types').SettingsState, { alert, position }: any): void;
    setPriceAlertAsNotified(state: import('./types').SettingsState, { position, value }: any): void;
    setFiatCurrency(state: import('./types').SettingsState, currency?: import('../../types/currency').Currency): void;
    setCurrencies(
      state: import('./types').SettingsState,
      currencies: import('../../types/currency').CurrencyFields[]
    ): void;
    updateFiatExchangeRates(
      state: import('./types').SettingsState,
      newRates?: import('../../types/currency').FiatExchangeRateObject
    ): void;
    setExchangeRateUnsubFn(state: import('./types').SettingsState, unsubFn: VoidFunction): void;
    resetExchangeRateSubscription(state: import('./types').SettingsState): void;
    setAssetsFilter(state: import('./types').SettingsState, filter: import('../../types/common').FilterOptions): void;
    setIsMstAvailable(state: import('./types').SettingsState, isAvailable: boolean): void;
    setTheme(state: import('./types').SettingsState, theme: import('../../consts').Theme): void;
  };
  actions: {
    setApiKeys(
      context: import('vuex').ActionContext<any, any>,
      keys: import('../../types/common').ApiKeysObject
    ): Promise<void>;
    createNftStorageInstance(context: import('vuex').ActionContext<any, any>): Promise<void>;
    subscribeOnFeeMultiplierAndRuntime(context: import('vuex').ActionContext<any, any>): Promise<void>;
    resetFeeMultiplierAndRuntimeSubscriptions(context: import('vuex').ActionContext<any, any>): Promise<void>;
    subscribeOnBlockNumber(context: import('vuex').ActionContext<any, any>): Promise<void>;
    resetBlockNumberSubscription(context: import('vuex').ActionContext<any, any>): Promise<void>;
    selectIndexer(
      context: import('vuex').ActionContext<any, any>,
      indexerType?: import('../../consts').IndexerType
    ): Promise<void>;
    setIndexerStatus(
      context: import('vuex').ActionContext<any, any>,
      {
        indexer,
        status,
      }: {
        indexer: import('../../consts').IndexerType;
        status: import('../../types/common').ConnectionStatus;
      }
    ): Promise<void>;
    subscribeOnExchangeRatesApi(context: import('vuex').ActionContext<any, any>): Promise<void>;
    setTheme(context: import('vuex').ActionContext<any, any>, theme: import('../../consts').Theme): Promise<void>;
    toggleTheme(context: import('vuex').ActionContext<any, any>): Promise<void>;
  };
  getters: {
    currencySymbol(state: import('./types').SettingsState, getters: any, rootState: any, rootGetters: any): string;
    exchangeRate(state: import('./types').SettingsState, getters: any, rootState: any, rootGetters: any): number;
    libraryTheme(
      state: import('./types').SettingsState,
      getters: any,
      rootState: any,
      rootGetters: any
    ): import('../../consts').Theme;
    libraryDesignSystem(
      state: import('./types').SettingsState,
      getters: any,
      rootState: any,
      rootGetters: any
    ): import('../../types/common').LibraryDesignSystem;
  };
};
declare const settingsGetterContext: (args: [any, any, any, any]) => {
  rootState: never;
  rootGetters: never;
  state: {
    readonly apiKeys: import('../../types/common').ApiKeysObject;
    readonly alerts: Array<import('../../types/common').Alert>;
    readonly allowTopUpAlert: boolean;
    readonly isWalletLoaded: boolean;
    readonly indexerType: import('../../consts').IndexerType;
    readonly indexers: Record<import('../../consts').IndexerType, import('../../types/common').IndexerState>;
    readonly permissions: import('../../consts').WalletPermissions;
    readonly filters: import('../../consts').WalletAssetFilters;
    readonly allowFeePopup: boolean;
    readonly soraNetwork: Nullable<import('../../consts').SoraNetwork>;
    readonly networkFees: import('@sora-substrate/sdk').NetworkFeesObject;
    readonly shouldBalanceBeHidden: boolean;
    readonly feeMultiplier: number;
    readonly runtimeVersion: number;
    readonly blockNumber: number;
    readonly blockNumberSubscription: Nullable<import('rxjs').Subscription>;
    readonly feeMultiplierAndRuntimeSubscriptions: Nullable<import('rxjs').Subscription>;
    readonly nftStorage: Nullable<import('nft.storage').NFTStorage>;
    readonly currency: import('../../types/currency').Currency;
    readonly currencies: Array<import('../../types/currency').CurrencyFields>;
    readonly fiatExchangeRateObject: import('../../types/currency').FiatExchangeRateObject;
    readonly exchangeRateUnsubFn: Nullable<VoidFunction>;
    readonly assetsFilter: import('../../types/common').FilterOptions;
    readonly isMSTAvailable: boolean;
    readonly theme: import('../../consts').Theme;
  };
  getters: {
    readonly currencySymbol: string;
    readonly exchangeRate: number;
    readonly libraryTheme: Readonly<import('../../consts').Theme>;
    readonly libraryDesignSystem: Readonly<import('../../types/common').LibraryDesignSystem>;
  };
};
declare const settingsActionContextBroken: (context: any) => {
  rootState: never;
  rootGetters: never;
  rootCommit: never;
  rootDispatch: never;
  state: {
    readonly apiKeys: import('../../types/common').ApiKeysObject;
    readonly alerts: Array<import('../../types/common').Alert>;
    readonly allowTopUpAlert: boolean;
    readonly isWalletLoaded: boolean;
    readonly indexerType: import('../../consts').IndexerType;
    readonly indexers: Record<import('../../consts').IndexerType, import('../../types/common').IndexerState>;
    readonly permissions: import('../../consts').WalletPermissions;
    readonly filters: import('../../consts').WalletAssetFilters;
    readonly allowFeePopup: boolean;
    readonly soraNetwork: Nullable<import('../../consts').SoraNetwork>;
    readonly networkFees: import('@sora-substrate/sdk').NetworkFeesObject;
    readonly shouldBalanceBeHidden: boolean;
    readonly feeMultiplier: number;
    readonly runtimeVersion: number;
    readonly blockNumber: number;
    readonly blockNumberSubscription: Nullable<import('rxjs').Subscription>;
    readonly feeMultiplierAndRuntimeSubscriptions: Nullable<import('rxjs').Subscription>;
    readonly nftStorage: Nullable<import('nft.storage').NFTStorage>;
    readonly currency: import('../../types/currency').Currency;
    readonly currencies: Array<import('../../types/currency').CurrencyFields>;
    readonly fiatExchangeRateObject: import('../../types/currency').FiatExchangeRateObject;
    readonly exchangeRateUnsubFn: Nullable<VoidFunction>;
    readonly assetsFilter: import('../../types/common').FilterOptions;
    readonly isMSTAvailable: boolean;
    readonly theme: import('../../consts').Theme;
  };
  getters: {
    readonly currencySymbol: string;
    readonly exchangeRate: number;
    readonly libraryTheme: Readonly<import('../../consts').Theme>;
    readonly libraryDesignSystem: Readonly<import('../../types/common').LibraryDesignSystem>;
  };
  commit: {
    setIndexerType: (payload: import('../../consts').IndexerType) => void;
    setIndexerStatus: (payload: {
      indexer: import('../../consts').IndexerType;
      status: import('../../types/common').ConnectionStatus;
    }) => void;
    setIndexerEndpoint: (payload: { indexer: import('../../consts').IndexerType; endpoint: string }) => void;
    setWalletLoaded: (payload: boolean) => void;
    setPermissions: (payload: import('../../consts').WalletPermissions) => void;
    setSoraNetwork: (payload?: Nullable<import('../../consts').SoraNetwork>) => void;
    setNetworkFees: (payload?: import('@sora-substrate/sdk').NetworkFeesObject | undefined) => void;
    updateNetworkFees: (() => void) | ((payload: any) => void) | ((payload?: any) => void);
    toggleHideBalance: () => void;
    setFilterOptions: (payload: import('../../consts').WalletAssetFilters) => void;
    setAllowFeePopup: (payload: boolean) => void;
    setFeeMultiplier: (payload: number) => void;
    setRuntimeVersion: (payload: number) => void;
    setBlockNumber: (payload: number) => void;
    setBlockNumberSubscription: (payload: import('rxjs').Subscription) => void;
    resetBlockNumberSubscription: () => void;
    setFeeMultiplierAndRuntimeSubscriptions: (payload: import('rxjs').Subscription) => void;
    resetFeeMultiplierAndRuntimeSubscriptions: () => void;
    setApiKeys: (payload?: import('../../types/common').ApiKeysObject | undefined) => void;
    setNftStorage: (payload: { marketplaceDid?: string; ucan?: string }) => void;
    setDepositNotifications: (payload: boolean) => void;
    addPriceAlert: (payload: import('../../types/common').Alert) => void;
    removePriceAlert: (payload: number) => void;
    editPriceAlert: (() => void) | ((payload: any) => void) | ((payload?: any) => void);
    setPriceAlertAsNotified: (() => void) | ((payload: any) => void) | ((payload?: any) => void);
    setFiatCurrency: (payload?: import('../../types/currency').Currency | undefined) => void;
    setCurrencies: (payload: import('../../types/currency').CurrencyFields[]) => void;
    updateFiatExchangeRates: (payload?: import('../../types/currency').FiatExchangeRateObject | undefined) => void;
    setExchangeRateUnsubFn: (payload: VoidFunction) => void;
    resetExchangeRateSubscription: () => void;
    setAssetsFilter: (payload: import('../../types/common').FilterOptions) => void;
    setIsMstAvailable: (payload: boolean) => void;
    setTheme: (payload: import('../../consts').Theme) => void;
  };
  dispatch: {
    setApiKeys: (payload: import('../../types/common').ApiKeysObject) => Promise<void>;
    createNftStorageInstance: () => Promise<void>;
    subscribeOnFeeMultiplierAndRuntime: () => Promise<void>;
    resetFeeMultiplierAndRuntimeSubscriptions: () => Promise<void>;
    subscribeOnBlockNumber: () => Promise<void>;
    resetBlockNumberSubscription: () => Promise<void>;
    selectIndexer: (payload?: import('../../consts').IndexerType | undefined) => Promise<void>;
    setIndexerStatus: (payload: {
      indexer: import('../../consts').IndexerType;
      status: import('../../types/common').ConnectionStatus;
    }) => Promise<void>;
    subscribeOnExchangeRatesApi: () => Promise<void>;
    setTheme: (payload: import('../../consts').Theme) => Promise<void>;
    toggleTheme: () => Promise<void>;
  };
};
declare const settingsActionContext: typeof settingsActionContextBroken;
export { settingsActionContext, settingsGetterContext };
export default settings;
