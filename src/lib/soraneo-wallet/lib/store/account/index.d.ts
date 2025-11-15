declare const account: {
  namespaced: true;
  state: import('./types').AccountState;
  mutations: {
    setFiatPriceObject(
      state: import('./types').AccountState,
      object: import('../../services/indexer/types').FiatPriceObject
    ): void;
    updateFiatPriceObject(
      state: import('./types').AccountState,
      fiatPriceAndApyRecord?: import('../../services/indexer/types').FiatPriceObject
    ): void;
    clearFiatPriceObject(state: import('./types').AccountState): void;
    setAlertSubject(
      state: import('./types').AccountState,
      alertSubject: import('rxjs').Subject<import('../../services/indexer/types').FiatPriceObject>
    ): void;
    resetAlertSubscription(state: import('./types').AccountState): void;
    setFiatPriceSubscription(state: import('./types').AccountState, subscription: VoidFunction): void;
    resetFiatPriceSubscription(state: import('./types').AccountState): void;
    setCeresFiatValuesUsage(state: import('./types').AccountState, flag: any): void;
    resetAccount(state: import('./types').AccountState): void;
    setAssetsSubscription(state: import('./types').AccountState, subscription: VoidFunction): void;
    resetAssetsSubscription(state: import('./types').AccountState): void;
    setAccountAssetsSubscription(
      state: import('./types').AccountState,
      subscription: import('rxjs').Subscription
    ): void;
    resetAccountAssetsSubscription(state: import('./types').AccountState): void;
    syncWithStorage(state: import('./types').AccountState): void;
    setAssets(
      state: import('./types').AccountState,
      assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
    ): void;
    setAccountAssets(
      state: import('./types').AccountState,
      accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
    ): void;
    setPinnedAsset(
      state: import('./types').AccountState,
      pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
    ): void;
    setMultiplePinnedAssets(state: import('./types').AccountState, pinnedAssetAddresses: string[]): void;
    removePinnedAsset(
      state: import('./types').AccountState,
      pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
    ): void;
    setAssetToNotify(
      state: import('./types').AccountState,
      asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
    ): void;
    popAssetFromNotificationQueue(state: import('./types').AccountState): void;
    setWhitelist(
      state: import('./types').AccountState,
      whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
    ): void;
    setNftBlacklist(
      state: import('./types').AccountState,
      blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
    ): void;
    clearWhitelist(state: import('./types').AccountState): void;
    clearBlacklist(state: import('./types').AccountState): void;
    setAvailableWallets(
      state: import('./types').AccountState,
      wallets: import('../../services/wallet/types').Wallet[]
    ): void;
    setAccountPassphrase(
      state: import('./types').AccountState,
      {
        address,
        password,
      }: {
        address: string;
        password: string;
      }
    ): void;
    resetAccountPassphrase(state: import('./types').AccountState, address: string): void;
    setPasswordTimeout(state: import('./types').AccountState, timeout: number): void;
    setAccountPassphraseTimer(
      state: import('./types').AccountState,
      {
        address,
        timer,
      }: {
        address: string;
        timer: NodeJS.Timeout;
      }
    ): void;
    resetAccountPassphraseTimer(state: import('./types').AccountState, address: string): void;
    setIsDesktop(state: import('./types').AccountState, value: boolean): void;
    setAddressToBook(
      state: import('./types').AccountState,
      { address, name }: import('../../types/common').PolkadotJsAccount
    ): void;
    removeAddressFromBook(state: import('./types').AccountState, address: string): void;
    setIsMstAddressExist(state: import('./types').AccountState, isExist: boolean): void;
    setIsMST(state: import('./types').AccountState, isMST: boolean): void;
  };
  actions: {
    afterLogin(context: ActionContext<any, any>): Promise<void>;
    logout(context: ActionContext<any, any>): Promise<void>;
    checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
    checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
    updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
    loginAccount(
      context: ActionContext<any, any>,
      accountData: import('../../types/common').PolkadotJsAccount
    ): Promise<void>;
    renameAccount(
      context: ActionContext<any, any>,
      {
        address,
        name,
      }: {
        address: string;
        name: string;
      }
    ): Promise<void>;
    setAccountPassphrase(
      context: ActionContext<any, any>,
      {
        address,
        password,
      }: {
        address: string;
        password: string;
      }
    ): void;
    resetAccountPassphrase(context: ActionContext<any, any>, address: string): void;
    syncWithStorage(context: ActionContext<any, any>): Promise<void>;
    getAssets(context: ActionContext<any, any>): Promise<void>;
    subscribeOnAssets(context: ActionContext<any, any>): Promise<void>;
    subscribeOnAccountAssets(context: ActionContext<any, any>): Promise<void>;
    getWhitelist(context: ActionContext<any, any>): Promise<void>;
    getNftBlacklist(context: ActionContext<any, any>): Promise<void>;
    subscribeOnAlerts(context: ActionContext<any, any>): Promise<void>;
    subscribeOnFiatPrice(context: ActionContext<any, any>): Promise<void>;
    useCeresApiForFiatValues(context: ActionContext<any, any>, flag: boolean): Promise<void>;
    notifyOnDeposit(context: ActionContext<any, any>, data: any): Promise<void>;
    addAsset(_: ActionContext<any, any>, address?: string): Promise<void>;
    transfer(
      context: ActionContext<any, any>,
      {
        to,
        amount,
      }: {
        to: string;
        amount: string;
      }
    ): Promise<void>;
    getVestedTransferFee(
      context: ActionContext<any, any>,
      { asset, amount, vestingPercent, unlockPeriodInDays }: import('./types').VestedTransferFeeParams
    ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
    vestedTransfer(
      context: ActionContext<any, any>,
      { to, asset, amount, vestingPercent, unlockPeriodInDays, start, current }: import('./types').VestedTransferParams
    ): Promise<void>;
    resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
    resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
    resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
    resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
    initMultisigAddress(context: ActionContext<any, any>): void;
  };
  getters: {
    isLoggedIn(state: import('./types').AccountState, getters: any, rootState: any, rootGetters: any): boolean;
    account(
      state: import('./types').AccountState,
      getters: any,
      rootState: any,
      rootGetters: any
    ): import('../../types/common').PolkadotJsAccount;
    assetsDataTable(
      state: import('./types').AccountState,
      getters: any,
      rootState: any,
      rootGetters: any
    ): import('../../types/common').AssetsTable;
    accountAssetsAddressTable(
      state: import('./types').AccountState,
      getters: any,
      rootState: any,
      rootGetters: any
    ): import('../../types/common').AccountAssetsTable;
    whitelist(
      state: import('./types').AccountState,
      getters: any,
      rootState: any,
      rootGetters: any
    ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
    pinnedAssets(
      state: import('./types').AccountState,
      getters: any,
      rootState: any,
      rootGetters: any
    ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
    isAssetPinned(
      state: import('./types').AccountState,
      getters: any,
      rootState: any,
      rootGetters: any
    ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
    whitelistIdsBySymbol(state: import('./types').AccountState, getters: any, rootState: any, rootGetters: any): any;
    getPassword(
      state: import('./types').AccountState,
      getters: any,
      rootState: any,
      rootGetters: any
    ): (address: string) => Nullable<string>;
    blacklist(state: import('./types').AccountState, getters: any, rootState: any, rootGetters: any): any;
    isConnectedAccount(
      state: import('./types').AccountState,
      getters: any,
      rootState: any,
      rootGetters: any
    ): (account: import('../../types/common').PolkadotJsAccount) => boolean;
  };
};
declare const accountGetterContext: (args: [any, any, any, any]) => {
  rootState: never;
  rootGetters: never;
  state: {
    readonly address: string;
    readonly name: string;
    readonly source: import('../../consts').AppWallet;
    readonly isExternal: boolean;
    readonly assets: Readonly<import('@sora-substrate/sdk/build/assets/types').Asset[]>;
    readonly assetsSubscription: Nullable<VoidFunction>;
    readonly accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
    readonly alertSubject: Nullable<import('rxjs').Subject<import('../../services/indexer/types').FiatPriceObject>>;
    readonly accountAssetsSubscription: Nullable<import('rxjs').Subscription>;
    readonly book: Nullable<import('../../types/common').Book>;
    readonly whitelistArray: Readonly<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem[]>;
    readonly blacklistArray: Readonly<import('@sora-substrate/sdk/build/assets/types').Blacklist>;
    readonly fiatPriceObject: Readonly<import('../../services/indexer/types').FiatPriceObject>;
    readonly fiatPriceSubscription: Nullable<VoidFunction>;
    readonly ceresFiatValuesUsage: boolean;
    readonly availableWallets: Array<import('../../services/wallet/types').Wallet>;
    readonly addressKeyMapping: import('../../types/common').AddressKeyMapping;
    readonly addressPassphraseMapping: import('../../types/common').AddressKeyMapping;
    readonly assetsToNotifyQueue: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>;
    readonly isDesktop: boolean;
    readonly accountPasswordTimer: Record<string, Nullable<NodeJS.Timeout>>;
    readonly accountPasswordTimestamp: Record<string, Nullable<number>>;
    readonly accountPasswordTimeout: number;
    readonly pinnedAssets: string[];
    readonly isMstAddressExist: boolean;
    readonly isMST: boolean;
  };
  getters: {
    readonly isLoggedIn: Readonly<boolean>;
    readonly account: Readonly<import('../../types/common').PolkadotJsAccount>;
    readonly assetsDataTable: Readonly<import('../../types/common').AssetsTable>;
    readonly accountAssetsAddressTable: Readonly<import('../../types/common').AccountAssetsTable>;
    readonly whitelist: Readonly<import('@sora-substrate/sdk/build/assets/types').Whitelist>;
    readonly pinnedAssets: readonly import('@sora-substrate/sdk/build/assets/types').AccountAsset[];
    readonly isAssetPinned: (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
    readonly whitelistIdsBySymbol: any;
    readonly getPassword: (address: string) => Nullable<string>;
    readonly blacklist: any;
    readonly isConnectedAccount: (account: import('../../types/common').PolkadotJsAccount) => boolean;
  };
};
declare const accountActionContextBroken: (context: any) => {
  rootState: never;
  rootGetters: never;
  rootCommit: never;
  rootDispatch: never;
  state: {
    readonly address: string;
    readonly name: string;
    readonly source: import('../../consts').AppWallet;
    readonly isExternal: boolean;
    readonly assets: Readonly<import('@sora-substrate/sdk/build/assets/types').Asset[]>;
    readonly assetsSubscription: Nullable<VoidFunction>;
    readonly accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
    readonly alertSubject: Nullable<import('rxjs').Subject<import('../../services/indexer/types').FiatPriceObject>>;
    readonly accountAssetsSubscription: Nullable<import('rxjs').Subscription>;
    readonly book: Nullable<import('../../types/common').Book>;
    readonly whitelistArray: Readonly<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem[]>;
    readonly blacklistArray: Readonly<import('@sora-substrate/sdk/build/assets/types').Blacklist>;
    readonly fiatPriceObject: Readonly<import('../../services/indexer/types').FiatPriceObject>;
    readonly fiatPriceSubscription: Nullable<VoidFunction>;
    readonly ceresFiatValuesUsage: boolean;
    readonly availableWallets: Array<import('../../services/wallet/types').Wallet>;
    readonly addressKeyMapping: import('../../types/common').AddressKeyMapping;
    readonly addressPassphraseMapping: import('../../types/common').AddressKeyMapping;
    readonly assetsToNotifyQueue: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>;
    readonly isDesktop: boolean;
    readonly accountPasswordTimer: Record<string, Nullable<NodeJS.Timeout>>;
    readonly accountPasswordTimestamp: Record<string, Nullable<number>>;
    readonly accountPasswordTimeout: number;
    readonly pinnedAssets: string[];
    readonly isMstAddressExist: boolean;
    readonly isMST: boolean;
  };
  getters: {
    readonly isLoggedIn: Readonly<boolean>;
    readonly account: Readonly<import('../../types/common').PolkadotJsAccount>;
    readonly assetsDataTable: Readonly<import('../../types/common').AssetsTable>;
    readonly accountAssetsAddressTable: Readonly<import('../../types/common').AccountAssetsTable>;
    readonly whitelist: Readonly<import('@sora-substrate/sdk/build/assets/types').Whitelist>;
    readonly pinnedAssets: readonly import('@sora-substrate/sdk/build/assets/types').AccountAsset[];
    readonly isAssetPinned: (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
    readonly whitelistIdsBySymbol: any;
    readonly getPassword: (address: string) => Nullable<string>;
    readonly blacklist: any;
    readonly isConnectedAccount: (account: import('../../types/common').PolkadotJsAccount) => boolean;
  };
  commit: {
    setFiatPriceObject: (payload: import('../../services/indexer/types').FiatPriceObject) => void;
    updateFiatPriceObject: (payload?: import('../../services/indexer/types').FiatPriceObject | undefined) => void;
    clearFiatPriceObject: () => void;
    setAlertSubject: (payload: import('rxjs').Subject<import('../../services/indexer/types').FiatPriceObject>) => void;
    resetAlertSubscription: () => void;
    setFiatPriceSubscription: (payload: VoidFunction) => void;
    resetFiatPriceSubscription: () => void;
    setCeresFiatValuesUsage: (() => void) | ((payload: any) => void) | ((payload?: any) => void);
    resetAccount: () => void;
    setAssetsSubscription: (payload: VoidFunction) => void;
    resetAssetsSubscription: () => void;
    setAccountAssetsSubscription: (payload: import('rxjs').Subscription) => void;
    resetAccountAssetsSubscription: () => void;
    syncWithStorage: () => void;
    setAssets: (payload: import('@sora-substrate/sdk/build/assets/types').Asset[]) => void;
    setAccountAssets: (payload: import('@sora-substrate/sdk/build/assets/types').AccountAsset[]) => void;
    setPinnedAsset: (payload: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => void;
    setMultiplePinnedAssets: (payload: string[]) => void;
    removePinnedAsset: (payload: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => void;
    setAssetToNotify: (payload: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem) => void;
    popAssetFromNotificationQueue: () => void;
    setWhitelist: (payload: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem[]) => void;
    setNftBlacklist: (payload: import('@sora-substrate/sdk/build/assets/types').Blacklist) => void;
    clearWhitelist: () => void;
    clearBlacklist: () => void;
    setAvailableWallets: (payload: import('../../services/wallet/types').Wallet[]) => void;
    setAccountPassphrase: (payload: { address: string; password: string }) => void;
    resetAccountPassphrase: (payload: string) => void;
    setPasswordTimeout: (payload: number) => void;
    setAccountPassphraseTimer: (payload: { address: string; timer: NodeJS.Timeout }) => void;
    resetAccountPassphraseTimer: (payload: string) => void;
    setIsDesktop: (payload: boolean) => void;
    setAddressToBook: (payload: import('../../types/common').PolkadotJsAccount) => void;
    removeAddressFromBook: (payload: string) => void;
    setIsMstAddressExist: (payload: boolean) => void;
    setIsMST: (payload: boolean) => void;
  };
  dispatch: {
    afterLogin: () => Promise<void>;
    logout: () => Promise<void>;
    checkWalletAvailability: () => Promise<void>;
    checkConnectedAccountSource: (payload: string) => Promise<void>;
    updateAvailableWallets: () => Promise<void>;
    loginAccount: (payload: import('../../types/common').PolkadotJsAccount) => Promise<void>;
    renameAccount: (payload: { address: string; name: string }) => Promise<void>;
    setAccountPassphrase: (payload: { address: string; password: string }) => Promise<void>;
    resetAccountPassphrase: (payload: string) => Promise<void>;
    syncWithStorage: () => Promise<void>;
    getAssets: () => Promise<void>;
    subscribeOnAssets: () => Promise<void>;
    subscribeOnAccountAssets: () => Promise<void>;
    getWhitelist: () => Promise<void>;
    getNftBlacklist: () => Promise<void>;
    subscribeOnAlerts: () => Promise<void>;
    subscribeOnFiatPrice: () => Promise<void>;
    useCeresApiForFiatValues: (payload: boolean) => Promise<void>;
    notifyOnDeposit: (() => Promise<void>) | ((payload: any) => Promise<void>) | ((payload?: any) => Promise<void>);
    addAsset: (payload?: string | undefined) => Promise<void>;
    transfer: (payload: { to: string; amount: string }) => Promise<void>;
    getVestedTransferFee: (
      payload: import('./types').VestedTransferFeeParams
    ) => Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
    vestedTransfer: (payload: import('./types').VestedTransferParams) => Promise<void>;
    resetAssetsSubscription: () => Promise<void>;
    resetAccountAssetsSubscription: () => Promise<void>;
    resetFiatPriceSubscription: () => Promise<void>;
    resetAlertsSubscription: () => Promise<void>;
    initMultisigAddress: () => Promise<void>;
  };
};
declare const accountActionContext: typeof accountActionContextBroken;
export { accountGetterContext, accountActionContext };
export default account;
