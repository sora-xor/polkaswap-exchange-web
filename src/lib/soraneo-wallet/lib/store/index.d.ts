import { WalletModule } from './wallet';

declare const modules: {
  wallet: {
    namespaced: true;
    modules: {
      account: {
        namespaced: true;
        state: import('./account/types').AccountState;
        mutations: {
          setFiatPriceObject(
            state: import('./account/types').AccountState,
            object: import('../services/indexer/types').FiatPriceObject
          ): void;
          updateFiatPriceObject(
            state: import('./account/types').AccountState,
            fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
          ): void;
          clearFiatPriceObject(state: import('./account/types').AccountState): void;
          setAlertSubject(
            state: import('./account/types').AccountState,
            alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
          ): void;
          resetAlertSubscription(state: import('./account/types').AccountState): void;
          setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
          resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
          setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
          resetAccount(state: import('./account/types').AccountState): void;
          setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
          resetAssetsSubscription(state: import('./account/types').AccountState): void;
          setAccountAssetsSubscription(
            state: import('./account/types').AccountState,
            subscription: import('rxjs').Subscription
          ): void;
          resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
          syncWithStorage(state: import('./account/types').AccountState): void;
          setAssets(
            state: import('./account/types').AccountState,
            assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
          ): void;
          setAccountAssets(
            state: import('./account/types').AccountState,
            accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
          ): void;
          setPinnedAsset(
            state: import('./account/types').AccountState,
            pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
          ): void;
          setMultiplePinnedAssets(state: import('./account/types').AccountState, pinnedAssetAddresses: string[]): void;
          removePinnedAsset(
            state: import('./account/types').AccountState,
            pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
          ): void;
          setAssetToNotify(
            state: import('./account/types').AccountState,
            asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
          ): void;
          popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
          setWhitelist(
            state: import('./account/types').AccountState,
            whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
          ): void;
          setNftBlacklist(
            state: import('./account/types').AccountState,
            blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
          ): void;
          clearWhitelist(state: import('./account/types').AccountState): void;
          clearBlacklist(state: import('./account/types').AccountState): void;
          setAvailableWallets(
            state: import('./account/types').AccountState,
            wallets: import('../services/wallet/types').Wallet[]
          ): void;
          setAccountPassphrase(
            state: import('./account/types').AccountState,
            {
              address,
              password,
            }: {
              address: string;
              password: string;
            }
          ): void;
          resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
          setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
          setAccountPassphraseTimer(
            state: import('./account/types').AccountState,
            {
              address,
              timer,
            }: {
              address: string;
              timer: NodeJS.Timeout;
            }
          ): void;
          resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
          setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
          setAddressToBook(
            state: import('./account/types').AccountState,
            { address, name }: import('../types/common').PolkadotJsAccount
          ): void;
          removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
          setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
          setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
        };
        actions: {
          afterLogin(context: ActionContext<any, any>): Promise<void>;
          logout(context: ActionContext<any, any>): Promise<void>;
          checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
          checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
          updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
          loginAccount(
            context: ActionContext<any, any>,
            accountData: import('../types/common').PolkadotJsAccount
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
            { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
          ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
          vestedTransfer(
            context: ActionContext<any, any>,
            {
              to,
              asset,
              amount,
              vestingPercent,
              unlockPeriodInDays,
              start,
              current,
            }: import('./account/types').VestedTransferParams
          ): Promise<void>;
          resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
          resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
          resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
          resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
          initMultisigAddress(context: ActionContext<any, any>): void;
        };
        getters: {
          isLoggedIn(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): boolean;
          account(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').PolkadotJsAccount;
          assetsDataTable(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').AssetsTable;
          accountAssetsAddressTable(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').AccountAssetsTable;
          whitelist(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
          pinnedAssets(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
          isAssetPinned(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
          whitelistIdsBySymbol(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): any;
          getPassword(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): (address: string) => Nullable<string>;
          blacklist(state: import('./account/types').AccountState, getters: any, rootState: any, rootGetters: any): any;
          isConnectedAccount(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): (account: import('../types/common').PolkadotJsAccount) => boolean;
        };
      };
      router: {
        namespaced: true;
        state: import('./router/types').RouterState;
        mutations: {
          navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
        };
        actions: {
          back(context: ActionContext<any, any>): Promise<void>;
          checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
        };
      };
      settings: {
        namespaced: true;
        state: import('./settings/types').SettingsState;
        mutations: {
          setIndexerType(
            state: import('./settings/types').SettingsState,
            indexerType: import('../consts').IndexerType
          ): void;
          setIndexerStatus(
            state: import('./settings/types').SettingsState,
            {
              indexer,
              status,
            }: {
              indexer: import('../consts').IndexerType;
              status: import('../types/common').ConnectionStatus;
            }
          ): void;
          setIndexerEndpoint(
            state: import('./settings/types').SettingsState,
            {
              indexer,
              endpoint,
            }: {
              indexer: import('../consts').IndexerType;
              endpoint: string;
            }
          ): void;
          setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
          setPermissions(
            state: import('./settings/types').SettingsState,
            permissions: import('../consts').WalletPermissions
          ): void;
          setSoraNetwork(
            state: import('./settings/types').SettingsState,
            value: Nullable<import('../consts').SoraNetwork>
          ): void;
          setNetworkFees(
            state: import('./settings/types').SettingsState,
            fees?: import('@sora-substrate/sdk').NetworkFeesObject
          ): void;
          updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
          toggleHideBalance(state: import('./settings/types').SettingsState): void;
          setFilterOptions(
            state: import('./settings/types').SettingsState,
            filters: import('../consts').WalletAssetFilters
          ): void;
          setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
          setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
          setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
          setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
          setBlockNumberSubscription(
            state: import('./settings/types').SettingsState,
            subscription: import('rxjs').Subscription
          ): void;
          resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
          setFeeMultiplierAndRuntimeSubscriptions(
            state: import('./settings/types').SettingsState,
            subscription: import('rxjs').Subscription
          ): void;
          resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
          setApiKeys(
            state: import('./settings/types').SettingsState,
            keys?: import('../types/common').ApiKeysObject
          ): void;
          setNftStorage(
            state: import('./settings/types').SettingsState,
            {
              marketplaceDid,
              ucan,
            }: {
              marketplaceDid?: string;
              ucan?: string;
            }
          ): void;
          setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
          addPriceAlert(state: import('./settings/types').SettingsState, alert: import('../types/common').Alert): void;
          removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
          editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
          setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
          setFiatCurrency(
            state: import('./settings/types').SettingsState,
            currency?: import('../types/currency').Currency
          ): void;
          setCurrencies(
            state: import('./settings/types').SettingsState,
            currencies: import('../types/currency').CurrencyFields[]
          ): void;
          updateFiatExchangeRates(
            state: import('./settings/types').SettingsState,
            newRates?: import('../types/currency').FiatExchangeRateObject
          ): void;
          setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
          resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
          setAssetsFilter(
            state: import('./settings/types').SettingsState,
            filter: import('../types/common').FilterOptions
          ): void;
          setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
          setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
        };
        actions: {
          setApiKeys(context: ActionContext<any, any>, keys: import('../types/common').ApiKeysObject): Promise<void>;
          createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
          subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
          resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
          subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
          resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
          selectIndexer(context: ActionContext<any, any>, indexerType?: import('../consts').IndexerType): Promise<void>;
          setIndexerStatus(
            context: ActionContext<any, any>,
            {
              indexer,
              status,
            }: {
              indexer: import('../consts').IndexerType;
              status: import('../types/common').ConnectionStatus;
            }
          ): Promise<void>;
          subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
          setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
          toggleTheme(context: ActionContext<any, any>): Promise<void>;
        };
        getters: {
          currencySymbol(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): string;
          exchangeRate(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): number;
          libraryTheme(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../consts').Theme;
          libraryDesignSystem(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').LibraryDesignSystem;
        };
      };
      subscriptions: {
        namespaced: true;
        state: import('./subscriptions/types').SubscriptionsState;
        mutations: {
          setSubscription(
            state: import('./subscriptions/types').SubscriptionsState,
            newSubscription: Nullable<VoidFunction>
          ): void;
        };
        actions: {
          resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
          subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
          activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
          resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
          activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
          resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
          activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
          resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
        };
      };
      transactions: {
        namespaced: true;
        state: import('./transactions/types').TransactionsState;
        mutations: {
          setActiveTxsSubscription(
            state: import('./transactions/types').TransactionsState,
            subscription: NodeJS.Timeout | number
          ): void;
          resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
          addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
          removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
          removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
          setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
          resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
          getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
          setExternalHistory(
            state: import('./transactions/types').TransactionsState,
            history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
          ): void;
          setExternalHistoryUpdates(
            state: import('./transactions/types').TransactionsState,
            history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
          ): void;
          saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
          setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
          resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
          setExternalHistorySubscription(
            state: import('./transactions/types').TransactionsState,
            subscription: VoidFunction
          ): void;
          resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
          setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
          setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
          setSignTxDialogVisibility(state: import('./transactions/types').TransactionsState, visibility: boolean): void;
          setPendingMstTxsSubscription(
            state: import('./transactions/types').TransactionsState,
            subscription: import('rxjs').Subscription | null
          ): void;
          resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
          setPendingMstTransactions(
            state: import('./transactions/types').TransactionsState,
            transactions: import('@sora-substrate/sdk').HistoryItem[]
          ): void;
        };
        actions: {
          subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
          getExternalHistory(
            context: ActionContext<any, any>,
            { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
          ): Promise<void>;
          trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
          trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
          resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
          getAccountHistory(context: ActionContext<any, any>): Promise<void>;
          resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
          resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
        };
        getters: {
          activeTxs(
            state: import('./transactions/types').TransactionsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Array<import('@sora-substrate/sdk').HistoryItem>;
          firstReadyTx(
            state: import('./transactions/types').TransactionsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
          selectedTx(
            state: import('./transactions/types').TransactionsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
        };
      };
    };
  };
};
declare const store: {
    readonly state: {
      readonly wallet: {
        readonly account: import('direct-vuex/types/direct-types').DirectState<{
          namespaced: true;
          state: import('./account/types').AccountState;
          mutations: {
            setFiatPriceObject(
              state: import('./account/types').AccountState,
              object: import('../services/indexer/types').FiatPriceObject
            ): void;
            updateFiatPriceObject(
              state: import('./account/types').AccountState,
              fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
            ): void;
            clearFiatPriceObject(state: import('./account/types').AccountState): void;
            setAlertSubject(
              state: import('./account/types').AccountState,
              alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
            ): void;
            resetAlertSubscription(state: import('./account/types').AccountState): void;
            setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
            resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
            setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
            resetAccount(state: import('./account/types').AccountState): void;
            setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
            resetAssetsSubscription(state: import('./account/types').AccountState): void;
            setAccountAssetsSubscription(
              state: import('./account/types').AccountState,
              subscription: import('rxjs').Subscription
            ): void;
            resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
            syncWithStorage(state: import('./account/types').AccountState): void;
            setAssets(
              state: import('./account/types').AccountState,
              assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
            ): void;
            setAccountAssets(
              state: import('./account/types').AccountState,
              accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
            ): void;
            setPinnedAsset(
              state: import('./account/types').AccountState,
              pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
            ): void;
            setMultiplePinnedAssets(
              state: import('./account/types').AccountState,
              pinnedAssetAddresses: string[]
            ): void;
            removePinnedAsset(
              state: import('./account/types').AccountState,
              pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
            ): void;
            setAssetToNotify(
              state: import('./account/types').AccountState,
              asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
            ): void;
            popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
            setWhitelist(
              state: import('./account/types').AccountState,
              whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
            ): void;
            setNftBlacklist(
              state: import('./account/types').AccountState,
              blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
            ): void;
            clearWhitelist(state: import('./account/types').AccountState): void;
            clearBlacklist(state: import('./account/types').AccountState): void;
            setAvailableWallets(
              state: import('./account/types').AccountState,
              wallets: import('../services/wallet/types').Wallet[]
            ): void;
            setAccountPassphrase(
              state: import('./account/types').AccountState,
              {
                address,
                password,
              }: {
                address: string;
                password: string;
              }
            ): void;
            resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
            setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
            setAccountPassphraseTimer(
              state: import('./account/types').AccountState,
              {
                address,
                timer,
              }: {
                address: string;
                timer: NodeJS.Timeout;
              }
            ): void;
            resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
            setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
            setAddressToBook(
              state: import('./account/types').AccountState,
              { address, name }: import('../types/common').PolkadotJsAccount
            ): void;
            removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
            setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
            setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
          };
          actions: {
            afterLogin(context: ActionContext<any, any>): Promise<void>;
            logout(context: ActionContext<any, any>): Promise<void>;
            checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
            checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
            updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
            loginAccount(
              context: ActionContext<any, any>,
              accountData: import('../types/common').PolkadotJsAccount
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
              { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
            ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
            vestedTransfer(
              context: ActionContext<any, any>,
              {
                to,
                asset,
                amount,
                vestingPercent,
                unlockPeriodInDays,
                start,
                current,
              }: import('./account/types').VestedTransferParams
            ): Promise<void>;
            resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
            resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
            resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
            resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
            initMultisigAddress(context: ActionContext<any, any>): void;
          };
          getters: {
            isLoggedIn(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): boolean;
            account(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').PolkadotJsAccount;
            assetsDataTable(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').AssetsTable;
            accountAssetsAddressTable(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').AccountAssetsTable;
            whitelist(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
            pinnedAssets(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
            isAssetPinned(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
            whitelistIdsBySymbol(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): any;
            getPassword(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): (address: string) => Nullable<string>;
            blacklist(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): any;
            isConnectedAccount(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): (account: import('../types/common').PolkadotJsAccount) => boolean;
          };
        }>;
        readonly router: import('direct-vuex/types/direct-types').DirectState<{
          namespaced: true;
          state: import('./router/types').RouterState;
          mutations: {
            navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
          };
          actions: {
            back(context: ActionContext<any, any>): Promise<void>;
            checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
          };
        }>;
        readonly settings: import('direct-vuex/types/direct-types').DirectState<{
          namespaced: true;
          state: import('./settings/types').SettingsState;
          mutations: {
            setIndexerType(
              state: import('./settings/types').SettingsState,
              indexerType: import('../consts').IndexerType
            ): void;
            setIndexerStatus(
              state: import('./settings/types').SettingsState,
              {
                indexer,
                status,
              }: {
                indexer: import('../consts').IndexerType;
                status: import('../types/common').ConnectionStatus;
              }
            ): void;
            setIndexerEndpoint(
              state: import('./settings/types').SettingsState,
              {
                indexer,
                endpoint,
              }: {
                indexer: import('../consts').IndexerType;
                endpoint: string;
              }
            ): void;
            setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
            setPermissions(
              state: import('./settings/types').SettingsState,
              permissions: import('../consts').WalletPermissions
            ): void;
            setSoraNetwork(
              state: import('./settings/types').SettingsState,
              value: Nullable<import('../consts').SoraNetwork>
            ): void;
            setNetworkFees(
              state: import('./settings/types').SettingsState,
              fees?: import('@sora-substrate/sdk').NetworkFeesObject
            ): void;
            updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
            toggleHideBalance(state: import('./settings/types').SettingsState): void;
            setFilterOptions(
              state: import('./settings/types').SettingsState,
              filters: import('../consts').WalletAssetFilters
            ): void;
            setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
            setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
            setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
            setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
            setBlockNumberSubscription(
              state: import('./settings/types').SettingsState,
              subscription: import('rxjs').Subscription
            ): void;
            resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
            setFeeMultiplierAndRuntimeSubscriptions(
              state: import('./settings/types').SettingsState,
              subscription: import('rxjs').Subscription
            ): void;
            resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
            setApiKeys(
              state: import('./settings/types').SettingsState,
              keys?: import('../types/common').ApiKeysObject
            ): void;
            setNftStorage(
              state: import('./settings/types').SettingsState,
              {
                marketplaceDid,
                ucan,
              }: {
                marketplaceDid?: string;
                ucan?: string;
              }
            ): void;
            setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
            addPriceAlert(
              state: import('./settings/types').SettingsState,
              alert: import('../types/common').Alert
            ): void;
            removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
            editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
            setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
            setFiatCurrency(
              state: import('./settings/types').SettingsState,
              currency?: import('../types/currency').Currency
            ): void;
            setCurrencies(
              state: import('./settings/types').SettingsState,
              currencies: import('../types/currency').CurrencyFields[]
            ): void;
            updateFiatExchangeRates(
              state: import('./settings/types').SettingsState,
              newRates?: import('../types/currency').FiatExchangeRateObject
            ): void;
            setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
            resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
            setAssetsFilter(
              state: import('./settings/types').SettingsState,
              filter: import('../types/common').FilterOptions
            ): void;
            setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
            setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
          };
          actions: {
            setApiKeys(context: ActionContext<any, any>, keys: import('../types/common').ApiKeysObject): Promise<void>;
            createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
            subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
            resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
            subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
            resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
            selectIndexer(
              context: ActionContext<any, any>,
              indexerType?: import('../consts').IndexerType
            ): Promise<void>;
            setIndexerStatus(
              context: ActionContext<any, any>,
              {
                indexer,
                status,
              }: {
                indexer: import('../consts').IndexerType;
                status: import('../types/common').ConnectionStatus;
              }
            ): Promise<void>;
            subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
            setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
            toggleTheme(context: ActionContext<any, any>): Promise<void>;
          };
          getters: {
            currencySymbol(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): string;
            exchangeRate(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): number;
            libraryTheme(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../consts').Theme;
            libraryDesignSystem(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').LibraryDesignSystem;
          };
        }>;
        readonly subscriptions: import('direct-vuex/types/direct-types').DirectState<{
          namespaced: true;
          state: import('./subscriptions/types').SubscriptionsState;
          mutations: {
            setSubscription(
              state: import('./subscriptions/types').SubscriptionsState,
              newSubscription: Nullable<VoidFunction>
            ): void;
          };
          actions: {
            resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
            subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
            activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
            resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
            activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
            resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
            activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
          };
        }>;
        readonly transactions: import('direct-vuex/types/direct-types').DirectState<{
          namespaced: true;
          state: import('./transactions/types').TransactionsState;
          mutations: {
            setActiveTxsSubscription(
              state: import('./transactions/types').TransactionsState,
              subscription: NodeJS.Timeout | number
            ): void;
            resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
            addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
            removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
            removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
            setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
            resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
            getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
            setExternalHistory(
              state: import('./transactions/types').TransactionsState,
              history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
            ): void;
            setExternalHistoryUpdates(
              state: import('./transactions/types').TransactionsState,
              history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
            ): void;
            saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
            setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
            resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
            setExternalHistorySubscription(
              state: import('./transactions/types').TransactionsState,
              subscription: VoidFunction
            ): void;
            resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
            setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
            setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
            setSignTxDialogVisibility(
              state: import('./transactions/types').TransactionsState,
              visibility: boolean
            ): void;
            setPendingMstTxsSubscription(
              state: import('./transactions/types').TransactionsState,
              subscription: import('rxjs').Subscription | null
            ): void;
            resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
            setPendingMstTransactions(
              state: import('./transactions/types').TransactionsState,
              transactions: import('@sora-substrate/sdk').HistoryItem[]
            ): void;
          };
          actions: {
            subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
            getExternalHistory(
              context: ActionContext<any, any>,
              { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
            ): Promise<void>;
            trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
            trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
            resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
            getAccountHistory(context: ActionContext<any, any>): Promise<void>;
            resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
            resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
          };
          getters: {
            activeTxs(
              state: import('./transactions/types').TransactionsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Array<import('@sora-substrate/sdk').HistoryItem>;
            firstReadyTx(
              state: import('./transactions/types').TransactionsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            selectedTx(
              state: import('./transactions/types').TransactionsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
          };
        }>;
      };
    };
    getters: {
      readonly wallet: {
        readonly account: import('direct-vuex/types/direct-types').DirectGetters<{
          namespaced: true;
          state: import('./account/types').AccountState;
          mutations: {
            setFiatPriceObject(
              state: import('./account/types').AccountState,
              object: import('../services/indexer/types').FiatPriceObject
            ): void;
            updateFiatPriceObject(
              state: import('./account/types').AccountState,
              fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
            ): void;
            clearFiatPriceObject(state: import('./account/types').AccountState): void;
            setAlertSubject(
              state: import('./account/types').AccountState,
              alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
            ): void;
            resetAlertSubscription(state: import('./account/types').AccountState): void;
            setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
            resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
            setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
            resetAccount(state: import('./account/types').AccountState): void;
            setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
            resetAssetsSubscription(state: import('./account/types').AccountState): void;
            setAccountAssetsSubscription(
              state: import('./account/types').AccountState,
              subscription: import('rxjs').Subscription
            ): void;
            resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
            syncWithStorage(state: import('./account/types').AccountState): void;
            setAssets(
              state: import('./account/types').AccountState,
              assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
            ): void;
            setAccountAssets(
              state: import('./account/types').AccountState,
              accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
            ): void;
            setPinnedAsset(
              state: import('./account/types').AccountState,
              pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
            ): void;
            setMultiplePinnedAssets(
              state: import('./account/types').AccountState,
              pinnedAssetAddresses: string[]
            ): void;
            removePinnedAsset(
              state: import('./account/types').AccountState,
              pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
            ): void;
            setAssetToNotify(
              state: import('./account/types').AccountState,
              asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
            ): void;
            popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
            setWhitelist(
              state: import('./account/types').AccountState,
              whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
            ): void;
            setNftBlacklist(
              state: import('./account/types').AccountState,
              blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
            ): void;
            clearWhitelist(state: import('./account/types').AccountState): void;
            clearBlacklist(state: import('./account/types').AccountState): void;
            setAvailableWallets(
              state: import('./account/types').AccountState,
              wallets: import('../services/wallet/types').Wallet[]
            ): void;
            setAccountPassphrase(
              state: import('./account/types').AccountState,
              {
                address,
                password,
              }: {
                address: string;
                password: string;
              }
            ): void;
            resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
            setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
            setAccountPassphraseTimer(
              state: import('./account/types').AccountState,
              {
                address,
                timer,
              }: {
                address: string;
                timer: NodeJS.Timeout;
              }
            ): void;
            resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
            setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
            setAddressToBook(
              state: import('./account/types').AccountState,
              { address, name }: import('../types/common').PolkadotJsAccount
            ): void;
            removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
            setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
            setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
          };
          actions: {
            afterLogin(context: ActionContext<any, any>): Promise<void>;
            logout(context: ActionContext<any, any>): Promise<void>;
            checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
            checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
            updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
            loginAccount(
              context: ActionContext<any, any>,
              accountData: import('../types/common').PolkadotJsAccount
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
              { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
            ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
            vestedTransfer(
              context: ActionContext<any, any>,
              {
                to,
                asset,
                amount,
                vestingPercent,
                unlockPeriodInDays,
                start,
                current,
              }: import('./account/types').VestedTransferParams
            ): Promise<void>;
            resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
            resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
            resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
            resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
            initMultisigAddress(context: ActionContext<any, any>): void;
          };
          getters: {
            isLoggedIn(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): boolean;
            account(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').PolkadotJsAccount;
            assetsDataTable(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').AssetsTable;
            accountAssetsAddressTable(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').AccountAssetsTable;
            whitelist(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
            pinnedAssets(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
            isAssetPinned(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
            whitelistIdsBySymbol(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): any;
            getPassword(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): (address: string) => Nullable<string>;
            blacklist(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): any;
            isConnectedAccount(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): (account: import('../types/common').PolkadotJsAccount) => boolean;
          };
        }>;
        readonly router: import('direct-vuex/types/direct-types').DirectGetters<{
          namespaced: true;
          state: import('./router/types').RouterState;
          mutations: {
            navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
          };
          actions: {
            back(context: ActionContext<any, any>): Promise<void>;
            checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
          };
        }>;
        readonly settings: import('direct-vuex/types/direct-types').DirectGetters<{
          namespaced: true;
          state: import('./settings/types').SettingsState;
          mutations: {
            setIndexerType(
              state: import('./settings/types').SettingsState,
              indexerType: import('../consts').IndexerType
            ): void;
            setIndexerStatus(
              state: import('./settings/types').SettingsState,
              {
                indexer,
                status,
              }: {
                indexer: import('../consts').IndexerType;
                status: import('../types/common').ConnectionStatus;
              }
            ): void;
            setIndexerEndpoint(
              state: import('./settings/types').SettingsState,
              {
                indexer,
                endpoint,
              }: {
                indexer: import('../consts').IndexerType;
                endpoint: string;
              }
            ): void;
            setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
            setPermissions(
              state: import('./settings/types').SettingsState,
              permissions: import('../consts').WalletPermissions
            ): void;
            setSoraNetwork(
              state: import('./settings/types').SettingsState,
              value: Nullable<import('../consts').SoraNetwork>
            ): void;
            setNetworkFees(
              state: import('./settings/types').SettingsState,
              fees?: import('@sora-substrate/sdk').NetworkFeesObject
            ): void;
            updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
            toggleHideBalance(state: import('./settings/types').SettingsState): void;
            setFilterOptions(
              state: import('./settings/types').SettingsState,
              filters: import('../consts').WalletAssetFilters
            ): void;
            setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
            setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
            setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
            setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
            setBlockNumberSubscription(
              state: import('./settings/types').SettingsState,
              subscription: import('rxjs').Subscription
            ): void;
            resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
            setFeeMultiplierAndRuntimeSubscriptions(
              state: import('./settings/types').SettingsState,
              subscription: import('rxjs').Subscription
            ): void;
            resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
            setApiKeys(
              state: import('./settings/types').SettingsState,
              keys?: import('../types/common').ApiKeysObject
            ): void;
            setNftStorage(
              state: import('./settings/types').SettingsState,
              {
                marketplaceDid,
                ucan,
              }: {
                marketplaceDid?: string;
                ucan?: string;
              }
            ): void;
            setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
            addPriceAlert(
              state: import('./settings/types').SettingsState,
              alert: import('../types/common').Alert
            ): void;
            removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
            editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
            setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
            setFiatCurrency(
              state: import('./settings/types').SettingsState,
              currency?: import('../types/currency').Currency
            ): void;
            setCurrencies(
              state: import('./settings/types').SettingsState,
              currencies: import('../types/currency').CurrencyFields[]
            ): void;
            updateFiatExchangeRates(
              state: import('./settings/types').SettingsState,
              newRates?: import('../types/currency').FiatExchangeRateObject
            ): void;
            setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
            resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
            setAssetsFilter(
              state: import('./settings/types').SettingsState,
              filter: import('../types/common').FilterOptions
            ): void;
            setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
            setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
          };
          actions: {
            setApiKeys(context: ActionContext<any, any>, keys: import('../types/common').ApiKeysObject): Promise<void>;
            createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
            subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
            resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
            subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
            resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
            selectIndexer(
              context: ActionContext<any, any>,
              indexerType?: import('../consts').IndexerType
            ): Promise<void>;
            setIndexerStatus(
              context: ActionContext<any, any>,
              {
                indexer,
                status,
              }: {
                indexer: import('../consts').IndexerType;
                status: import('../types/common').ConnectionStatus;
              }
            ): Promise<void>;
            subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
            setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
            toggleTheme(context: ActionContext<any, any>): Promise<void>;
          };
          getters: {
            currencySymbol(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): string;
            exchangeRate(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): number;
            libraryTheme(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../consts').Theme;
            libraryDesignSystem(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').LibraryDesignSystem;
          };
        }>;
        readonly subscriptions: import('direct-vuex/types/direct-types').DirectGetters<{
          namespaced: true;
          state: import('./subscriptions/types').SubscriptionsState;
          mutations: {
            setSubscription(
              state: import('./subscriptions/types').SubscriptionsState,
              newSubscription: Nullable<VoidFunction>
            ): void;
          };
          actions: {
            resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
            subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
            activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
            resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
            activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
            resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
            activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
          };
        }>;
        readonly transactions: import('direct-vuex/types/direct-types').DirectGetters<{
          namespaced: true;
          state: import('./transactions/types').TransactionsState;
          mutations: {
            setActiveTxsSubscription(
              state: import('./transactions/types').TransactionsState,
              subscription: NodeJS.Timeout | number
            ): void;
            resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
            addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
            removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
            removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
            setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
            resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
            getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
            setExternalHistory(
              state: import('./transactions/types').TransactionsState,
              history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
            ): void;
            setExternalHistoryUpdates(
              state: import('./transactions/types').TransactionsState,
              history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
            ): void;
            saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
            setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
            resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
            setExternalHistorySubscription(
              state: import('./transactions/types').TransactionsState,
              subscription: VoidFunction
            ): void;
            resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
            setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
            setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
            setSignTxDialogVisibility(
              state: import('./transactions/types').TransactionsState,
              visibility: boolean
            ): void;
            setPendingMstTxsSubscription(
              state: import('./transactions/types').TransactionsState,
              subscription: import('rxjs').Subscription | null
            ): void;
            resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
            setPendingMstTransactions(
              state: import('./transactions/types').TransactionsState,
              transactions: import('@sora-substrate/sdk').HistoryItem[]
            ): void;
          };
          actions: {
            subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
            getExternalHistory(
              context: ActionContext<any, any>,
              { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
            ): Promise<void>;
            trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
            trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
            resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
            getAccountHistory(context: ActionContext<any, any>): Promise<void>;
            resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
            resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
          };
          getters: {
            activeTxs(
              state: import('./transactions/types').TransactionsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Array<import('@sora-substrate/sdk').HistoryItem>;
            firstReadyTx(
              state: import('./transactions/types').TransactionsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            selectedTx(
              state: import('./transactions/types').TransactionsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
          };
        }>;
      };
    };
    commit: {
      wallet: {
        account: import('direct-vuex/types/direct-types').DirectMutations<{
          namespaced: true;
          state: import('./account/types').AccountState;
          mutations: {
            setFiatPriceObject(
              state: import('./account/types').AccountState,
              object: import('../services/indexer/types').FiatPriceObject
            ): void;
            updateFiatPriceObject(
              state: import('./account/types').AccountState,
              fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
            ): void;
            clearFiatPriceObject(state: import('./account/types').AccountState): void;
            setAlertSubject(
              state: import('./account/types').AccountState,
              alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
            ): void;
            resetAlertSubscription(state: import('./account/types').AccountState): void;
            setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
            resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
            setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
            resetAccount(state: import('./account/types').AccountState): void;
            setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
            resetAssetsSubscription(state: import('./account/types').AccountState): void;
            setAccountAssetsSubscription(
              state: import('./account/types').AccountState,
              subscription: import('rxjs').Subscription
            ): void;
            resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
            syncWithStorage(state: import('./account/types').AccountState): void;
            setAssets(
              state: import('./account/types').AccountState,
              assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
            ): void;
            setAccountAssets(
              state: import('./account/types').AccountState,
              accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
            ): void;
            setPinnedAsset(
              state: import('./account/types').AccountState,
              pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
            ): void;
            setMultiplePinnedAssets(
              state: import('./account/types').AccountState,
              pinnedAssetAddresses: string[]
            ): void;
            removePinnedAsset(
              state: import('./account/types').AccountState,
              pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
            ): void;
            setAssetToNotify(
              state: import('./account/types').AccountState,
              asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
            ): void;
            popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
            setWhitelist(
              state: import('./account/types').AccountState,
              whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
            ): void;
            setNftBlacklist(
              state: import('./account/types').AccountState,
              blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
            ): void;
            clearWhitelist(state: import('./account/types').AccountState): void;
            clearBlacklist(state: import('./account/types').AccountState): void;
            setAvailableWallets(
              state: import('./account/types').AccountState,
              wallets: import('../services/wallet/types').Wallet[]
            ): void;
            setAccountPassphrase(
              state: import('./account/types').AccountState,
              {
                address,
                password,
              }: {
                address: string;
                password: string;
              }
            ): void;
            resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
            setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
            setAccountPassphraseTimer(
              state: import('./account/types').AccountState,
              {
                address,
                timer,
              }: {
                address: string;
                timer: NodeJS.Timeout;
              }
            ): void;
            resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
            setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
            setAddressToBook(
              state: import('./account/types').AccountState,
              { address, name }: import('../types/common').PolkadotJsAccount
            ): void;
            removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
            setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
            setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
          };
          actions: {
            afterLogin(context: ActionContext<any, any>): Promise<void>;
            logout(context: ActionContext<any, any>): Promise<void>;
            checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
            checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
            updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
            loginAccount(
              context: ActionContext<any, any>,
              accountData: import('../types/common').PolkadotJsAccount
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
              { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
            ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
            vestedTransfer(
              context: ActionContext<any, any>,
              {
                to,
                asset,
                amount,
                vestingPercent,
                unlockPeriodInDays,
                start,
                current,
              }: import('./account/types').VestedTransferParams
            ): Promise<void>;
            resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
            resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
            resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
            resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
            initMultisigAddress(context: ActionContext<any, any>): void;
          };
          getters: {
            isLoggedIn(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): boolean;
            account(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').PolkadotJsAccount;
            assetsDataTable(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').AssetsTable;
            accountAssetsAddressTable(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').AccountAssetsTable;
            whitelist(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
            pinnedAssets(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
            isAssetPinned(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
            whitelistIdsBySymbol(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): any;
            getPassword(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): (address: string) => Nullable<string>;
            blacklist(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): any;
            isConnectedAccount(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): (account: import('../types/common').PolkadotJsAccount) => boolean;
          };
        }>;
        router: import('direct-vuex/types/direct-types').DirectMutations<{
          namespaced: true;
          state: import('./router/types').RouterState;
          mutations: {
            navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
          };
          actions: {
            back(context: ActionContext<any, any>): Promise<void>;
            checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
          };
        }>;
        settings: import('direct-vuex/types/direct-types').DirectMutations<{
          namespaced: true;
          state: import('./settings/types').SettingsState;
          mutations: {
            setIndexerType(
              state: import('./settings/types').SettingsState,
              indexerType: import('../consts').IndexerType
            ): void;
            setIndexerStatus(
              state: import('./settings/types').SettingsState,
              {
                indexer,
                status,
              }: {
                indexer: import('../consts').IndexerType;
                status: import('../types/common').ConnectionStatus;
              }
            ): void;
            setIndexerEndpoint(
              state: import('./settings/types').SettingsState,
              {
                indexer,
                endpoint,
              }: {
                indexer: import('../consts').IndexerType;
                endpoint: string;
              }
            ): void;
            setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
            setPermissions(
              state: import('./settings/types').SettingsState,
              permissions: import('../consts').WalletPermissions
            ): void;
            setSoraNetwork(
              state: import('./settings/types').SettingsState,
              value: Nullable<import('../consts').SoraNetwork>
            ): void;
            setNetworkFees(
              state: import('./settings/types').SettingsState,
              fees?: import('@sora-substrate/sdk').NetworkFeesObject
            ): void;
            updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
            toggleHideBalance(state: import('./settings/types').SettingsState): void;
            setFilterOptions(
              state: import('./settings/types').SettingsState,
              filters: import('../consts').WalletAssetFilters
            ): void;
            setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
            setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
            setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
            setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
            setBlockNumberSubscription(
              state: import('./settings/types').SettingsState,
              subscription: import('rxjs').Subscription
            ): void;
            resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
            setFeeMultiplierAndRuntimeSubscriptions(
              state: import('./settings/types').SettingsState,
              subscription: import('rxjs').Subscription
            ): void;
            resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
            setApiKeys(
              state: import('./settings/types').SettingsState,
              keys?: import('../types/common').ApiKeysObject
            ): void;
            setNftStorage(
              state: import('./settings/types').SettingsState,
              {
                marketplaceDid,
                ucan,
              }: {
                marketplaceDid?: string;
                ucan?: string;
              }
            ): void;
            setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
            addPriceAlert(
              state: import('./settings/types').SettingsState,
              alert: import('../types/common').Alert
            ): void;
            removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
            editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
            setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
            setFiatCurrency(
              state: import('./settings/types').SettingsState,
              currency?: import('../types/currency').Currency
            ): void;
            setCurrencies(
              state: import('./settings/types').SettingsState,
              currencies: import('../types/currency').CurrencyFields[]
            ): void;
            updateFiatExchangeRates(
              state: import('./settings/types').SettingsState,
              newRates?: import('../types/currency').FiatExchangeRateObject
            ): void;
            setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
            resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
            setAssetsFilter(
              state: import('./settings/types').SettingsState,
              filter: import('../types/common').FilterOptions
            ): void;
            setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
            setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
          };
          actions: {
            setApiKeys(context: ActionContext<any, any>, keys: import('../types/common').ApiKeysObject): Promise<void>;
            createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
            subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
            resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
            subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
            resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
            selectIndexer(
              context: ActionContext<any, any>,
              indexerType?: import('../consts').IndexerType
            ): Promise<void>;
            setIndexerStatus(
              context: ActionContext<any, any>,
              {
                indexer,
                status,
              }: {
                indexer: import('../consts').IndexerType;
                status: import('../types/common').ConnectionStatus;
              }
            ): Promise<void>;
            subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
            setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
            toggleTheme(context: ActionContext<any, any>): Promise<void>;
          };
          getters: {
            currencySymbol(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): string;
            exchangeRate(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): number;
            libraryTheme(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../consts').Theme;
            libraryDesignSystem(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').LibraryDesignSystem;
          };
        }>;
        subscriptions: import('direct-vuex/types/direct-types').DirectMutations<{
          namespaced: true;
          state: import('./subscriptions/types').SubscriptionsState;
          mutations: {
            setSubscription(
              state: import('./subscriptions/types').SubscriptionsState,
              newSubscription: Nullable<VoidFunction>
            ): void;
          };
          actions: {
            resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
            subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
            activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
            resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
            activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
            resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
            activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
          };
        }>;
        transactions: import('direct-vuex/types/direct-types').DirectMutations<{
          namespaced: true;
          state: import('./transactions/types').TransactionsState;
          mutations: {
            setActiveTxsSubscription(
              state: import('./transactions/types').TransactionsState,
              subscription: NodeJS.Timeout | number
            ): void;
            resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
            addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
            removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
            removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
            setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
            resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
            getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
            setExternalHistory(
              state: import('./transactions/types').TransactionsState,
              history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
            ): void;
            setExternalHistoryUpdates(
              state: import('./transactions/types').TransactionsState,
              history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
            ): void;
            saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
            setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
            resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
            setExternalHistorySubscription(
              state: import('./transactions/types').TransactionsState,
              subscription: VoidFunction
            ): void;
            resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
            setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
            setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
            setSignTxDialogVisibility(
              state: import('./transactions/types').TransactionsState,
              visibility: boolean
            ): void;
            setPendingMstTxsSubscription(
              state: import('./transactions/types').TransactionsState,
              subscription: import('rxjs').Subscription | null
            ): void;
            resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
            setPendingMstTransactions(
              state: import('./transactions/types').TransactionsState,
              transactions: import('@sora-substrate/sdk').HistoryItem[]
            ): void;
          };
          actions: {
            subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
            getExternalHistory(
              context: ActionContext<any, any>,
              { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
            ): Promise<void>;
            trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
            trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
            resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
            getAccountHistory(context: ActionContext<any, any>): Promise<void>;
            resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
            resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
          };
          getters: {
            activeTxs(
              state: import('./transactions/types').TransactionsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Array<import('@sora-substrate/sdk').HistoryItem>;
            firstReadyTx(
              state: import('./transactions/types').TransactionsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            selectedTx(
              state: import('./transactions/types').TransactionsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
          };
        }>;
      };
    };
    dispatch: {
      wallet: {
        account: import('direct-vuex/types/direct-types').DirectActions<{
          namespaced: true;
          state: import('./account/types').AccountState;
          mutations: {
            setFiatPriceObject(
              state: import('./account/types').AccountState,
              object: import('../services/indexer/types').FiatPriceObject
            ): void;
            updateFiatPriceObject(
              state: import('./account/types').AccountState,
              fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
            ): void;
            clearFiatPriceObject(state: import('./account/types').AccountState): void;
            setAlertSubject(
              state: import('./account/types').AccountState,
              alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
            ): void;
            resetAlertSubscription(state: import('./account/types').AccountState): void;
            setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
            resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
            setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
            resetAccount(state: import('./account/types').AccountState): void;
            setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
            resetAssetsSubscription(state: import('./account/types').AccountState): void;
            setAccountAssetsSubscription(
              state: import('./account/types').AccountState,
              subscription: import('rxjs').Subscription
            ): void;
            resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
            syncWithStorage(state: import('./account/types').AccountState): void;
            setAssets(
              state: import('./account/types').AccountState,
              assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
            ): void;
            setAccountAssets(
              state: import('./account/types').AccountState,
              accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
            ): void;
            setPinnedAsset(
              state: import('./account/types').AccountState,
              pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
            ): void;
            setMultiplePinnedAssets(
              state: import('./account/types').AccountState,
              pinnedAssetAddresses: string[]
            ): void;
            removePinnedAsset(
              state: import('./account/types').AccountState,
              pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
            ): void;
            setAssetToNotify(
              state: import('./account/types').AccountState,
              asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
            ): void;
            popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
            setWhitelist(
              state: import('./account/types').AccountState,
              whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
            ): void;
            setNftBlacklist(
              state: import('./account/types').AccountState,
              blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
            ): void;
            clearWhitelist(state: import('./account/types').AccountState): void;
            clearBlacklist(state: import('./account/types').AccountState): void;
            setAvailableWallets(
              state: import('./account/types').AccountState,
              wallets: import('../services/wallet/types').Wallet[]
            ): void;
            setAccountPassphrase(
              state: import('./account/types').AccountState,
              {
                address,
                password,
              }: {
                address: string;
                password: string;
              }
            ): void;
            resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
            setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
            setAccountPassphraseTimer(
              state: import('./account/types').AccountState,
              {
                address,
                timer,
              }: {
                address: string;
                timer: NodeJS.Timeout;
              }
            ): void;
            resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
            setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
            setAddressToBook(
              state: import('./account/types').AccountState,
              { address, name }: import('../types/common').PolkadotJsAccount
            ): void;
            removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
            setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
            setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
          };
          actions: {
            afterLogin(context: ActionContext<any, any>): Promise<void>;
            logout(context: ActionContext<any, any>): Promise<void>;
            checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
            checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
            updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
            loginAccount(
              context: ActionContext<any, any>,
              accountData: import('../types/common').PolkadotJsAccount
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
              { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
            ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
            vestedTransfer(
              context: ActionContext<any, any>,
              {
                to,
                asset,
                amount,
                vestingPercent,
                unlockPeriodInDays,
                start,
                current,
              }: import('./account/types').VestedTransferParams
            ): Promise<void>;
            resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
            resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
            resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
            resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
            initMultisigAddress(context: ActionContext<any, any>): void;
          };
          getters: {
            isLoggedIn(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): boolean;
            account(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').PolkadotJsAccount;
            assetsDataTable(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').AssetsTable;
            accountAssetsAddressTable(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').AccountAssetsTable;
            whitelist(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
            pinnedAssets(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
            isAssetPinned(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
            whitelistIdsBySymbol(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): any;
            getPassword(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): (address: string) => Nullable<string>;
            blacklist(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): any;
            isConnectedAccount(
              state: import('./account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): (account: import('../types/common').PolkadotJsAccount) => boolean;
          };
        }>;
        router: import('direct-vuex/types/direct-types').DirectActions<{
          namespaced: true;
          state: import('./router/types').RouterState;
          mutations: {
            navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
          };
          actions: {
            back(context: ActionContext<any, any>): Promise<void>;
            checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
          };
        }>;
        settings: import('direct-vuex/types/direct-types').DirectActions<{
          namespaced: true;
          state: import('./settings/types').SettingsState;
          mutations: {
            setIndexerType(
              state: import('./settings/types').SettingsState,
              indexerType: import('../consts').IndexerType
            ): void;
            setIndexerStatus(
              state: import('./settings/types').SettingsState,
              {
                indexer,
                status,
              }: {
                indexer: import('../consts').IndexerType;
                status: import('../types/common').ConnectionStatus;
              }
            ): void;
            setIndexerEndpoint(
              state: import('./settings/types').SettingsState,
              {
                indexer,
                endpoint,
              }: {
                indexer: import('../consts').IndexerType;
                endpoint: string;
              }
            ): void;
            setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
            setPermissions(
              state: import('./settings/types').SettingsState,
              permissions: import('../consts').WalletPermissions
            ): void;
            setSoraNetwork(
              state: import('./settings/types').SettingsState,
              value: Nullable<import('../consts').SoraNetwork>
            ): void;
            setNetworkFees(
              state: import('./settings/types').SettingsState,
              fees?: import('@sora-substrate/sdk').NetworkFeesObject
            ): void;
            updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
            toggleHideBalance(state: import('./settings/types').SettingsState): void;
            setFilterOptions(
              state: import('./settings/types').SettingsState,
              filters: import('../consts').WalletAssetFilters
            ): void;
            setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
            setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
            setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
            setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
            setBlockNumberSubscription(
              state: import('./settings/types').SettingsState,
              subscription: import('rxjs').Subscription
            ): void;
            resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
            setFeeMultiplierAndRuntimeSubscriptions(
              state: import('./settings/types').SettingsState,
              subscription: import('rxjs').Subscription
            ): void;
            resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
            setApiKeys(
              state: import('./settings/types').SettingsState,
              keys?: import('../types/common').ApiKeysObject
            ): void;
            setNftStorage(
              state: import('./settings/types').SettingsState,
              {
                marketplaceDid,
                ucan,
              }: {
                marketplaceDid?: string;
                ucan?: string;
              }
            ): void;
            setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
            addPriceAlert(
              state: import('./settings/types').SettingsState,
              alert: import('../types/common').Alert
            ): void;
            removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
            editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
            setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
            setFiatCurrency(
              state: import('./settings/types').SettingsState,
              currency?: import('../types/currency').Currency
            ): void;
            setCurrencies(
              state: import('./settings/types').SettingsState,
              currencies: import('../types/currency').CurrencyFields[]
            ): void;
            updateFiatExchangeRates(
              state: import('./settings/types').SettingsState,
              newRates?: import('../types/currency').FiatExchangeRateObject
            ): void;
            setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
            resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
            setAssetsFilter(
              state: import('./settings/types').SettingsState,
              filter: import('../types/common').FilterOptions
            ): void;
            setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
            setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
          };
          actions: {
            setApiKeys(context: ActionContext<any, any>, keys: import('../types/common').ApiKeysObject): Promise<void>;
            createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
            subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
            resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
            subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
            resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
            selectIndexer(
              context: ActionContext<any, any>,
              indexerType?: import('../consts').IndexerType
            ): Promise<void>;
            setIndexerStatus(
              context: ActionContext<any, any>,
              {
                indexer,
                status,
              }: {
                indexer: import('../consts').IndexerType;
                status: import('../types/common').ConnectionStatus;
              }
            ): Promise<void>;
            subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
            setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
            toggleTheme(context: ActionContext<any, any>): Promise<void>;
          };
          getters: {
            currencySymbol(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): string;
            exchangeRate(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): number;
            libraryTheme(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../consts').Theme;
            libraryDesignSystem(
              state: import('./settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('../types/common').LibraryDesignSystem;
          };
        }>;
        subscriptions: import('direct-vuex/types/direct-types').DirectActions<{
          namespaced: true;
          state: import('./subscriptions/types').SubscriptionsState;
          mutations: {
            setSubscription(
              state: import('./subscriptions/types').SubscriptionsState,
              newSubscription: Nullable<VoidFunction>
            ): void;
          };
          actions: {
            resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
            subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
            activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
            resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
            activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
            resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
            activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
          };
        }>;
        transactions: import('direct-vuex/types/direct-types').DirectActions<{
          namespaced: true;
          state: import('./transactions/types').TransactionsState;
          mutations: {
            setActiveTxsSubscription(
              state: import('./transactions/types').TransactionsState,
              subscription: NodeJS.Timeout | number
            ): void;
            resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
            addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
            removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
            removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
            setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
            resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
            getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
            setExternalHistory(
              state: import('./transactions/types').TransactionsState,
              history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
            ): void;
            setExternalHistoryUpdates(
              state: import('./transactions/types').TransactionsState,
              history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
            ): void;
            saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
            setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
            resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
            setExternalHistorySubscription(
              state: import('./transactions/types').TransactionsState,
              subscription: VoidFunction
            ): void;
            resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
            setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
            setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
            setSignTxDialogVisibility(
              state: import('./transactions/types').TransactionsState,
              visibility: boolean
            ): void;
            setPendingMstTxsSubscription(
              state: import('./transactions/types').TransactionsState,
              subscription: import('rxjs').Subscription | null
            ): void;
            resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
            setPendingMstTransactions(
              state: import('./transactions/types').TransactionsState,
              transactions: import('@sora-substrate/sdk').HistoryItem[]
            ): void;
          };
          actions: {
            subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
            getExternalHistory(
              context: ActionContext<any, any>,
              { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
            ): Promise<void>;
            trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
            trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
            resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
            getAccountHistory(context: ActionContext<any, any>): Promise<void>;
            resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
            resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
          };
          getters: {
            activeTxs(
              state: import('./transactions/types').TransactionsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Array<import('@sora-substrate/sdk').HistoryItem>;
            firstReadyTx(
              state: import('./transactions/types').TransactionsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            selectedTx(
              state: import('./transactions/types').TransactionsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
          };
        }>;
      };
    };
    original: import('direct-vuex/types/direct-types').VuexStore<O>;
  },
  rootActionContext: (originalContext: ActionContext<any, any>) => {
    rootState: {
      readonly wallet: import('direct-vuex/types/direct-types').DirectState<{
        namespaced: true;
        modules: {
          account: {
            namespaced: true;
            state: import('./account/types').AccountState;
            mutations: {
              setFiatPriceObject(
                state: import('./account/types').AccountState,
                object: import('../services/indexer/types').FiatPriceObject
              ): void;
              updateFiatPriceObject(
                state: import('./account/types').AccountState,
                fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
              ): void;
              clearFiatPriceObject(state: import('./account/types').AccountState): void;
              setAlertSubject(
                state: import('./account/types').AccountState,
                alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
              ): void;
              resetAlertSubscription(state: import('./account/types').AccountState): void;
              setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
              setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
              resetAccount(state: import('./account/types').AccountState): void;
              setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetAssetsSubscription(state: import('./account/types').AccountState): void;
              setAccountAssetsSubscription(
                state: import('./account/types').AccountState,
                subscription: import('rxjs').Subscription
              ): void;
              resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
              syncWithStorage(state: import('./account/types').AccountState): void;
              setAssets(
                state: import('./account/types').AccountState,
                assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
              ): void;
              setAccountAssets(
                state: import('./account/types').AccountState,
                accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
              ): void;
              setPinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setMultiplePinnedAssets(
                state: import('./account/types').AccountState,
                pinnedAssetAddresses: string[]
              ): void;
              removePinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setAssetToNotify(
                state: import('./account/types').AccountState,
                asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
              ): void;
              popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
              setWhitelist(
                state: import('./account/types').AccountState,
                whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
              ): void;
              setNftBlacklist(
                state: import('./account/types').AccountState,
                blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
              ): void;
              clearWhitelist(state: import('./account/types').AccountState): void;
              clearBlacklist(state: import('./account/types').AccountState): void;
              setAvailableWallets(
                state: import('./account/types').AccountState,
                wallets: import('../services/wallet/types').Wallet[]
              ): void;
              setAccountPassphrase(
                state: import('./account/types').AccountState,
                {
                  address,
                  password,
                }: {
                  address: string;
                  password: string;
                }
              ): void;
              resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
              setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
              setAccountPassphraseTimer(
                state: import('./account/types').AccountState,
                {
                  address,
                  timer,
                }: {
                  address: string;
                  timer: NodeJS.Timeout;
                }
              ): void;
              resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
              setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
              setAddressToBook(
                state: import('./account/types').AccountState,
                { address, name }: import('../types/common').PolkadotJsAccount
              ): void;
              removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
              setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
              setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
            };
            actions: {
              afterLogin(context: ActionContext<any, any>): Promise<void>;
              logout(context: ActionContext<any, any>): Promise<void>;
              checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
              checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
              updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
              loginAccount(
                context: ActionContext<any, any>,
                accountData: import('../types/common').PolkadotJsAccount
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
                { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
              ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
              vestedTransfer(
                context: ActionContext<any, any>,
                {
                  to,
                  asset,
                  amount,
                  vestingPercent,
                  unlockPeriodInDays,
                  start,
                  current,
                }: import('./account/types').VestedTransferParams
              ): Promise<void>;
              resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
              initMultisigAddress(context: ActionContext<any, any>): void;
            };
            getters: {
              isLoggedIn(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): boolean;
              account(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').PolkadotJsAccount;
              assetsDataTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AssetsTable;
              accountAssetsAddressTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AccountAssetsTable;
              whitelist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
              pinnedAssets(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
              isAssetPinned(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
              whitelistIdsBySymbol(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              getPassword(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (address: string) => Nullable<string>;
              blacklist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              isConnectedAccount(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (account: import('../types/common').PolkadotJsAccount) => boolean;
            };
          };
          router: {
            namespaced: true;
            state: import('./router/types').RouterState;
            mutations: {
              navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
            };
            actions: {
              back(context: ActionContext<any, any>): Promise<void>;
              checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
            };
          };
          settings: {
            namespaced: true;
            state: import('./settings/types').SettingsState;
            mutations: {
              setIndexerType(
                state: import('./settings/types').SettingsState,
                indexerType: import('../consts').IndexerType
              ): void;
              setIndexerStatus(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): void;
              setIndexerEndpoint(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  endpoint,
                }: {
                  indexer: import('../consts').IndexerType;
                  endpoint: string;
                }
              ): void;
              setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
              setPermissions(
                state: import('./settings/types').SettingsState,
                permissions: import('../consts').WalletPermissions
              ): void;
              setSoraNetwork(
                state: import('./settings/types').SettingsState,
                value: Nullable<import('../consts').SoraNetwork>
              ): void;
              setNetworkFees(
                state: import('./settings/types').SettingsState,
                fees?: import('@sora-substrate/sdk').NetworkFeesObject
              ): void;
              updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
              toggleHideBalance(state: import('./settings/types').SettingsState): void;
              setFilterOptions(
                state: import('./settings/types').SettingsState,
                filters: import('../consts').WalletAssetFilters
              ): void;
              setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
              setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
              setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
              setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
              setBlockNumberSubscription(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
              setFeeMultiplierAndRuntimeSubscriptions(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
              setApiKeys(
                state: import('./settings/types').SettingsState,
                keys?: import('../types/common').ApiKeysObject
              ): void;
              setNftStorage(
                state: import('./settings/types').SettingsState,
                {
                  marketplaceDid,
                  ucan,
                }: {
                  marketplaceDid?: string;
                  ucan?: string;
                }
              ): void;
              setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
              addPriceAlert(
                state: import('./settings/types').SettingsState,
                alert: import('../types/common').Alert
              ): void;
              removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
              editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
              setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
              setFiatCurrency(
                state: import('./settings/types').SettingsState,
                currency?: import('../types/currency').Currency
              ): void;
              setCurrencies(
                state: import('./settings/types').SettingsState,
                currencies: import('../types/currency').CurrencyFields[]
              ): void;
              updateFiatExchangeRates(
                state: import('./settings/types').SettingsState,
                newRates?: import('../types/currency').FiatExchangeRateObject
              ): void;
              setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
              resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
              setAssetsFilter(
                state: import('./settings/types').SettingsState,
                filter: import('../types/common').FilterOptions
              ): void;
              setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
              setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
            };
            actions: {
              setApiKeys(
                context: ActionContext<any, any>,
                keys: import('../types/common').ApiKeysObject
              ): Promise<void>;
              createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
              subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
              resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
              subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
              resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
              selectIndexer(
                context: ActionContext<any, any>,
                indexerType?: import('../consts').IndexerType
              ): Promise<void>;
              setIndexerStatus(
                context: ActionContext<any, any>,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): Promise<void>;
              subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
              setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
              toggleTheme(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              currencySymbol(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): string;
              exchangeRate(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): number;
              libraryTheme(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../consts').Theme;
              libraryDesignSystem(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').LibraryDesignSystem;
            };
          };
          subscriptions: {
            namespaced: true;
            state: import('./subscriptions/types').SubscriptionsState;
            mutations: {
              setSubscription(
                state: import('./subscriptions/types').SubscriptionsState,
                newSubscription: Nullable<VoidFunction>
              ): void;
            };
            actions: {
              resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
              subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
              activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            };
          };
          transactions: {
            namespaced: true;
            state: import('./transactions/types').TransactionsState;
            mutations: {
              setActiveTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: NodeJS.Timeout | number
              ): void;
              resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
              addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
              removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
              resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
              getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
              setExternalHistory(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              setExternalHistoryUpdates(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
              resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
              setExternalHistorySubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: VoidFunction
              ): void;
              resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
              setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogVisibility(
                state: import('./transactions/types').TransactionsState,
                visibility: boolean
              ): void;
              setPendingMstTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: import('rxjs').Subscription | null
              ): void;
              resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
              setPendingMstTransactions(
                state: import('./transactions/types').TransactionsState,
                transactions: import('@sora-substrate/sdk').HistoryItem[]
              ): void;
            };
            actions: {
              subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
              getExternalHistory(
                context: ActionContext<any, any>,
                { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
              ): Promise<void>;
              trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
              trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
              resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
              getAccountHistory(context: ActionContext<any, any>): Promise<void>;
              resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
              resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              activeTxs(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk').HistoryItem>;
              firstReadyTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
              selectedTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            };
          };
        };
      }>;
    };
    rootGetters: {
      readonly wallet: import('direct-vuex/types/direct-types').DirectGetters<{
        namespaced: true;
        modules: {
          account: {
            namespaced: true;
            state: import('./account/types').AccountState;
            mutations: {
              setFiatPriceObject(
                state: import('./account/types').AccountState,
                object: import('../services/indexer/types').FiatPriceObject
              ): void;
              updateFiatPriceObject(
                state: import('./account/types').AccountState,
                fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
              ): void;
              clearFiatPriceObject(state: import('./account/types').AccountState): void;
              setAlertSubject(
                state: import('./account/types').AccountState,
                alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
              ): void;
              resetAlertSubscription(state: import('./account/types').AccountState): void;
              setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
              setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
              resetAccount(state: import('./account/types').AccountState): void;
              setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetAssetsSubscription(state: import('./account/types').AccountState): void;
              setAccountAssetsSubscription(
                state: import('./account/types').AccountState,
                subscription: import('rxjs').Subscription
              ): void;
              resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
              syncWithStorage(state: import('./account/types').AccountState): void;
              setAssets(
                state: import('./account/types').AccountState,
                assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
              ): void;
              setAccountAssets(
                state: import('./account/types').AccountState,
                accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
              ): void;
              setPinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setMultiplePinnedAssets(
                state: import('./account/types').AccountState,
                pinnedAssetAddresses: string[]
              ): void;
              removePinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setAssetToNotify(
                state: import('./account/types').AccountState,
                asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
              ): void;
              popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
              setWhitelist(
                state: import('./account/types').AccountState,
                whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
              ): void;
              setNftBlacklist(
                state: import('./account/types').AccountState,
                blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
              ): void;
              clearWhitelist(state: import('./account/types').AccountState): void;
              clearBlacklist(state: import('./account/types').AccountState): void;
              setAvailableWallets(
                state: import('./account/types').AccountState,
                wallets: import('../services/wallet/types').Wallet[]
              ): void;
              setAccountPassphrase(
                state: import('./account/types').AccountState,
                {
                  address,
                  password,
                }: {
                  address: string;
                  password: string;
                }
              ): void;
              resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
              setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
              setAccountPassphraseTimer(
                state: import('./account/types').AccountState,
                {
                  address,
                  timer,
                }: {
                  address: string;
                  timer: NodeJS.Timeout;
                }
              ): void;
              resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
              setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
              setAddressToBook(
                state: import('./account/types').AccountState,
                { address, name }: import('../types/common').PolkadotJsAccount
              ): void;
              removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
              setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
              setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
            };
            actions: {
              afterLogin(context: ActionContext<any, any>): Promise<void>;
              logout(context: ActionContext<any, any>): Promise<void>;
              checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
              checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
              updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
              loginAccount(
                context: ActionContext<any, any>,
                accountData: import('../types/common').PolkadotJsAccount
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
                { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
              ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
              vestedTransfer(
                context: ActionContext<any, any>,
                {
                  to,
                  asset,
                  amount,
                  vestingPercent,
                  unlockPeriodInDays,
                  start,
                  current,
                }: import('./account/types').VestedTransferParams
              ): Promise<void>;
              resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
              initMultisigAddress(context: ActionContext<any, any>): void;
            };
            getters: {
              isLoggedIn(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): boolean;
              account(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').PolkadotJsAccount;
              assetsDataTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AssetsTable;
              accountAssetsAddressTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AccountAssetsTable;
              whitelist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
              pinnedAssets(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
              isAssetPinned(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
              whitelistIdsBySymbol(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              getPassword(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (address: string) => Nullable<string>;
              blacklist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              isConnectedAccount(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (account: import('../types/common').PolkadotJsAccount) => boolean;
            };
          };
          router: {
            namespaced: true;
            state: import('./router/types').RouterState;
            mutations: {
              navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
            };
            actions: {
              back(context: ActionContext<any, any>): Promise<void>;
              checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
            };
          };
          settings: {
            namespaced: true;
            state: import('./settings/types').SettingsState;
            mutations: {
              setIndexerType(
                state: import('./settings/types').SettingsState,
                indexerType: import('../consts').IndexerType
              ): void;
              setIndexerStatus(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): void;
              setIndexerEndpoint(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  endpoint,
                }: {
                  indexer: import('../consts').IndexerType;
                  endpoint: string;
                }
              ): void;
              setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
              setPermissions(
                state: import('./settings/types').SettingsState,
                permissions: import('../consts').WalletPermissions
              ): void;
              setSoraNetwork(
                state: import('./settings/types').SettingsState,
                value: Nullable<import('../consts').SoraNetwork>
              ): void;
              setNetworkFees(
                state: import('./settings/types').SettingsState,
                fees?: import('@sora-substrate/sdk').NetworkFeesObject
              ): void;
              updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
              toggleHideBalance(state: import('./settings/types').SettingsState): void;
              setFilterOptions(
                state: import('./settings/types').SettingsState,
                filters: import('../consts').WalletAssetFilters
              ): void;
              setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
              setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
              setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
              setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
              setBlockNumberSubscription(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
              setFeeMultiplierAndRuntimeSubscriptions(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
              setApiKeys(
                state: import('./settings/types').SettingsState,
                keys?: import('../types/common').ApiKeysObject
              ): void;
              setNftStorage(
                state: import('./settings/types').SettingsState,
                {
                  marketplaceDid,
                  ucan,
                }: {
                  marketplaceDid?: string;
                  ucan?: string;
                }
              ): void;
              setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
              addPriceAlert(
                state: import('./settings/types').SettingsState,
                alert: import('../types/common').Alert
              ): void;
              removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
              editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
              setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
              setFiatCurrency(
                state: import('./settings/types').SettingsState,
                currency?: import('../types/currency').Currency
              ): void;
              setCurrencies(
                state: import('./settings/types').SettingsState,
                currencies: import('../types/currency').CurrencyFields[]
              ): void;
              updateFiatExchangeRates(
                state: import('./settings/types').SettingsState,
                newRates?: import('../types/currency').FiatExchangeRateObject
              ): void;
              setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
              resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
              setAssetsFilter(
                state: import('./settings/types').SettingsState,
                filter: import('../types/common').FilterOptions
              ): void;
              setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
              setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
            };
            actions: {
              setApiKeys(
                context: ActionContext<any, any>,
                keys: import('../types/common').ApiKeysObject
              ): Promise<void>;
              createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
              subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
              resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
              subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
              resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
              selectIndexer(
                context: ActionContext<any, any>,
                indexerType?: import('../consts').IndexerType
              ): Promise<void>;
              setIndexerStatus(
                context: ActionContext<any, any>,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): Promise<void>;
              subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
              setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
              toggleTheme(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              currencySymbol(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): string;
              exchangeRate(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): number;
              libraryTheme(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../consts').Theme;
              libraryDesignSystem(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').LibraryDesignSystem;
            };
          };
          subscriptions: {
            namespaced: true;
            state: import('./subscriptions/types').SubscriptionsState;
            mutations: {
              setSubscription(
                state: import('./subscriptions/types').SubscriptionsState,
                newSubscription: Nullable<VoidFunction>
              ): void;
            };
            actions: {
              resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
              subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
              activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            };
          };
          transactions: {
            namespaced: true;
            state: import('./transactions/types').TransactionsState;
            mutations: {
              setActiveTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: NodeJS.Timeout | number
              ): void;
              resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
              addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
              removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
              resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
              getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
              setExternalHistory(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              setExternalHistoryUpdates(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
              resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
              setExternalHistorySubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: VoidFunction
              ): void;
              resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
              setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogVisibility(
                state: import('./transactions/types').TransactionsState,
                visibility: boolean
              ): void;
              setPendingMstTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: import('rxjs').Subscription | null
              ): void;
              resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
              setPendingMstTransactions(
                state: import('./transactions/types').TransactionsState,
                transactions: import('@sora-substrate/sdk').HistoryItem[]
              ): void;
            };
            actions: {
              subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
              getExternalHistory(
                context: ActionContext<any, any>,
                { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
              ): Promise<void>;
              trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
              trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
              resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
              getAccountHistory(context: ActionContext<any, any>): Promise<void>;
              resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
              resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              activeTxs(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk').HistoryItem>;
              firstReadyTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
              selectedTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            };
          };
        };
      }>;
    };
    rootCommit: {
      wallet: import('direct-vuex/types/direct-types').DirectMutations<{
        namespaced: true;
        modules: {
          account: {
            namespaced: true;
            state: import('./account/types').AccountState;
            mutations: {
              setFiatPriceObject(
                state: import('./account/types').AccountState,
                object: import('../services/indexer/types').FiatPriceObject
              ): void;
              updateFiatPriceObject(
                state: import('./account/types').AccountState,
                fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
              ): void;
              clearFiatPriceObject(state: import('./account/types').AccountState): void;
              setAlertSubject(
                state: import('./account/types').AccountState,
                alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
              ): void;
              resetAlertSubscription(state: import('./account/types').AccountState): void;
              setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
              setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
              resetAccount(state: import('./account/types').AccountState): void;
              setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetAssetsSubscription(state: import('./account/types').AccountState): void;
              setAccountAssetsSubscription(
                state: import('./account/types').AccountState,
                subscription: import('rxjs').Subscription
              ): void;
              resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
              syncWithStorage(state: import('./account/types').AccountState): void;
              setAssets(
                state: import('./account/types').AccountState,
                assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
              ): void;
              setAccountAssets(
                state: import('./account/types').AccountState,
                accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
              ): void;
              setPinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setMultiplePinnedAssets(
                state: import('./account/types').AccountState,
                pinnedAssetAddresses: string[]
              ): void;
              removePinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setAssetToNotify(
                state: import('./account/types').AccountState,
                asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
              ): void;
              popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
              setWhitelist(
                state: import('./account/types').AccountState,
                whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
              ): void;
              setNftBlacklist(
                state: import('./account/types').AccountState,
                blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
              ): void;
              clearWhitelist(state: import('./account/types').AccountState): void;
              clearBlacklist(state: import('./account/types').AccountState): void;
              setAvailableWallets(
                state: import('./account/types').AccountState,
                wallets: import('../services/wallet/types').Wallet[]
              ): void;
              setAccountPassphrase(
                state: import('./account/types').AccountState,
                {
                  address,
                  password,
                }: {
                  address: string;
                  password: string;
                }
              ): void;
              resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
              setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
              setAccountPassphraseTimer(
                state: import('./account/types').AccountState,
                {
                  address,
                  timer,
                }: {
                  address: string;
                  timer: NodeJS.Timeout;
                }
              ): void;
              resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
              setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
              setAddressToBook(
                state: import('./account/types').AccountState,
                { address, name }: import('../types/common').PolkadotJsAccount
              ): void;
              removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
              setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
              setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
            };
            actions: {
              afterLogin(context: ActionContext<any, any>): Promise<void>;
              logout(context: ActionContext<any, any>): Promise<void>;
              checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
              checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
              updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
              loginAccount(
                context: ActionContext<any, any>,
                accountData: import('../types/common').PolkadotJsAccount
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
                { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
              ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
              vestedTransfer(
                context: ActionContext<any, any>,
                {
                  to,
                  asset,
                  amount,
                  vestingPercent,
                  unlockPeriodInDays,
                  start,
                  current,
                }: import('./account/types').VestedTransferParams
              ): Promise<void>;
              resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
              initMultisigAddress(context: ActionContext<any, any>): void;
            };
            getters: {
              isLoggedIn(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): boolean;
              account(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').PolkadotJsAccount;
              assetsDataTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AssetsTable;
              accountAssetsAddressTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AccountAssetsTable;
              whitelist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
              pinnedAssets(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
              isAssetPinned(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
              whitelistIdsBySymbol(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              getPassword(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (address: string) => Nullable<string>;
              blacklist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              isConnectedAccount(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (account: import('../types/common').PolkadotJsAccount) => boolean;
            };
          };
          router: {
            namespaced: true;
            state: import('./router/types').RouterState;
            mutations: {
              navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
            };
            actions: {
              back(context: ActionContext<any, any>): Promise<void>;
              checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
            };
          };
          settings: {
            namespaced: true;
            state: import('./settings/types').SettingsState;
            mutations: {
              setIndexerType(
                state: import('./settings/types').SettingsState,
                indexerType: import('../consts').IndexerType
              ): void;
              setIndexerStatus(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): void;
              setIndexerEndpoint(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  endpoint,
                }: {
                  indexer: import('../consts').IndexerType;
                  endpoint: string;
                }
              ): void;
              setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
              setPermissions(
                state: import('./settings/types').SettingsState,
                permissions: import('../consts').WalletPermissions
              ): void;
              setSoraNetwork(
                state: import('./settings/types').SettingsState,
                value: Nullable<import('../consts').SoraNetwork>
              ): void;
              setNetworkFees(
                state: import('./settings/types').SettingsState,
                fees?: import('@sora-substrate/sdk').NetworkFeesObject
              ): void;
              updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
              toggleHideBalance(state: import('./settings/types').SettingsState): void;
              setFilterOptions(
                state: import('./settings/types').SettingsState,
                filters: import('../consts').WalletAssetFilters
              ): void;
              setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
              setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
              setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
              setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
              setBlockNumberSubscription(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
              setFeeMultiplierAndRuntimeSubscriptions(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
              setApiKeys(
                state: import('./settings/types').SettingsState,
                keys?: import('../types/common').ApiKeysObject
              ): void;
              setNftStorage(
                state: import('./settings/types').SettingsState,
                {
                  marketplaceDid,
                  ucan,
                }: {
                  marketplaceDid?: string;
                  ucan?: string;
                }
              ): void;
              setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
              addPriceAlert(
                state: import('./settings/types').SettingsState,
                alert: import('../types/common').Alert
              ): void;
              removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
              editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
              setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
              setFiatCurrency(
                state: import('./settings/types').SettingsState,
                currency?: import('../types/currency').Currency
              ): void;
              setCurrencies(
                state: import('./settings/types').SettingsState,
                currencies: import('../types/currency').CurrencyFields[]
              ): void;
              updateFiatExchangeRates(
                state: import('./settings/types').SettingsState,
                newRates?: import('../types/currency').FiatExchangeRateObject
              ): void;
              setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
              resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
              setAssetsFilter(
                state: import('./settings/types').SettingsState,
                filter: import('../types/common').FilterOptions
              ): void;
              setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
              setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
            };
            actions: {
              setApiKeys(
                context: ActionContext<any, any>,
                keys: import('../types/common').ApiKeysObject
              ): Promise<void>;
              createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
              subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
              resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
              subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
              resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
              selectIndexer(
                context: ActionContext<any, any>,
                indexerType?: import('../consts').IndexerType
              ): Promise<void>;
              setIndexerStatus(
                context: ActionContext<any, any>,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): Promise<void>;
              subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
              setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
              toggleTheme(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              currencySymbol(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): string;
              exchangeRate(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): number;
              libraryTheme(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../consts').Theme;
              libraryDesignSystem(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').LibraryDesignSystem;
            };
          };
          subscriptions: {
            namespaced: true;
            state: import('./subscriptions/types').SubscriptionsState;
            mutations: {
              setSubscription(
                state: import('./subscriptions/types').SubscriptionsState,
                newSubscription: Nullable<VoidFunction>
              ): void;
            };
            actions: {
              resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
              subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
              activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            };
          };
          transactions: {
            namespaced: true;
            state: import('./transactions/types').TransactionsState;
            mutations: {
              setActiveTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: NodeJS.Timeout | number
              ): void;
              resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
              addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
              removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
              resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
              getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
              setExternalHistory(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              setExternalHistoryUpdates(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
              resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
              setExternalHistorySubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: VoidFunction
              ): void;
              resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
              setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogVisibility(
                state: import('./transactions/types').TransactionsState,
                visibility: boolean
              ): void;
              setPendingMstTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: import('rxjs').Subscription | null
              ): void;
              resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
              setPendingMstTransactions(
                state: import('./transactions/types').TransactionsState,
                transactions: import('@sora-substrate/sdk').HistoryItem[]
              ): void;
            };
            actions: {
              subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
              getExternalHistory(
                context: ActionContext<any, any>,
                { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
              ): Promise<void>;
              trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
              trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
              resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
              getAccountHistory(context: ActionContext<any, any>): Promise<void>;
              resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
              resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              activeTxs(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk').HistoryItem>;
              firstReadyTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
              selectedTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            };
          };
        };
      }>;
    };
    rootDispatch: {
      wallet: import('direct-vuex/types/direct-types').DirectActions<{
        namespaced: true;
        modules: {
          account: {
            namespaced: true;
            state: import('./account/types').AccountState;
            mutations: {
              setFiatPriceObject(
                state: import('./account/types').AccountState,
                object: import('../services/indexer/types').FiatPriceObject
              ): void;
              updateFiatPriceObject(
                state: import('./account/types').AccountState,
                fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
              ): void;
              clearFiatPriceObject(state: import('./account/types').AccountState): void;
              setAlertSubject(
                state: import('./account/types').AccountState,
                alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
              ): void;
              resetAlertSubscription(state: import('./account/types').AccountState): void;
              setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
              setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
              resetAccount(state: import('./account/types').AccountState): void;
              setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetAssetsSubscription(state: import('./account/types').AccountState): void;
              setAccountAssetsSubscription(
                state: import('./account/types').AccountState,
                subscription: import('rxjs').Subscription
              ): void;
              resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
              syncWithStorage(state: import('./account/types').AccountState): void;
              setAssets(
                state: import('./account/types').AccountState,
                assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
              ): void;
              setAccountAssets(
                state: import('./account/types').AccountState,
                accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
              ): void;
              setPinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setMultiplePinnedAssets(
                state: import('./account/types').AccountState,
                pinnedAssetAddresses: string[]
              ): void;
              removePinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setAssetToNotify(
                state: import('./account/types').AccountState,
                asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
              ): void;
              popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
              setWhitelist(
                state: import('./account/types').AccountState,
                whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
              ): void;
              setNftBlacklist(
                state: import('./account/types').AccountState,
                blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
              ): void;
              clearWhitelist(state: import('./account/types').AccountState): void;
              clearBlacklist(state: import('./account/types').AccountState): void;
              setAvailableWallets(
                state: import('./account/types').AccountState,
                wallets: import('../services/wallet/types').Wallet[]
              ): void;
              setAccountPassphrase(
                state: import('./account/types').AccountState,
                {
                  address,
                  password,
                }: {
                  address: string;
                  password: string;
                }
              ): void;
              resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
              setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
              setAccountPassphraseTimer(
                state: import('./account/types').AccountState,
                {
                  address,
                  timer,
                }: {
                  address: string;
                  timer: NodeJS.Timeout;
                }
              ): void;
              resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
              setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
              setAddressToBook(
                state: import('./account/types').AccountState,
                { address, name }: import('../types/common').PolkadotJsAccount
              ): void;
              removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
              setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
              setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
            };
            actions: {
              afterLogin(context: ActionContext<any, any>): Promise<void>;
              logout(context: ActionContext<any, any>): Promise<void>;
              checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
              checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
              updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
              loginAccount(
                context: ActionContext<any, any>,
                accountData: import('../types/common').PolkadotJsAccount
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
                { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
              ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
              vestedTransfer(
                context: ActionContext<any, any>,
                {
                  to,
                  asset,
                  amount,
                  vestingPercent,
                  unlockPeriodInDays,
                  start,
                  current,
                }: import('./account/types').VestedTransferParams
              ): Promise<void>;
              resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
              initMultisigAddress(context: ActionContext<any, any>): void;
            };
            getters: {
              isLoggedIn(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): boolean;
              account(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').PolkadotJsAccount;
              assetsDataTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AssetsTable;
              accountAssetsAddressTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AccountAssetsTable;
              whitelist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
              pinnedAssets(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
              isAssetPinned(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
              whitelistIdsBySymbol(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              getPassword(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (address: string) => Nullable<string>;
              blacklist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              isConnectedAccount(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (account: import('../types/common').PolkadotJsAccount) => boolean;
            };
          };
          router: {
            namespaced: true;
            state: import('./router/types').RouterState;
            mutations: {
              navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
            };
            actions: {
              back(context: ActionContext<any, any>): Promise<void>;
              checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
            };
          };
          settings: {
            namespaced: true;
            state: import('./settings/types').SettingsState;
            mutations: {
              setIndexerType(
                state: import('./settings/types').SettingsState,
                indexerType: import('../consts').IndexerType
              ): void;
              setIndexerStatus(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): void;
              setIndexerEndpoint(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  endpoint,
                }: {
                  indexer: import('../consts').IndexerType;
                  endpoint: string;
                }
              ): void;
              setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
              setPermissions(
                state: import('./settings/types').SettingsState,
                permissions: import('../consts').WalletPermissions
              ): void;
              setSoraNetwork(
                state: import('./settings/types').SettingsState,
                value: Nullable<import('../consts').SoraNetwork>
              ): void;
              setNetworkFees(
                state: import('./settings/types').SettingsState,
                fees?: import('@sora-substrate/sdk').NetworkFeesObject
              ): void;
              updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
              toggleHideBalance(state: import('./settings/types').SettingsState): void;
              setFilterOptions(
                state: import('./settings/types').SettingsState,
                filters: import('../consts').WalletAssetFilters
              ): void;
              setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
              setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
              setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
              setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
              setBlockNumberSubscription(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
              setFeeMultiplierAndRuntimeSubscriptions(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
              setApiKeys(
                state: import('./settings/types').SettingsState,
                keys?: import('../types/common').ApiKeysObject
              ): void;
              setNftStorage(
                state: import('./settings/types').SettingsState,
                {
                  marketplaceDid,
                  ucan,
                }: {
                  marketplaceDid?: string;
                  ucan?: string;
                }
              ): void;
              setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
              addPriceAlert(
                state: import('./settings/types').SettingsState,
                alert: import('../types/common').Alert
              ): void;
              removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
              editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
              setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
              setFiatCurrency(
                state: import('./settings/types').SettingsState,
                currency?: import('../types/currency').Currency
              ): void;
              setCurrencies(
                state: import('./settings/types').SettingsState,
                currencies: import('../types/currency').CurrencyFields[]
              ): void;
              updateFiatExchangeRates(
                state: import('./settings/types').SettingsState,
                newRates?: import('../types/currency').FiatExchangeRateObject
              ): void;
              setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
              resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
              setAssetsFilter(
                state: import('./settings/types').SettingsState,
                filter: import('../types/common').FilterOptions
              ): void;
              setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
              setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
            };
            actions: {
              setApiKeys(
                context: ActionContext<any, any>,
                keys: import('../types/common').ApiKeysObject
              ): Promise<void>;
              createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
              subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
              resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
              subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
              resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
              selectIndexer(
                context: ActionContext<any, any>,
                indexerType?: import('../consts').IndexerType
              ): Promise<void>;
              setIndexerStatus(
                context: ActionContext<any, any>,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): Promise<void>;
              subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
              setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
              toggleTheme(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              currencySymbol(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): string;
              exchangeRate(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): number;
              libraryTheme(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../consts').Theme;
              libraryDesignSystem(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').LibraryDesignSystem;
            };
          };
          subscriptions: {
            namespaced: true;
            state: import('./subscriptions/types').SubscriptionsState;
            mutations: {
              setSubscription(
                state: import('./subscriptions/types').SubscriptionsState,
                newSubscription: Nullable<VoidFunction>
              ): void;
            };
            actions: {
              resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
              subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
              activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            };
          };
          transactions: {
            namespaced: true;
            state: import('./transactions/types').TransactionsState;
            mutations: {
              setActiveTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: NodeJS.Timeout | number
              ): void;
              resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
              addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
              removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
              resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
              getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
              setExternalHistory(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              setExternalHistoryUpdates(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
              resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
              setExternalHistorySubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: VoidFunction
              ): void;
              resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
              setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogVisibility(
                state: import('./transactions/types').TransactionsState,
                visibility: boolean
              ): void;
              setPendingMstTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: import('rxjs').Subscription | null
              ): void;
              resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
              setPendingMstTransactions(
                state: import('./transactions/types').TransactionsState,
                transactions: import('@sora-substrate/sdk').HistoryItem[]
              ): void;
            };
            actions: {
              subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
              getExternalHistory(
                context: ActionContext<any, any>,
                { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
              ): Promise<void>;
              trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
              trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
              resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
              getAccountHistory(context: ActionContext<any, any>): Promise<void>;
              resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
              resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              activeTxs(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk').HistoryItem>;
              firstReadyTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
              selectedTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            };
          };
        };
      }>;
    };
    state: {
      readonly wallet: import('direct-vuex/types/direct-types').DirectState<{
        namespaced: true;
        modules: {
          account: {
            namespaced: true;
            state: import('./account/types').AccountState;
            mutations: {
              setFiatPriceObject(
                state: import('./account/types').AccountState,
                object: import('../services/indexer/types').FiatPriceObject
              ): void;
              updateFiatPriceObject(
                state: import('./account/types').AccountState,
                fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
              ): void;
              clearFiatPriceObject(state: import('./account/types').AccountState): void;
              setAlertSubject(
                state: import('./account/types').AccountState,
                alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
              ): void;
              resetAlertSubscription(state: import('./account/types').AccountState): void;
              setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
              setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
              resetAccount(state: import('./account/types').AccountState): void;
              setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetAssetsSubscription(state: import('./account/types').AccountState): void;
              setAccountAssetsSubscription(
                state: import('./account/types').AccountState,
                subscription: import('rxjs').Subscription
              ): void;
              resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
              syncWithStorage(state: import('./account/types').AccountState): void;
              setAssets(
                state: import('./account/types').AccountState,
                assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
              ): void;
              setAccountAssets(
                state: import('./account/types').AccountState,
                accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
              ): void;
              setPinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setMultiplePinnedAssets(
                state: import('./account/types').AccountState,
                pinnedAssetAddresses: string[]
              ): void;
              removePinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setAssetToNotify(
                state: import('./account/types').AccountState,
                asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
              ): void;
              popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
              setWhitelist(
                state: import('./account/types').AccountState,
                whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
              ): void;
              setNftBlacklist(
                state: import('./account/types').AccountState,
                blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
              ): void;
              clearWhitelist(state: import('./account/types').AccountState): void;
              clearBlacklist(state: import('./account/types').AccountState): void;
              setAvailableWallets(
                state: import('./account/types').AccountState,
                wallets: import('../services/wallet/types').Wallet[]
              ): void;
              setAccountPassphrase(
                state: import('./account/types').AccountState,
                {
                  address,
                  password,
                }: {
                  address: string;
                  password: string;
                }
              ): void;
              resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
              setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
              setAccountPassphraseTimer(
                state: import('./account/types').AccountState,
                {
                  address,
                  timer,
                }: {
                  address: string;
                  timer: NodeJS.Timeout;
                }
              ): void;
              resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
              setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
              setAddressToBook(
                state: import('./account/types').AccountState,
                { address, name }: import('../types/common').PolkadotJsAccount
              ): void;
              removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
              setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
              setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
            };
            actions: {
              afterLogin(context: ActionContext<any, any>): Promise<void>;
              logout(context: ActionContext<any, any>): Promise<void>;
              checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
              checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
              updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
              loginAccount(
                context: ActionContext<any, any>,
                accountData: import('../types/common').PolkadotJsAccount
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
                { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
              ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
              vestedTransfer(
                context: ActionContext<any, any>,
                {
                  to,
                  asset,
                  amount,
                  vestingPercent,
                  unlockPeriodInDays,
                  start,
                  current,
                }: import('./account/types').VestedTransferParams
              ): Promise<void>;
              resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
              initMultisigAddress(context: ActionContext<any, any>): void;
            };
            getters: {
              isLoggedIn(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): boolean;
              account(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').PolkadotJsAccount;
              assetsDataTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AssetsTable;
              accountAssetsAddressTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AccountAssetsTable;
              whitelist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
              pinnedAssets(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
              isAssetPinned(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
              whitelistIdsBySymbol(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              getPassword(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (address: string) => Nullable<string>;
              blacklist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              isConnectedAccount(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (account: import('../types/common').PolkadotJsAccount) => boolean;
            };
          };
          router: {
            namespaced: true;
            state: import('./router/types').RouterState;
            mutations: {
              navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
            };
            actions: {
              back(context: ActionContext<any, any>): Promise<void>;
              checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
            };
          };
          settings: {
            namespaced: true;
            state: import('./settings/types').SettingsState;
            mutations: {
              setIndexerType(
                state: import('./settings/types').SettingsState,
                indexerType: import('../consts').IndexerType
              ): void;
              setIndexerStatus(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): void;
              setIndexerEndpoint(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  endpoint,
                }: {
                  indexer: import('../consts').IndexerType;
                  endpoint: string;
                }
              ): void;
              setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
              setPermissions(
                state: import('./settings/types').SettingsState,
                permissions: import('../consts').WalletPermissions
              ): void;
              setSoraNetwork(
                state: import('./settings/types').SettingsState,
                value: Nullable<import('../consts').SoraNetwork>
              ): void;
              setNetworkFees(
                state: import('./settings/types').SettingsState,
                fees?: import('@sora-substrate/sdk').NetworkFeesObject
              ): void;
              updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
              toggleHideBalance(state: import('./settings/types').SettingsState): void;
              setFilterOptions(
                state: import('./settings/types').SettingsState,
                filters: import('../consts').WalletAssetFilters
              ): void;
              setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
              setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
              setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
              setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
              setBlockNumberSubscription(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
              setFeeMultiplierAndRuntimeSubscriptions(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
              setApiKeys(
                state: import('./settings/types').SettingsState,
                keys?: import('../types/common').ApiKeysObject
              ): void;
              setNftStorage(
                state: import('./settings/types').SettingsState,
                {
                  marketplaceDid,
                  ucan,
                }: {
                  marketplaceDid?: string;
                  ucan?: string;
                }
              ): void;
              setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
              addPriceAlert(
                state: import('./settings/types').SettingsState,
                alert: import('../types/common').Alert
              ): void;
              removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
              editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
              setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
              setFiatCurrency(
                state: import('./settings/types').SettingsState,
                currency?: import('../types/currency').Currency
              ): void;
              setCurrencies(
                state: import('./settings/types').SettingsState,
                currencies: import('../types/currency').CurrencyFields[]
              ): void;
              updateFiatExchangeRates(
                state: import('./settings/types').SettingsState,
                newRates?: import('../types/currency').FiatExchangeRateObject
              ): void;
              setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
              resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
              setAssetsFilter(
                state: import('./settings/types').SettingsState,
                filter: import('../types/common').FilterOptions
              ): void;
              setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
              setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
            };
            actions: {
              setApiKeys(
                context: ActionContext<any, any>,
                keys: import('../types/common').ApiKeysObject
              ): Promise<void>;
              createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
              subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
              resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
              subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
              resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
              selectIndexer(
                context: ActionContext<any, any>,
                indexerType?: import('../consts').IndexerType
              ): Promise<void>;
              setIndexerStatus(
                context: ActionContext<any, any>,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): Promise<void>;
              subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
              setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
              toggleTheme(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              currencySymbol(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): string;
              exchangeRate(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): number;
              libraryTheme(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../consts').Theme;
              libraryDesignSystem(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').LibraryDesignSystem;
            };
          };
          subscriptions: {
            namespaced: true;
            state: import('./subscriptions/types').SubscriptionsState;
            mutations: {
              setSubscription(
                state: import('./subscriptions/types').SubscriptionsState,
                newSubscription: Nullable<VoidFunction>
              ): void;
            };
            actions: {
              resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
              subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
              activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            };
          };
          transactions: {
            namespaced: true;
            state: import('./transactions/types').TransactionsState;
            mutations: {
              setActiveTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: NodeJS.Timeout | number
              ): void;
              resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
              addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
              removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
              resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
              getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
              setExternalHistory(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              setExternalHistoryUpdates(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
              resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
              setExternalHistorySubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: VoidFunction
              ): void;
              resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
              setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogVisibility(
                state: import('./transactions/types').TransactionsState,
                visibility: boolean
              ): void;
              setPendingMstTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: import('rxjs').Subscription | null
              ): void;
              resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
              setPendingMstTransactions(
                state: import('./transactions/types').TransactionsState,
                transactions: import('@sora-substrate/sdk').HistoryItem[]
              ): void;
            };
            actions: {
              subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
              getExternalHistory(
                context: ActionContext<any, any>,
                { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
              ): Promise<void>;
              trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
              trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
              resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
              getAccountHistory(context: ActionContext<any, any>): Promise<void>;
              resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
              resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              activeTxs(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk').HistoryItem>;
              firstReadyTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
              selectedTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            };
          };
        };
      }>;
    };
    getters: {
      readonly wallet: import('direct-vuex/types/direct-types').DirectGetters<{
        namespaced: true;
        modules: {
          account: {
            namespaced: true;
            state: import('./account/types').AccountState;
            mutations: {
              setFiatPriceObject(
                state: import('./account/types').AccountState,
                object: import('../services/indexer/types').FiatPriceObject
              ): void;
              updateFiatPriceObject(
                state: import('./account/types').AccountState,
                fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
              ): void;
              clearFiatPriceObject(state: import('./account/types').AccountState): void;
              setAlertSubject(
                state: import('./account/types').AccountState,
                alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
              ): void;
              resetAlertSubscription(state: import('./account/types').AccountState): void;
              setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
              setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
              resetAccount(state: import('./account/types').AccountState): void;
              setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetAssetsSubscription(state: import('./account/types').AccountState): void;
              setAccountAssetsSubscription(
                state: import('./account/types').AccountState,
                subscription: import('rxjs').Subscription
              ): void;
              resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
              syncWithStorage(state: import('./account/types').AccountState): void;
              setAssets(
                state: import('./account/types').AccountState,
                assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
              ): void;
              setAccountAssets(
                state: import('./account/types').AccountState,
                accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
              ): void;
              setPinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setMultiplePinnedAssets(
                state: import('./account/types').AccountState,
                pinnedAssetAddresses: string[]
              ): void;
              removePinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setAssetToNotify(
                state: import('./account/types').AccountState,
                asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
              ): void;
              popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
              setWhitelist(
                state: import('./account/types').AccountState,
                whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
              ): void;
              setNftBlacklist(
                state: import('./account/types').AccountState,
                blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
              ): void;
              clearWhitelist(state: import('./account/types').AccountState): void;
              clearBlacklist(state: import('./account/types').AccountState): void;
              setAvailableWallets(
                state: import('./account/types').AccountState,
                wallets: import('../services/wallet/types').Wallet[]
              ): void;
              setAccountPassphrase(
                state: import('./account/types').AccountState,
                {
                  address,
                  password,
                }: {
                  address: string;
                  password: string;
                }
              ): void;
              resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
              setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
              setAccountPassphraseTimer(
                state: import('./account/types').AccountState,
                {
                  address,
                  timer,
                }: {
                  address: string;
                  timer: NodeJS.Timeout;
                }
              ): void;
              resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
              setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
              setAddressToBook(
                state: import('./account/types').AccountState,
                { address, name }: import('../types/common').PolkadotJsAccount
              ): void;
              removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
              setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
              setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
            };
            actions: {
              afterLogin(context: ActionContext<any, any>): Promise<void>;
              logout(context: ActionContext<any, any>): Promise<void>;
              checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
              checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
              updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
              loginAccount(
                context: ActionContext<any, any>,
                accountData: import('../types/common').PolkadotJsAccount
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
                { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
              ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
              vestedTransfer(
                context: ActionContext<any, any>,
                {
                  to,
                  asset,
                  amount,
                  vestingPercent,
                  unlockPeriodInDays,
                  start,
                  current,
                }: import('./account/types').VestedTransferParams
              ): Promise<void>;
              resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
              initMultisigAddress(context: ActionContext<any, any>): void;
            };
            getters: {
              isLoggedIn(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): boolean;
              account(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').PolkadotJsAccount;
              assetsDataTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AssetsTable;
              accountAssetsAddressTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AccountAssetsTable;
              whitelist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
              pinnedAssets(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
              isAssetPinned(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
              whitelistIdsBySymbol(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              getPassword(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (address: string) => Nullable<string>;
              blacklist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              isConnectedAccount(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (account: import('../types/common').PolkadotJsAccount) => boolean;
            };
          };
          router: {
            namespaced: true;
            state: import('./router/types').RouterState;
            mutations: {
              navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
            };
            actions: {
              back(context: ActionContext<any, any>): Promise<void>;
              checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
            };
          };
          settings: {
            namespaced: true;
            state: import('./settings/types').SettingsState;
            mutations: {
              setIndexerType(
                state: import('./settings/types').SettingsState,
                indexerType: import('../consts').IndexerType
              ): void;
              setIndexerStatus(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): void;
              setIndexerEndpoint(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  endpoint,
                }: {
                  indexer: import('../consts').IndexerType;
                  endpoint: string;
                }
              ): void;
              setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
              setPermissions(
                state: import('./settings/types').SettingsState,
                permissions: import('../consts').WalletPermissions
              ): void;
              setSoraNetwork(
                state: import('./settings/types').SettingsState,
                value: Nullable<import('../consts').SoraNetwork>
              ): void;
              setNetworkFees(
                state: import('./settings/types').SettingsState,
                fees?: import('@sora-substrate/sdk').NetworkFeesObject
              ): void;
              updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
              toggleHideBalance(state: import('./settings/types').SettingsState): void;
              setFilterOptions(
                state: import('./settings/types').SettingsState,
                filters: import('../consts').WalletAssetFilters
              ): void;
              setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
              setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
              setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
              setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
              setBlockNumberSubscription(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
              setFeeMultiplierAndRuntimeSubscriptions(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
              setApiKeys(
                state: import('./settings/types').SettingsState,
                keys?: import('../types/common').ApiKeysObject
              ): void;
              setNftStorage(
                state: import('./settings/types').SettingsState,
                {
                  marketplaceDid,
                  ucan,
                }: {
                  marketplaceDid?: string;
                  ucan?: string;
                }
              ): void;
              setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
              addPriceAlert(
                state: import('./settings/types').SettingsState,
                alert: import('../types/common').Alert
              ): void;
              removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
              editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
              setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
              setFiatCurrency(
                state: import('./settings/types').SettingsState,
                currency?: import('../types/currency').Currency
              ): void;
              setCurrencies(
                state: import('./settings/types').SettingsState,
                currencies: import('../types/currency').CurrencyFields[]
              ): void;
              updateFiatExchangeRates(
                state: import('./settings/types').SettingsState,
                newRates?: import('../types/currency').FiatExchangeRateObject
              ): void;
              setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
              resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
              setAssetsFilter(
                state: import('./settings/types').SettingsState,
                filter: import('../types/common').FilterOptions
              ): void;
              setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
              setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
            };
            actions: {
              setApiKeys(
                context: ActionContext<any, any>,
                keys: import('../types/common').ApiKeysObject
              ): Promise<void>;
              createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
              subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
              resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
              subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
              resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
              selectIndexer(
                context: ActionContext<any, any>,
                indexerType?: import('../consts').IndexerType
              ): Promise<void>;
              setIndexerStatus(
                context: ActionContext<any, any>,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): Promise<void>;
              subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
              setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
              toggleTheme(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              currencySymbol(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): string;
              exchangeRate(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): number;
              libraryTheme(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../consts').Theme;
              libraryDesignSystem(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').LibraryDesignSystem;
            };
          };
          subscriptions: {
            namespaced: true;
            state: import('./subscriptions/types').SubscriptionsState;
            mutations: {
              setSubscription(
                state: import('./subscriptions/types').SubscriptionsState,
                newSubscription: Nullable<VoidFunction>
              ): void;
            };
            actions: {
              resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
              subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
              activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            };
          };
          transactions: {
            namespaced: true;
            state: import('./transactions/types').TransactionsState;
            mutations: {
              setActiveTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: NodeJS.Timeout | number
              ): void;
              resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
              addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
              removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
              resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
              getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
              setExternalHistory(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              setExternalHistoryUpdates(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
              resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
              setExternalHistorySubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: VoidFunction
              ): void;
              resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
              setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogVisibility(
                state: import('./transactions/types').TransactionsState,
                visibility: boolean
              ): void;
              setPendingMstTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: import('rxjs').Subscription | null
              ): void;
              resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
              setPendingMstTransactions(
                state: import('./transactions/types').TransactionsState,
                transactions: import('@sora-substrate/sdk').HistoryItem[]
              ): void;
            };
            actions: {
              subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
              getExternalHistory(
                context: ActionContext<any, any>,
                { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
              ): Promise<void>;
              trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
              trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
              resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
              getAccountHistory(context: ActionContext<any, any>): Promise<void>;
              resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
              resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              activeTxs(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk').HistoryItem>;
              firstReadyTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
              selectedTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            };
          };
        };
      }>;
    };
    commit: {
      wallet: import('direct-vuex/types/direct-types').DirectMutations<{
        namespaced: true;
        modules: {
          account: {
            namespaced: true;
            state: import('./account/types').AccountState;
            mutations: {
              setFiatPriceObject(
                state: import('./account/types').AccountState,
                object: import('../services/indexer/types').FiatPriceObject
              ): void;
              updateFiatPriceObject(
                state: import('./account/types').AccountState,
                fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
              ): void;
              clearFiatPriceObject(state: import('./account/types').AccountState): void;
              setAlertSubject(
                state: import('./account/types').AccountState,
                alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
              ): void;
              resetAlertSubscription(state: import('./account/types').AccountState): void;
              setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
              setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
              resetAccount(state: import('./account/types').AccountState): void;
              setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetAssetsSubscription(state: import('./account/types').AccountState): void;
              setAccountAssetsSubscription(
                state: import('./account/types').AccountState,
                subscription: import('rxjs').Subscription
              ): void;
              resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
              syncWithStorage(state: import('./account/types').AccountState): void;
              setAssets(
                state: import('./account/types').AccountState,
                assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
              ): void;
              setAccountAssets(
                state: import('./account/types').AccountState,
                accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
              ): void;
              setPinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setMultiplePinnedAssets(
                state: import('./account/types').AccountState,
                pinnedAssetAddresses: string[]
              ): void;
              removePinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setAssetToNotify(
                state: import('./account/types').AccountState,
                asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
              ): void;
              popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
              setWhitelist(
                state: import('./account/types').AccountState,
                whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
              ): void;
              setNftBlacklist(
                state: import('./account/types').AccountState,
                blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
              ): void;
              clearWhitelist(state: import('./account/types').AccountState): void;
              clearBlacklist(state: import('./account/types').AccountState): void;
              setAvailableWallets(
                state: import('./account/types').AccountState,
                wallets: import('../services/wallet/types').Wallet[]
              ): void;
              setAccountPassphrase(
                state: import('./account/types').AccountState,
                {
                  address,
                  password,
                }: {
                  address: string;
                  password: string;
                }
              ): void;
              resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
              setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
              setAccountPassphraseTimer(
                state: import('./account/types').AccountState,
                {
                  address,
                  timer,
                }: {
                  address: string;
                  timer: NodeJS.Timeout;
                }
              ): void;
              resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
              setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
              setAddressToBook(
                state: import('./account/types').AccountState,
                { address, name }: import('../types/common').PolkadotJsAccount
              ): void;
              removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
              setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
              setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
            };
            actions: {
              afterLogin(context: ActionContext<any, any>): Promise<void>;
              logout(context: ActionContext<any, any>): Promise<void>;
              checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
              checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
              updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
              loginAccount(
                context: ActionContext<any, any>,
                accountData: import('../types/common').PolkadotJsAccount
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
                { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
              ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
              vestedTransfer(
                context: ActionContext<any, any>,
                {
                  to,
                  asset,
                  amount,
                  vestingPercent,
                  unlockPeriodInDays,
                  start,
                  current,
                }: import('./account/types').VestedTransferParams
              ): Promise<void>;
              resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
              initMultisigAddress(context: ActionContext<any, any>): void;
            };
            getters: {
              isLoggedIn(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): boolean;
              account(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').PolkadotJsAccount;
              assetsDataTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AssetsTable;
              accountAssetsAddressTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AccountAssetsTable;
              whitelist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
              pinnedAssets(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
              isAssetPinned(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
              whitelistIdsBySymbol(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              getPassword(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (address: string) => Nullable<string>;
              blacklist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              isConnectedAccount(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (account: import('../types/common').PolkadotJsAccount) => boolean;
            };
          };
          router: {
            namespaced: true;
            state: import('./router/types').RouterState;
            mutations: {
              navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
            };
            actions: {
              back(context: ActionContext<any, any>): Promise<void>;
              checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
            };
          };
          settings: {
            namespaced: true;
            state: import('./settings/types').SettingsState;
            mutations: {
              setIndexerType(
                state: import('./settings/types').SettingsState,
                indexerType: import('../consts').IndexerType
              ): void;
              setIndexerStatus(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): void;
              setIndexerEndpoint(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  endpoint,
                }: {
                  indexer: import('../consts').IndexerType;
                  endpoint: string;
                }
              ): void;
              setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
              setPermissions(
                state: import('./settings/types').SettingsState,
                permissions: import('../consts').WalletPermissions
              ): void;
              setSoraNetwork(
                state: import('./settings/types').SettingsState,
                value: Nullable<import('../consts').SoraNetwork>
              ): void;
              setNetworkFees(
                state: import('./settings/types').SettingsState,
                fees?: import('@sora-substrate/sdk').NetworkFeesObject
              ): void;
              updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
              toggleHideBalance(state: import('./settings/types').SettingsState): void;
              setFilterOptions(
                state: import('./settings/types').SettingsState,
                filters: import('../consts').WalletAssetFilters
              ): void;
              setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
              setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
              setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
              setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
              setBlockNumberSubscription(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
              setFeeMultiplierAndRuntimeSubscriptions(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
              setApiKeys(
                state: import('./settings/types').SettingsState,
                keys?: import('../types/common').ApiKeysObject
              ): void;
              setNftStorage(
                state: import('./settings/types').SettingsState,
                {
                  marketplaceDid,
                  ucan,
                }: {
                  marketplaceDid?: string;
                  ucan?: string;
                }
              ): void;
              setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
              addPriceAlert(
                state: import('./settings/types').SettingsState,
                alert: import('../types/common').Alert
              ): void;
              removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
              editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
              setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
              setFiatCurrency(
                state: import('./settings/types').SettingsState,
                currency?: import('../types/currency').Currency
              ): void;
              setCurrencies(
                state: import('./settings/types').SettingsState,
                currencies: import('../types/currency').CurrencyFields[]
              ): void;
              updateFiatExchangeRates(
                state: import('./settings/types').SettingsState,
                newRates?: import('../types/currency').FiatExchangeRateObject
              ): void;
              setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
              resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
              setAssetsFilter(
                state: import('./settings/types').SettingsState,
                filter: import('../types/common').FilterOptions
              ): void;
              setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
              setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
            };
            actions: {
              setApiKeys(
                context: ActionContext<any, any>,
                keys: import('../types/common').ApiKeysObject
              ): Promise<void>;
              createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
              subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
              resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
              subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
              resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
              selectIndexer(
                context: ActionContext<any, any>,
                indexerType?: import('../consts').IndexerType
              ): Promise<void>;
              setIndexerStatus(
                context: ActionContext<any, any>,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): Promise<void>;
              subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
              setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
              toggleTheme(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              currencySymbol(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): string;
              exchangeRate(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): number;
              libraryTheme(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../consts').Theme;
              libraryDesignSystem(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').LibraryDesignSystem;
            };
          };
          subscriptions: {
            namespaced: true;
            state: import('./subscriptions/types').SubscriptionsState;
            mutations: {
              setSubscription(
                state: import('./subscriptions/types').SubscriptionsState,
                newSubscription: Nullable<VoidFunction>
              ): void;
            };
            actions: {
              resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
              subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
              activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            };
          };
          transactions: {
            namespaced: true;
            state: import('./transactions/types').TransactionsState;
            mutations: {
              setActiveTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: NodeJS.Timeout | number
              ): void;
              resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
              addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
              removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
              resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
              getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
              setExternalHistory(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              setExternalHistoryUpdates(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
              resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
              setExternalHistorySubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: VoidFunction
              ): void;
              resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
              setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogVisibility(
                state: import('./transactions/types').TransactionsState,
                visibility: boolean
              ): void;
              setPendingMstTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: import('rxjs').Subscription | null
              ): void;
              resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
              setPendingMstTransactions(
                state: import('./transactions/types').TransactionsState,
                transactions: import('@sora-substrate/sdk').HistoryItem[]
              ): void;
            };
            actions: {
              subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
              getExternalHistory(
                context: ActionContext<any, any>,
                { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
              ): Promise<void>;
              trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
              trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
              resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
              getAccountHistory(context: ActionContext<any, any>): Promise<void>;
              resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
              resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              activeTxs(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk').HistoryItem>;
              firstReadyTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
              selectedTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            };
          };
        };
      }>;
    };
    dispatch: {
      wallet: import('direct-vuex/types/direct-types').DirectActions<{
        namespaced: true;
        modules: {
          account: {
            namespaced: true;
            state: import('./account/types').AccountState;
            mutations: {
              setFiatPriceObject(
                state: import('./account/types').AccountState,
                object: import('../services/indexer/types').FiatPriceObject
              ): void;
              updateFiatPriceObject(
                state: import('./account/types').AccountState,
                fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
              ): void;
              clearFiatPriceObject(state: import('./account/types').AccountState): void;
              setAlertSubject(
                state: import('./account/types').AccountState,
                alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
              ): void;
              resetAlertSubscription(state: import('./account/types').AccountState): void;
              setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
              setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
              resetAccount(state: import('./account/types').AccountState): void;
              setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetAssetsSubscription(state: import('./account/types').AccountState): void;
              setAccountAssetsSubscription(
                state: import('./account/types').AccountState,
                subscription: import('rxjs').Subscription
              ): void;
              resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
              syncWithStorage(state: import('./account/types').AccountState): void;
              setAssets(
                state: import('./account/types').AccountState,
                assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
              ): void;
              setAccountAssets(
                state: import('./account/types').AccountState,
                accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
              ): void;
              setPinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setMultiplePinnedAssets(
                state: import('./account/types').AccountState,
                pinnedAssetAddresses: string[]
              ): void;
              removePinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setAssetToNotify(
                state: import('./account/types').AccountState,
                asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
              ): void;
              popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
              setWhitelist(
                state: import('./account/types').AccountState,
                whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
              ): void;
              setNftBlacklist(
                state: import('./account/types').AccountState,
                blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
              ): void;
              clearWhitelist(state: import('./account/types').AccountState): void;
              clearBlacklist(state: import('./account/types').AccountState): void;
              setAvailableWallets(
                state: import('./account/types').AccountState,
                wallets: import('../services/wallet/types').Wallet[]
              ): void;
              setAccountPassphrase(
                state: import('./account/types').AccountState,
                {
                  address,
                  password,
                }: {
                  address: string;
                  password: string;
                }
              ): void;
              resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
              setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
              setAccountPassphraseTimer(
                state: import('./account/types').AccountState,
                {
                  address,
                  timer,
                }: {
                  address: string;
                  timer: NodeJS.Timeout;
                }
              ): void;
              resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
              setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
              setAddressToBook(
                state: import('./account/types').AccountState,
                { address, name }: import('../types/common').PolkadotJsAccount
              ): void;
              removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
              setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
              setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
            };
            actions: {
              afterLogin(context: ActionContext<any, any>): Promise<void>;
              logout(context: ActionContext<any, any>): Promise<void>;
              checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
              checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
              updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
              loginAccount(
                context: ActionContext<any, any>,
                accountData: import('../types/common').PolkadotJsAccount
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
                { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
              ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
              vestedTransfer(
                context: ActionContext<any, any>,
                {
                  to,
                  asset,
                  amount,
                  vestingPercent,
                  unlockPeriodInDays,
                  start,
                  current,
                }: import('./account/types').VestedTransferParams
              ): Promise<void>;
              resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
              initMultisigAddress(context: ActionContext<any, any>): void;
            };
            getters: {
              isLoggedIn(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): boolean;
              account(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').PolkadotJsAccount;
              assetsDataTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AssetsTable;
              accountAssetsAddressTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AccountAssetsTable;
              whitelist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
              pinnedAssets(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
              isAssetPinned(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
              whitelistIdsBySymbol(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              getPassword(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (address: string) => Nullable<string>;
              blacklist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              isConnectedAccount(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (account: import('../types/common').PolkadotJsAccount) => boolean;
            };
          };
          router: {
            namespaced: true;
            state: import('./router/types').RouterState;
            mutations: {
              navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
            };
            actions: {
              back(context: ActionContext<any, any>): Promise<void>;
              checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
            };
          };
          settings: {
            namespaced: true;
            state: import('./settings/types').SettingsState;
            mutations: {
              setIndexerType(
                state: import('./settings/types').SettingsState,
                indexerType: import('../consts').IndexerType
              ): void;
              setIndexerStatus(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): void;
              setIndexerEndpoint(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  endpoint,
                }: {
                  indexer: import('../consts').IndexerType;
                  endpoint: string;
                }
              ): void;
              setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
              setPermissions(
                state: import('./settings/types').SettingsState,
                permissions: import('../consts').WalletPermissions
              ): void;
              setSoraNetwork(
                state: import('./settings/types').SettingsState,
                value: Nullable<import('../consts').SoraNetwork>
              ): void;
              setNetworkFees(
                state: import('./settings/types').SettingsState,
                fees?: import('@sora-substrate/sdk').NetworkFeesObject
              ): void;
              updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
              toggleHideBalance(state: import('./settings/types').SettingsState): void;
              setFilterOptions(
                state: import('./settings/types').SettingsState,
                filters: import('../consts').WalletAssetFilters
              ): void;
              setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
              setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
              setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
              setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
              setBlockNumberSubscription(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
              setFeeMultiplierAndRuntimeSubscriptions(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
              setApiKeys(
                state: import('./settings/types').SettingsState,
                keys?: import('../types/common').ApiKeysObject
              ): void;
              setNftStorage(
                state: import('./settings/types').SettingsState,
                {
                  marketplaceDid,
                  ucan,
                }: {
                  marketplaceDid?: string;
                  ucan?: string;
                }
              ): void;
              setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
              addPriceAlert(
                state: import('./settings/types').SettingsState,
                alert: import('../types/common').Alert
              ): void;
              removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
              editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
              setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
              setFiatCurrency(
                state: import('./settings/types').SettingsState,
                currency?: import('../types/currency').Currency
              ): void;
              setCurrencies(
                state: import('./settings/types').SettingsState,
                currencies: import('../types/currency').CurrencyFields[]
              ): void;
              updateFiatExchangeRates(
                state: import('./settings/types').SettingsState,
                newRates?: import('../types/currency').FiatExchangeRateObject
              ): void;
              setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
              resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
              setAssetsFilter(
                state: import('./settings/types').SettingsState,
                filter: import('../types/common').FilterOptions
              ): void;
              setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
              setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
            };
            actions: {
              setApiKeys(
                context: ActionContext<any, any>,
                keys: import('../types/common').ApiKeysObject
              ): Promise<void>;
              createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
              subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
              resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
              subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
              resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
              selectIndexer(
                context: ActionContext<any, any>,
                indexerType?: import('../consts').IndexerType
              ): Promise<void>;
              setIndexerStatus(
                context: ActionContext<any, any>,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): Promise<void>;
              subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
              setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
              toggleTheme(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              currencySymbol(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): string;
              exchangeRate(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): number;
              libraryTheme(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../consts').Theme;
              libraryDesignSystem(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').LibraryDesignSystem;
            };
          };
          subscriptions: {
            namespaced: true;
            state: import('./subscriptions/types').SubscriptionsState;
            mutations: {
              setSubscription(
                state: import('./subscriptions/types').SubscriptionsState,
                newSubscription: Nullable<VoidFunction>
              ): void;
            };
            actions: {
              resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
              subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
              activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            };
          };
          transactions: {
            namespaced: true;
            state: import('./transactions/types').TransactionsState;
            mutations: {
              setActiveTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: NodeJS.Timeout | number
              ): void;
              resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
              addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
              removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
              resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
              getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
              setExternalHistory(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              setExternalHistoryUpdates(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
              resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
              setExternalHistorySubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: VoidFunction
              ): void;
              resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
              setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogVisibility(
                state: import('./transactions/types').TransactionsState,
                visibility: boolean
              ): void;
              setPendingMstTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: import('rxjs').Subscription | null
              ): void;
              resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
              setPendingMstTransactions(
                state: import('./transactions/types').TransactionsState,
                transactions: import('@sora-substrate/sdk').HistoryItem[]
              ): void;
            };
            actions: {
              subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
              getExternalHistory(
                context: ActionContext<any, any>,
                { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
              ): Promise<void>;
              trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
              trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
              resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
              getAccountHistory(context: ActionContext<any, any>): Promise<void>;
              resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
              resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              activeTxs(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk').HistoryItem>;
              firstReadyTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
              selectedTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            };
          };
        };
      }>;
    };
  },
  rootGetterContext: (args: [any, any]) => {
    rootState: {
      readonly wallet: import('direct-vuex/types/direct-types').DirectState<{
        namespaced: true;
        modules: {
          account: {
            namespaced: true;
            state: import('./account/types').AccountState;
            mutations: {
              setFiatPriceObject(
                state: import('./account/types').AccountState,
                object: import('../services/indexer/types').FiatPriceObject
              ): void;
              updateFiatPriceObject(
                state: import('./account/types').AccountState,
                fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
              ): void;
              clearFiatPriceObject(state: import('./account/types').AccountState): void;
              setAlertSubject(
                state: import('./account/types').AccountState,
                alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
              ): void;
              resetAlertSubscription(state: import('./account/types').AccountState): void;
              setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
              setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
              resetAccount(state: import('./account/types').AccountState): void;
              setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetAssetsSubscription(state: import('./account/types').AccountState): void;
              setAccountAssetsSubscription(
                state: import('./account/types').AccountState,
                subscription: import('rxjs').Subscription
              ): void;
              resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
              syncWithStorage(state: import('./account/types').AccountState): void;
              setAssets(
                state: import('./account/types').AccountState,
                assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
              ): void;
              setAccountAssets(
                state: import('./account/types').AccountState,
                accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
              ): void;
              setPinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setMultiplePinnedAssets(
                state: import('./account/types').AccountState,
                pinnedAssetAddresses: string[]
              ): void;
              removePinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setAssetToNotify(
                state: import('./account/types').AccountState,
                asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
              ): void;
              popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
              setWhitelist(
                state: import('./account/types').AccountState,
                whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
              ): void;
              setNftBlacklist(
                state: import('./account/types').AccountState,
                blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
              ): void;
              clearWhitelist(state: import('./account/types').AccountState): void;
              clearBlacklist(state: import('./account/types').AccountState): void;
              setAvailableWallets(
                state: import('./account/types').AccountState,
                wallets: import('../services/wallet/types').Wallet[]
              ): void;
              setAccountPassphrase(
                state: import('./account/types').AccountState,
                {
                  address,
                  password,
                }: {
                  address: string;
                  password: string;
                }
              ): void;
              resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
              setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
              setAccountPassphraseTimer(
                state: import('./account/types').AccountState,
                {
                  address,
                  timer,
                }: {
                  address: string;
                  timer: NodeJS.Timeout;
                }
              ): void;
              resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
              setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
              setAddressToBook(
                state: import('./account/types').AccountState,
                { address, name }: import('../types/common').PolkadotJsAccount
              ): void;
              removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
              setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
              setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
            };
            actions: {
              afterLogin(context: ActionContext<any, any>): Promise<void>;
              logout(context: ActionContext<any, any>): Promise<void>;
              checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
              checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
              updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
              loginAccount(
                context: ActionContext<any, any>,
                accountData: import('../types/common').PolkadotJsAccount
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
                { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
              ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
              vestedTransfer(
                context: ActionContext<any, any>,
                {
                  to,
                  asset,
                  amount,
                  vestingPercent,
                  unlockPeriodInDays,
                  start,
                  current,
                }: import('./account/types').VestedTransferParams
              ): Promise<void>;
              resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
              initMultisigAddress(context: ActionContext<any, any>): void;
            };
            getters: {
              isLoggedIn(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): boolean;
              account(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').PolkadotJsAccount;
              assetsDataTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AssetsTable;
              accountAssetsAddressTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AccountAssetsTable;
              whitelist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
              pinnedAssets(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
              isAssetPinned(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
              whitelistIdsBySymbol(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              getPassword(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (address: string) => Nullable<string>;
              blacklist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              isConnectedAccount(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (account: import('../types/common').PolkadotJsAccount) => boolean;
            };
          };
          router: {
            namespaced: true;
            state: import('./router/types').RouterState;
            mutations: {
              navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
            };
            actions: {
              back(context: ActionContext<any, any>): Promise<void>;
              checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
            };
          };
          settings: {
            namespaced: true;
            state: import('./settings/types').SettingsState;
            mutations: {
              setIndexerType(
                state: import('./settings/types').SettingsState,
                indexerType: import('../consts').IndexerType
              ): void;
              setIndexerStatus(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): void;
              setIndexerEndpoint(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  endpoint,
                }: {
                  indexer: import('../consts').IndexerType;
                  endpoint: string;
                }
              ): void;
              setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
              setPermissions(
                state: import('./settings/types').SettingsState,
                permissions: import('../consts').WalletPermissions
              ): void;
              setSoraNetwork(
                state: import('./settings/types').SettingsState,
                value: Nullable<import('../consts').SoraNetwork>
              ): void;
              setNetworkFees(
                state: import('./settings/types').SettingsState,
                fees?: import('@sora-substrate/sdk').NetworkFeesObject
              ): void;
              updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
              toggleHideBalance(state: import('./settings/types').SettingsState): void;
              setFilterOptions(
                state: import('./settings/types').SettingsState,
                filters: import('../consts').WalletAssetFilters
              ): void;
              setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
              setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
              setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
              setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
              setBlockNumberSubscription(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
              setFeeMultiplierAndRuntimeSubscriptions(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
              setApiKeys(
                state: import('./settings/types').SettingsState,
                keys?: import('../types/common').ApiKeysObject
              ): void;
              setNftStorage(
                state: import('./settings/types').SettingsState,
                {
                  marketplaceDid,
                  ucan,
                }: {
                  marketplaceDid?: string;
                  ucan?: string;
                }
              ): void;
              setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
              addPriceAlert(
                state: import('./settings/types').SettingsState,
                alert: import('../types/common').Alert
              ): void;
              removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
              editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
              setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
              setFiatCurrency(
                state: import('./settings/types').SettingsState,
                currency?: import('../types/currency').Currency
              ): void;
              setCurrencies(
                state: import('./settings/types').SettingsState,
                currencies: import('../types/currency').CurrencyFields[]
              ): void;
              updateFiatExchangeRates(
                state: import('./settings/types').SettingsState,
                newRates?: import('../types/currency').FiatExchangeRateObject
              ): void;
              setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
              resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
              setAssetsFilter(
                state: import('./settings/types').SettingsState,
                filter: import('../types/common').FilterOptions
              ): void;
              setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
              setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
            };
            actions: {
              setApiKeys(
                context: ActionContext<any, any>,
                keys: import('../types/common').ApiKeysObject
              ): Promise<void>;
              createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
              subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
              resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
              subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
              resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
              selectIndexer(
                context: ActionContext<any, any>,
                indexerType?: import('../consts').IndexerType
              ): Promise<void>;
              setIndexerStatus(
                context: ActionContext<any, any>,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): Promise<void>;
              subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
              setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
              toggleTheme(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              currencySymbol(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): string;
              exchangeRate(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): number;
              libraryTheme(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../consts').Theme;
              libraryDesignSystem(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').LibraryDesignSystem;
            };
          };
          subscriptions: {
            namespaced: true;
            state: import('./subscriptions/types').SubscriptionsState;
            mutations: {
              setSubscription(
                state: import('./subscriptions/types').SubscriptionsState,
                newSubscription: Nullable<VoidFunction>
              ): void;
            };
            actions: {
              resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
              subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
              activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            };
          };
          transactions: {
            namespaced: true;
            state: import('./transactions/types').TransactionsState;
            mutations: {
              setActiveTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: NodeJS.Timeout | number
              ): void;
              resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
              addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
              removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
              resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
              getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
              setExternalHistory(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              setExternalHistoryUpdates(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
              resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
              setExternalHistorySubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: VoidFunction
              ): void;
              resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
              setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogVisibility(
                state: import('./transactions/types').TransactionsState,
                visibility: boolean
              ): void;
              setPendingMstTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: import('rxjs').Subscription | null
              ): void;
              resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
              setPendingMstTransactions(
                state: import('./transactions/types').TransactionsState,
                transactions: import('@sora-substrate/sdk').HistoryItem[]
              ): void;
            };
            actions: {
              subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
              getExternalHistory(
                context: ActionContext<any, any>,
                { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
              ): Promise<void>;
              trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
              trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
              resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
              getAccountHistory(context: ActionContext<any, any>): Promise<void>;
              resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
              resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              activeTxs(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk').HistoryItem>;
              firstReadyTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
              selectedTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            };
          };
        };
      }>;
    };
    rootGetters: {
      readonly wallet: import('direct-vuex/types/direct-types').DirectGetters<{
        namespaced: true;
        modules: {
          account: {
            namespaced: true;
            state: import('./account/types').AccountState;
            mutations: {
              setFiatPriceObject(
                state: import('./account/types').AccountState,
                object: import('../services/indexer/types').FiatPriceObject
              ): void;
              updateFiatPriceObject(
                state: import('./account/types').AccountState,
                fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
              ): void;
              clearFiatPriceObject(state: import('./account/types').AccountState): void;
              setAlertSubject(
                state: import('./account/types').AccountState,
                alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
              ): void;
              resetAlertSubscription(state: import('./account/types').AccountState): void;
              setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
              setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
              resetAccount(state: import('./account/types').AccountState): void;
              setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetAssetsSubscription(state: import('./account/types').AccountState): void;
              setAccountAssetsSubscription(
                state: import('./account/types').AccountState,
                subscription: import('rxjs').Subscription
              ): void;
              resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
              syncWithStorage(state: import('./account/types').AccountState): void;
              setAssets(
                state: import('./account/types').AccountState,
                assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
              ): void;
              setAccountAssets(
                state: import('./account/types').AccountState,
                accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
              ): void;
              setPinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setMultiplePinnedAssets(
                state: import('./account/types').AccountState,
                pinnedAssetAddresses: string[]
              ): void;
              removePinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setAssetToNotify(
                state: import('./account/types').AccountState,
                asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
              ): void;
              popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
              setWhitelist(
                state: import('./account/types').AccountState,
                whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
              ): void;
              setNftBlacklist(
                state: import('./account/types').AccountState,
                blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
              ): void;
              clearWhitelist(state: import('./account/types').AccountState): void;
              clearBlacklist(state: import('./account/types').AccountState): void;
              setAvailableWallets(
                state: import('./account/types').AccountState,
                wallets: import('../services/wallet/types').Wallet[]
              ): void;
              setAccountPassphrase(
                state: import('./account/types').AccountState,
                {
                  address,
                  password,
                }: {
                  address: string;
                  password: string;
                }
              ): void;
              resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
              setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
              setAccountPassphraseTimer(
                state: import('./account/types').AccountState,
                {
                  address,
                  timer,
                }: {
                  address: string;
                  timer: NodeJS.Timeout;
                }
              ): void;
              resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
              setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
              setAddressToBook(
                state: import('./account/types').AccountState,
                { address, name }: import('../types/common').PolkadotJsAccount
              ): void;
              removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
              setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
              setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
            };
            actions: {
              afterLogin(context: ActionContext<any, any>): Promise<void>;
              logout(context: ActionContext<any, any>): Promise<void>;
              checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
              checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
              updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
              loginAccount(
                context: ActionContext<any, any>,
                accountData: import('../types/common').PolkadotJsAccount
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
                { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
              ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
              vestedTransfer(
                context: ActionContext<any, any>,
                {
                  to,
                  asset,
                  amount,
                  vestingPercent,
                  unlockPeriodInDays,
                  start,
                  current,
                }: import('./account/types').VestedTransferParams
              ): Promise<void>;
              resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
              initMultisigAddress(context: ActionContext<any, any>): void;
            };
            getters: {
              isLoggedIn(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): boolean;
              account(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').PolkadotJsAccount;
              assetsDataTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AssetsTable;
              accountAssetsAddressTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AccountAssetsTable;
              whitelist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
              pinnedAssets(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
              isAssetPinned(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
              whitelistIdsBySymbol(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              getPassword(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (address: string) => Nullable<string>;
              blacklist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              isConnectedAccount(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (account: import('../types/common').PolkadotJsAccount) => boolean;
            };
          };
          router: {
            namespaced: true;
            state: import('./router/types').RouterState;
            mutations: {
              navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
            };
            actions: {
              back(context: ActionContext<any, any>): Promise<void>;
              checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
            };
          };
          settings: {
            namespaced: true;
            state: import('./settings/types').SettingsState;
            mutations: {
              setIndexerType(
                state: import('./settings/types').SettingsState,
                indexerType: import('../consts').IndexerType
              ): void;
              setIndexerStatus(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): void;
              setIndexerEndpoint(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  endpoint,
                }: {
                  indexer: import('../consts').IndexerType;
                  endpoint: string;
                }
              ): void;
              setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
              setPermissions(
                state: import('./settings/types').SettingsState,
                permissions: import('../consts').WalletPermissions
              ): void;
              setSoraNetwork(
                state: import('./settings/types').SettingsState,
                value: Nullable<import('../consts').SoraNetwork>
              ): void;
              setNetworkFees(
                state: import('./settings/types').SettingsState,
                fees?: import('@sora-substrate/sdk').NetworkFeesObject
              ): void;
              updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
              toggleHideBalance(state: import('./settings/types').SettingsState): void;
              setFilterOptions(
                state: import('./settings/types').SettingsState,
                filters: import('../consts').WalletAssetFilters
              ): void;
              setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
              setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
              setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
              setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
              setBlockNumberSubscription(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
              setFeeMultiplierAndRuntimeSubscriptions(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
              setApiKeys(
                state: import('./settings/types').SettingsState,
                keys?: import('../types/common').ApiKeysObject
              ): void;
              setNftStorage(
                state: import('./settings/types').SettingsState,
                {
                  marketplaceDid,
                  ucan,
                }: {
                  marketplaceDid?: string;
                  ucan?: string;
                }
              ): void;
              setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
              addPriceAlert(
                state: import('./settings/types').SettingsState,
                alert: import('../types/common').Alert
              ): void;
              removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
              editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
              setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
              setFiatCurrency(
                state: import('./settings/types').SettingsState,
                currency?: import('../types/currency').Currency
              ): void;
              setCurrencies(
                state: import('./settings/types').SettingsState,
                currencies: import('../types/currency').CurrencyFields[]
              ): void;
              updateFiatExchangeRates(
                state: import('./settings/types').SettingsState,
                newRates?: import('../types/currency').FiatExchangeRateObject
              ): void;
              setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
              resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
              setAssetsFilter(
                state: import('./settings/types').SettingsState,
                filter: import('../types/common').FilterOptions
              ): void;
              setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
              setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
            };
            actions: {
              setApiKeys(
                context: ActionContext<any, any>,
                keys: import('../types/common').ApiKeysObject
              ): Promise<void>;
              createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
              subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
              resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
              subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
              resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
              selectIndexer(
                context: ActionContext<any, any>,
                indexerType?: import('../consts').IndexerType
              ): Promise<void>;
              setIndexerStatus(
                context: ActionContext<any, any>,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): Promise<void>;
              subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
              setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
              toggleTheme(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              currencySymbol(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): string;
              exchangeRate(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): number;
              libraryTheme(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../consts').Theme;
              libraryDesignSystem(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').LibraryDesignSystem;
            };
          };
          subscriptions: {
            namespaced: true;
            state: import('./subscriptions/types').SubscriptionsState;
            mutations: {
              setSubscription(
                state: import('./subscriptions/types').SubscriptionsState,
                newSubscription: Nullable<VoidFunction>
              ): void;
            };
            actions: {
              resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
              subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
              activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            };
          };
          transactions: {
            namespaced: true;
            state: import('./transactions/types').TransactionsState;
            mutations: {
              setActiveTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: NodeJS.Timeout | number
              ): void;
              resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
              addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
              removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
              resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
              getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
              setExternalHistory(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              setExternalHistoryUpdates(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
              resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
              setExternalHistorySubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: VoidFunction
              ): void;
              resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
              setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogVisibility(
                state: import('./transactions/types').TransactionsState,
                visibility: boolean
              ): void;
              setPendingMstTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: import('rxjs').Subscription | null
              ): void;
              resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
              setPendingMstTransactions(
                state: import('./transactions/types').TransactionsState,
                transactions: import('@sora-substrate/sdk').HistoryItem[]
              ): void;
            };
            actions: {
              subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
              getExternalHistory(
                context: ActionContext<any, any>,
                { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
              ): Promise<void>;
              trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
              trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
              resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
              getAccountHistory(context: ActionContext<any, any>): Promise<void>;
              resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
              resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              activeTxs(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk').HistoryItem>;
              firstReadyTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
              selectedTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            };
          };
        };
      }>;
    };
    state: {
      readonly wallet: import('direct-vuex/types/direct-types').DirectState<{
        namespaced: true;
        modules: {
          account: {
            namespaced: true;
            state: import('./account/types').AccountState;
            mutations: {
              setFiatPriceObject(
                state: import('./account/types').AccountState,
                object: import('../services/indexer/types').FiatPriceObject
              ): void;
              updateFiatPriceObject(
                state: import('./account/types').AccountState,
                fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
              ): void;
              clearFiatPriceObject(state: import('./account/types').AccountState): void;
              setAlertSubject(
                state: import('./account/types').AccountState,
                alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
              ): void;
              resetAlertSubscription(state: import('./account/types').AccountState): void;
              setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
              setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
              resetAccount(state: import('./account/types').AccountState): void;
              setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetAssetsSubscription(state: import('./account/types').AccountState): void;
              setAccountAssetsSubscription(
                state: import('./account/types').AccountState,
                subscription: import('rxjs').Subscription
              ): void;
              resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
              syncWithStorage(state: import('./account/types').AccountState): void;
              setAssets(
                state: import('./account/types').AccountState,
                assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
              ): void;
              setAccountAssets(
                state: import('./account/types').AccountState,
                accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
              ): void;
              setPinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setMultiplePinnedAssets(
                state: import('./account/types').AccountState,
                pinnedAssetAddresses: string[]
              ): void;
              removePinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setAssetToNotify(
                state: import('./account/types').AccountState,
                asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
              ): void;
              popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
              setWhitelist(
                state: import('./account/types').AccountState,
                whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
              ): void;
              setNftBlacklist(
                state: import('./account/types').AccountState,
                blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
              ): void;
              clearWhitelist(state: import('./account/types').AccountState): void;
              clearBlacklist(state: import('./account/types').AccountState): void;
              setAvailableWallets(
                state: import('./account/types').AccountState,
                wallets: import('../services/wallet/types').Wallet[]
              ): void;
              setAccountPassphrase(
                state: import('./account/types').AccountState,
                {
                  address,
                  password,
                }: {
                  address: string;
                  password: string;
                }
              ): void;
              resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
              setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
              setAccountPassphraseTimer(
                state: import('./account/types').AccountState,
                {
                  address,
                  timer,
                }: {
                  address: string;
                  timer: NodeJS.Timeout;
                }
              ): void;
              resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
              setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
              setAddressToBook(
                state: import('./account/types').AccountState,
                { address, name }: import('../types/common').PolkadotJsAccount
              ): void;
              removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
              setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
              setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
            };
            actions: {
              afterLogin(context: ActionContext<any, any>): Promise<void>;
              logout(context: ActionContext<any, any>): Promise<void>;
              checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
              checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
              updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
              loginAccount(
                context: ActionContext<any, any>,
                accountData: import('../types/common').PolkadotJsAccount
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
                { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
              ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
              vestedTransfer(
                context: ActionContext<any, any>,
                {
                  to,
                  asset,
                  amount,
                  vestingPercent,
                  unlockPeriodInDays,
                  start,
                  current,
                }: import('./account/types').VestedTransferParams
              ): Promise<void>;
              resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
              initMultisigAddress(context: ActionContext<any, any>): void;
            };
            getters: {
              isLoggedIn(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): boolean;
              account(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').PolkadotJsAccount;
              assetsDataTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AssetsTable;
              accountAssetsAddressTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AccountAssetsTable;
              whitelist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
              pinnedAssets(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
              isAssetPinned(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
              whitelistIdsBySymbol(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              getPassword(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (address: string) => Nullable<string>;
              blacklist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              isConnectedAccount(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (account: import('../types/common').PolkadotJsAccount) => boolean;
            };
          };
          router: {
            namespaced: true;
            state: import('./router/types').RouterState;
            mutations: {
              navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
            };
            actions: {
              back(context: ActionContext<any, any>): Promise<void>;
              checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
            };
          };
          settings: {
            namespaced: true;
            state: import('./settings/types').SettingsState;
            mutations: {
              setIndexerType(
                state: import('./settings/types').SettingsState,
                indexerType: import('../consts').IndexerType
              ): void;
              setIndexerStatus(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): void;
              setIndexerEndpoint(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  endpoint,
                }: {
                  indexer: import('../consts').IndexerType;
                  endpoint: string;
                }
              ): void;
              setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
              setPermissions(
                state: import('./settings/types').SettingsState,
                permissions: import('../consts').WalletPermissions
              ): void;
              setSoraNetwork(
                state: import('./settings/types').SettingsState,
                value: Nullable<import('../consts').SoraNetwork>
              ): void;
              setNetworkFees(
                state: import('./settings/types').SettingsState,
                fees?: import('@sora-substrate/sdk').NetworkFeesObject
              ): void;
              updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
              toggleHideBalance(state: import('./settings/types').SettingsState): void;
              setFilterOptions(
                state: import('./settings/types').SettingsState,
                filters: import('../consts').WalletAssetFilters
              ): void;
              setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
              setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
              setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
              setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
              setBlockNumberSubscription(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
              setFeeMultiplierAndRuntimeSubscriptions(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
              setApiKeys(
                state: import('./settings/types').SettingsState,
                keys?: import('../types/common').ApiKeysObject
              ): void;
              setNftStorage(
                state: import('./settings/types').SettingsState,
                {
                  marketplaceDid,
                  ucan,
                }: {
                  marketplaceDid?: string;
                  ucan?: string;
                }
              ): void;
              setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
              addPriceAlert(
                state: import('./settings/types').SettingsState,
                alert: import('../types/common').Alert
              ): void;
              removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
              editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
              setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
              setFiatCurrency(
                state: import('./settings/types').SettingsState,
                currency?: import('../types/currency').Currency
              ): void;
              setCurrencies(
                state: import('./settings/types').SettingsState,
                currencies: import('../types/currency').CurrencyFields[]
              ): void;
              updateFiatExchangeRates(
                state: import('./settings/types').SettingsState,
                newRates?: import('../types/currency').FiatExchangeRateObject
              ): void;
              setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
              resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
              setAssetsFilter(
                state: import('./settings/types').SettingsState,
                filter: import('../types/common').FilterOptions
              ): void;
              setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
              setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
            };
            actions: {
              setApiKeys(
                context: ActionContext<any, any>,
                keys: import('../types/common').ApiKeysObject
              ): Promise<void>;
              createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
              subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
              resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
              subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
              resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
              selectIndexer(
                context: ActionContext<any, any>,
                indexerType?: import('../consts').IndexerType
              ): Promise<void>;
              setIndexerStatus(
                context: ActionContext<any, any>,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): Promise<void>;
              subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
              setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
              toggleTheme(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              currencySymbol(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): string;
              exchangeRate(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): number;
              libraryTheme(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../consts').Theme;
              libraryDesignSystem(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').LibraryDesignSystem;
            };
          };
          subscriptions: {
            namespaced: true;
            state: import('./subscriptions/types').SubscriptionsState;
            mutations: {
              setSubscription(
                state: import('./subscriptions/types').SubscriptionsState,
                newSubscription: Nullable<VoidFunction>
              ): void;
            };
            actions: {
              resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
              subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
              activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            };
          };
          transactions: {
            namespaced: true;
            state: import('./transactions/types').TransactionsState;
            mutations: {
              setActiveTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: NodeJS.Timeout | number
              ): void;
              resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
              addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
              removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
              resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
              getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
              setExternalHistory(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              setExternalHistoryUpdates(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
              resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
              setExternalHistorySubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: VoidFunction
              ): void;
              resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
              setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogVisibility(
                state: import('./transactions/types').TransactionsState,
                visibility: boolean
              ): void;
              setPendingMstTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: import('rxjs').Subscription | null
              ): void;
              resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
              setPendingMstTransactions(
                state: import('./transactions/types').TransactionsState,
                transactions: import('@sora-substrate/sdk').HistoryItem[]
              ): void;
            };
            actions: {
              subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
              getExternalHistory(
                context: ActionContext<any, any>,
                { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
              ): Promise<void>;
              trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
              trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
              resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
              getAccountHistory(context: ActionContext<any, any>): Promise<void>;
              resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
              resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              activeTxs(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk').HistoryItem>;
              firstReadyTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
              selectedTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            };
          };
        };
      }>;
    };
    getters: {
      readonly wallet: import('direct-vuex/types/direct-types').DirectGetters<{
        namespaced: true;
        modules: {
          account: {
            namespaced: true;
            state: import('./account/types').AccountState;
            mutations: {
              setFiatPriceObject(
                state: import('./account/types').AccountState,
                object: import('../services/indexer/types').FiatPriceObject
              ): void;
              updateFiatPriceObject(
                state: import('./account/types').AccountState,
                fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
              ): void;
              clearFiatPriceObject(state: import('./account/types').AccountState): void;
              setAlertSubject(
                state: import('./account/types').AccountState,
                alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
              ): void;
              resetAlertSubscription(state: import('./account/types').AccountState): void;
              setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
              setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
              resetAccount(state: import('./account/types').AccountState): void;
              setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
              resetAssetsSubscription(state: import('./account/types').AccountState): void;
              setAccountAssetsSubscription(
                state: import('./account/types').AccountState,
                subscription: import('rxjs').Subscription
              ): void;
              resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
              syncWithStorage(state: import('./account/types').AccountState): void;
              setAssets(
                state: import('./account/types').AccountState,
                assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
              ): void;
              setAccountAssets(
                state: import('./account/types').AccountState,
                accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
              ): void;
              setPinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setMultiplePinnedAssets(
                state: import('./account/types').AccountState,
                pinnedAssetAddresses: string[]
              ): void;
              removePinnedAsset(
                state: import('./account/types').AccountState,
                pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
              ): void;
              setAssetToNotify(
                state: import('./account/types').AccountState,
                asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
              ): void;
              popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
              setWhitelist(
                state: import('./account/types').AccountState,
                whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
              ): void;
              setNftBlacklist(
                state: import('./account/types').AccountState,
                blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
              ): void;
              clearWhitelist(state: import('./account/types').AccountState): void;
              clearBlacklist(state: import('./account/types').AccountState): void;
              setAvailableWallets(
                state: import('./account/types').AccountState,
                wallets: import('../services/wallet/types').Wallet[]
              ): void;
              setAccountPassphrase(
                state: import('./account/types').AccountState,
                {
                  address,
                  password,
                }: {
                  address: string;
                  password: string;
                }
              ): void;
              resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
              setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
              setAccountPassphraseTimer(
                state: import('./account/types').AccountState,
                {
                  address,
                  timer,
                }: {
                  address: string;
                  timer: NodeJS.Timeout;
                }
              ): void;
              resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
              setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
              setAddressToBook(
                state: import('./account/types').AccountState,
                { address, name }: import('../types/common').PolkadotJsAccount
              ): void;
              removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
              setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
              setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
            };
            actions: {
              afterLogin(context: ActionContext<any, any>): Promise<void>;
              logout(context: ActionContext<any, any>): Promise<void>;
              checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
              checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
              updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
              loginAccount(
                context: ActionContext<any, any>,
                accountData: import('../types/common').PolkadotJsAccount
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
                { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
              ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
              vestedTransfer(
                context: ActionContext<any, any>,
                {
                  to,
                  asset,
                  amount,
                  vestingPercent,
                  unlockPeriodInDays,
                  start,
                  current,
                }: import('./account/types').VestedTransferParams
              ): Promise<void>;
              resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
              resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
              resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
              initMultisigAddress(context: ActionContext<any, any>): void;
            };
            getters: {
              isLoggedIn(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): boolean;
              account(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').PolkadotJsAccount;
              assetsDataTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AssetsTable;
              accountAssetsAddressTable(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').AccountAssetsTable;
              whitelist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
              pinnedAssets(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
              isAssetPinned(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
              whitelistIdsBySymbol(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              getPassword(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (address: string) => Nullable<string>;
              blacklist(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): any;
              isConnectedAccount(
                state: import('./account/types').AccountState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): (account: import('../types/common').PolkadotJsAccount) => boolean;
            };
          };
          router: {
            namespaced: true;
            state: import('./router/types').RouterState;
            mutations: {
              navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
            };
            actions: {
              back(context: ActionContext<any, any>): Promise<void>;
              checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
            };
          };
          settings: {
            namespaced: true;
            state: import('./settings/types').SettingsState;
            mutations: {
              setIndexerType(
                state: import('./settings/types').SettingsState,
                indexerType: import('../consts').IndexerType
              ): void;
              setIndexerStatus(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): void;
              setIndexerEndpoint(
                state: import('./settings/types').SettingsState,
                {
                  indexer,
                  endpoint,
                }: {
                  indexer: import('../consts').IndexerType;
                  endpoint: string;
                }
              ): void;
              setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
              setPermissions(
                state: import('./settings/types').SettingsState,
                permissions: import('../consts').WalletPermissions
              ): void;
              setSoraNetwork(
                state: import('./settings/types').SettingsState,
                value: Nullable<import('../consts').SoraNetwork>
              ): void;
              setNetworkFees(
                state: import('./settings/types').SettingsState,
                fees?: import('@sora-substrate/sdk').NetworkFeesObject
              ): void;
              updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
              toggleHideBalance(state: import('./settings/types').SettingsState): void;
              setFilterOptions(
                state: import('./settings/types').SettingsState,
                filters: import('../consts').WalletAssetFilters
              ): void;
              setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
              setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
              setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
              setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
              setBlockNumberSubscription(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
              setFeeMultiplierAndRuntimeSubscriptions(
                state: import('./settings/types').SettingsState,
                subscription: import('rxjs').Subscription
              ): void;
              resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
              setApiKeys(
                state: import('./settings/types').SettingsState,
                keys?: import('../types/common').ApiKeysObject
              ): void;
              setNftStorage(
                state: import('./settings/types').SettingsState,
                {
                  marketplaceDid,
                  ucan,
                }: {
                  marketplaceDid?: string;
                  ucan?: string;
                }
              ): void;
              setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
              addPriceAlert(
                state: import('./settings/types').SettingsState,
                alert: import('../types/common').Alert
              ): void;
              removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
              editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
              setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
              setFiatCurrency(
                state: import('./settings/types').SettingsState,
                currency?: import('../types/currency').Currency
              ): void;
              setCurrencies(
                state: import('./settings/types').SettingsState,
                currencies: import('../types/currency').CurrencyFields[]
              ): void;
              updateFiatExchangeRates(
                state: import('./settings/types').SettingsState,
                newRates?: import('../types/currency').FiatExchangeRateObject
              ): void;
              setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
              resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
              setAssetsFilter(
                state: import('./settings/types').SettingsState,
                filter: import('../types/common').FilterOptions
              ): void;
              setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
              setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
            };
            actions: {
              setApiKeys(
                context: ActionContext<any, any>,
                keys: import('../types/common').ApiKeysObject
              ): Promise<void>;
              createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
              subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
              resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
              subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
              resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
              selectIndexer(
                context: ActionContext<any, any>,
                indexerType?: import('../consts').IndexerType
              ): Promise<void>;
              setIndexerStatus(
                context: ActionContext<any, any>,
                {
                  indexer,
                  status,
                }: {
                  indexer: import('../consts').IndexerType;
                  status: import('../types/common').ConnectionStatus;
                }
              ): Promise<void>;
              subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
              setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
              toggleTheme(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              currencySymbol(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): string;
              exchangeRate(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): number;
              libraryTheme(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../consts').Theme;
              libraryDesignSystem(
                state: import('./settings/types').SettingsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): import('../types/common').LibraryDesignSystem;
            };
          };
          subscriptions: {
            namespaced: true;
            state: import('./subscriptions/types').SubscriptionsState;
            mutations: {
              setSubscription(
                state: import('./subscriptions/types').SubscriptionsState,
                newSubscription: Nullable<VoidFunction>
              ): void;
            };
            actions: {
              resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
              subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
              activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
              activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
              resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            };
          };
          transactions: {
            namespaced: true;
            state: import('./transactions/types').TransactionsState;
            mutations: {
              setActiveTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: NodeJS.Timeout | number
              ): void;
              resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
              addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
              removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
              setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
              resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
              getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
              setExternalHistory(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              setExternalHistoryUpdates(
                state: import('./transactions/types').TransactionsState,
                history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
              ): void;
              saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
              resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
              setExternalHistorySubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: VoidFunction
              ): void;
              resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
              setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
              setSignTxDialogVisibility(
                state: import('./transactions/types').TransactionsState,
                visibility: boolean
              ): void;
              setPendingMstTxsSubscription(
                state: import('./transactions/types').TransactionsState,
                subscription: import('rxjs').Subscription | null
              ): void;
              resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
              setPendingMstTransactions(
                state: import('./transactions/types').TransactionsState,
                transactions: import('@sora-substrate/sdk').HistoryItem[]
              ): void;
            };
            actions: {
              subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
              getExternalHistory(
                context: ActionContext<any, any>,
                { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
              ): Promise<void>;
              trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
              trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
              resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
              getAccountHistory(context: ActionContext<any, any>): Promise<void>;
              resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
              resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
            };
            getters: {
              activeTxs(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Array<import('@sora-substrate/sdk').HistoryItem>;
              firstReadyTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
              selectedTx(
                state: import('./transactions/types').TransactionsState,
                getters: any,
                rootState: any,
                rootGetters: any
              ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            };
          };
        };
      }>;
    };
  };
export type WalletStore = typeof store.original;
/**
 * This method is used only for submodules in wallet
 * @param submodule name of submodule
 * @returns the same as localActionContext
 */
declare const prepareWalletActionContext: (
  context: any,
  submodule: WalletModule
) => {
  state:
    | import('direct-vuex/types/direct-types').DirectState<{
        namespaced: true;
        state: import('./settings/types').SettingsState;
        mutations: {
          setIndexerType(
            state: import('./settings/types').SettingsState,
            indexerType: import('../consts').IndexerType
          ): void;
          setIndexerStatus(
            state: import('./settings/types').SettingsState,
            {
              indexer,
              status,
            }: {
              indexer: import('../consts').IndexerType;
              status: import('../types/common').ConnectionStatus;
            }
          ): void;
          setIndexerEndpoint(
            state: import('./settings/types').SettingsState,
            {
              indexer,
              endpoint,
            }: {
              indexer: import('../consts').IndexerType;
              endpoint: string;
            }
          ): void;
          setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
          setPermissions(
            state: import('./settings/types').SettingsState,
            permissions: import('../consts').WalletPermissions
          ): void;
          setSoraNetwork(
            state: import('./settings/types').SettingsState,
            value: Nullable<import('../consts').SoraNetwork>
          ): void;
          setNetworkFees(
            state: import('./settings/types').SettingsState,
            fees?: import('@sora-substrate/sdk').NetworkFeesObject
          ): void;
          updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
          toggleHideBalance(state: import('./settings/types').SettingsState): void;
          setFilterOptions(
            state: import('./settings/types').SettingsState,
            filters: import('../consts').WalletAssetFilters
          ): void;
          setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
          setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
          setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
          setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
          setBlockNumberSubscription(
            state: import('./settings/types').SettingsState,
            subscription: import('rxjs').Subscription
          ): void;
          resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
          setFeeMultiplierAndRuntimeSubscriptions(
            state: import('./settings/types').SettingsState,
            subscription: import('rxjs').Subscription
          ): void;
          resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
          setApiKeys(
            state: import('./settings/types').SettingsState,
            keys?: import('../types/common').ApiKeysObject
          ): void;
          setNftStorage(
            state: import('./settings/types').SettingsState,
            {
              marketplaceDid,
              ucan,
            }: {
              marketplaceDid?: string;
              ucan?: string;
            }
          ): void;
          setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
          addPriceAlert(state: import('./settings/types').SettingsState, alert: import('../types/common').Alert): void;
          removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
          editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
          setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
          setFiatCurrency(
            state: import('./settings/types').SettingsState,
            currency?: import('../types/currency').Currency
          ): void;
          setCurrencies(
            state: import('./settings/types').SettingsState,
            currencies: import('../types/currency').CurrencyFields[]
          ): void;
          updateFiatExchangeRates(
            state: import('./settings/types').SettingsState,
            newRates?: import('../types/currency').FiatExchangeRateObject
          ): void;
          setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
          resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
          setAssetsFilter(
            state: import('./settings/types').SettingsState,
            filter: import('../types/common').FilterOptions
          ): void;
          setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
          setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
        };
        actions: {
          setApiKeys(context: ActionContext<any, any>, keys: import('../types/common').ApiKeysObject): Promise<void>;
          createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
          subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
          resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
          subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
          resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
          selectIndexer(context: ActionContext<any, any>, indexerType?: import('../consts').IndexerType): Promise<void>;
          setIndexerStatus(
            context: ActionContext<any, any>,
            {
              indexer,
              status,
            }: {
              indexer: import('../consts').IndexerType;
              status: import('../types/common').ConnectionStatus;
            }
          ): Promise<void>;
          subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
          setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
          toggleTheme(context: ActionContext<any, any>): Promise<void>;
        };
        getters: {
          currencySymbol(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): string;
          exchangeRate(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): number;
          libraryTheme(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../consts').Theme;
          libraryDesignSystem(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').LibraryDesignSystem;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectState<{
        namespaced: true;
        state: import('./account/types').AccountState;
        mutations: {
          setFiatPriceObject(
            state: import('./account/types').AccountState,
            object: import('../services/indexer/types').FiatPriceObject
          ): void;
          updateFiatPriceObject(
            state: import('./account/types').AccountState,
            fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
          ): void;
          clearFiatPriceObject(state: import('./account/types').AccountState): void;
          setAlertSubject(
            state: import('./account/types').AccountState,
            alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
          ): void;
          resetAlertSubscription(state: import('./account/types').AccountState): void;
          setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
          resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
          setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
          resetAccount(state: import('./account/types').AccountState): void;
          setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
          resetAssetsSubscription(state: import('./account/types').AccountState): void;
          setAccountAssetsSubscription(
            state: import('./account/types').AccountState,
            subscription: import('rxjs').Subscription
          ): void;
          resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
          syncWithStorage(state: import('./account/types').AccountState): void;
          setAssets(
            state: import('./account/types').AccountState,
            assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
          ): void;
          setAccountAssets(
            state: import('./account/types').AccountState,
            accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
          ): void;
          setPinnedAsset(
            state: import('./account/types').AccountState,
            pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
          ): void;
          setMultiplePinnedAssets(state: import('./account/types').AccountState, pinnedAssetAddresses: string[]): void;
          removePinnedAsset(
            state: import('./account/types').AccountState,
            pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
          ): void;
          setAssetToNotify(
            state: import('./account/types').AccountState,
            asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
          ): void;
          popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
          setWhitelist(
            state: import('./account/types').AccountState,
            whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
          ): void;
          setNftBlacklist(
            state: import('./account/types').AccountState,
            blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
          ): void;
          clearWhitelist(state: import('./account/types').AccountState): void;
          clearBlacklist(state: import('./account/types').AccountState): void;
          setAvailableWallets(
            state: import('./account/types').AccountState,
            wallets: import('../services/wallet/types').Wallet[]
          ): void;
          setAccountPassphrase(
            state: import('./account/types').AccountState,
            {
              address,
              password,
            }: {
              address: string;
              password: string;
            }
          ): void;
          resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
          setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
          setAccountPassphraseTimer(
            state: import('./account/types').AccountState,
            {
              address,
              timer,
            }: {
              address: string;
              timer: NodeJS.Timeout;
            }
          ): void;
          resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
          setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
          setAddressToBook(
            state: import('./account/types').AccountState,
            { address, name }: import('../types/common').PolkadotJsAccount
          ): void;
          removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
          setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
          setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
        };
        actions: {
          afterLogin(context: ActionContext<any, any>): Promise<void>;
          logout(context: ActionContext<any, any>): Promise<void>;
          checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
          checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
          updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
          loginAccount(
            context: ActionContext<any, any>,
            accountData: import('../types/common').PolkadotJsAccount
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
            { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
          ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
          vestedTransfer(
            context: ActionContext<any, any>,
            {
              to,
              asset,
              amount,
              vestingPercent,
              unlockPeriodInDays,
              start,
              current,
            }: import('./account/types').VestedTransferParams
          ): Promise<void>;
          resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
          resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
          resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
          resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
          initMultisigAddress(context: ActionContext<any, any>): void;
        };
        getters: {
          isLoggedIn(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): boolean;
          account(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').PolkadotJsAccount;
          assetsDataTable(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').AssetsTable;
          accountAssetsAddressTable(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').AccountAssetsTable;
          whitelist(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
          pinnedAssets(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
          isAssetPinned(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
          whitelistIdsBySymbol(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): any;
          getPassword(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): (address: string) => Nullable<string>;
          blacklist(state: import('./account/types').AccountState, getters: any, rootState: any, rootGetters: any): any;
          isConnectedAccount(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): (account: import('../types/common').PolkadotJsAccount) => boolean;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectState<{
        namespaced: true;
        state: import('./router/types').RouterState;
        mutations: {
          navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
        };
        actions: {
          back(context: ActionContext<any, any>): Promise<void>;
          checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectState<{
        namespaced: true;
        state: import('./subscriptions/types').SubscriptionsState;
        mutations: {
          setSubscription(
            state: import('./subscriptions/types').SubscriptionsState,
            newSubscription: Nullable<VoidFunction>
          ): void;
        };
        actions: {
          resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
          subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
          activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
          resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
          activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
          resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
          activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
          resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectState<{
        namespaced: true;
        state: import('./transactions/types').TransactionsState;
        mutations: {
          setActiveTxsSubscription(
            state: import('./transactions/types').TransactionsState,
            subscription: NodeJS.Timeout | number
          ): void;
          resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
          addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
          removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
          removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
          setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
          resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
          getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
          setExternalHistory(
            state: import('./transactions/types').TransactionsState,
            history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
          ): void;
          setExternalHistoryUpdates(
            state: import('./transactions/types').TransactionsState,
            history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
          ): void;
          saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
          setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
          resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
          setExternalHistorySubscription(
            state: import('./transactions/types').TransactionsState,
            subscription: VoidFunction
          ): void;
          resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
          setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
          setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
          setSignTxDialogVisibility(state: import('./transactions/types').TransactionsState, visibility: boolean): void;
          setPendingMstTxsSubscription(
            state: import('./transactions/types').TransactionsState,
            subscription: import('rxjs').Subscription | null
          ): void;
          resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
          setPendingMstTransactions(
            state: import('./transactions/types').TransactionsState,
            transactions: import('@sora-substrate/sdk').HistoryItem[]
          ): void;
        };
        actions: {
          subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
          getExternalHistory(
            context: ActionContext<any, any>,
            { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
          ): Promise<void>;
          trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
          trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
          resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
          getAccountHistory(context: ActionContext<any, any>): Promise<void>;
          resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
          resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
        };
        getters: {
          activeTxs(
            state: import('./transactions/types').TransactionsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Array<import('@sora-substrate/sdk').HistoryItem>;
          firstReadyTx(
            state: import('./transactions/types').TransactionsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
          selectedTx(
            state: import('./transactions/types').TransactionsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
        };
      }>;
  getters:
    | import('direct-vuex/types/direct-types').DirectGetters<{
        namespaced: true;
        state: import('./account/types').AccountState;
        mutations: {
          setFiatPriceObject(
            state: import('./account/types').AccountState,
            object: import('../services/indexer/types').FiatPriceObject
          ): void;
          updateFiatPriceObject(
            state: import('./account/types').AccountState,
            fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
          ): void;
          clearFiatPriceObject(state: import('./account/types').AccountState): void;
          setAlertSubject(
            state: import('./account/types').AccountState,
            alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
          ): void;
          resetAlertSubscription(state: import('./account/types').AccountState): void;
          setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
          resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
          setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
          resetAccount(state: import('./account/types').AccountState): void;
          setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
          resetAssetsSubscription(state: import('./account/types').AccountState): void;
          setAccountAssetsSubscription(
            state: import('./account/types').AccountState,
            subscription: import('rxjs').Subscription
          ): void;
          resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
          syncWithStorage(state: import('./account/types').AccountState): void;
          setAssets(
            state: import('./account/types').AccountState,
            assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
          ): void;
          setAccountAssets(
            state: import('./account/types').AccountState,
            accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
          ): void;
          setPinnedAsset(
            state: import('./account/types').AccountState,
            pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
          ): void;
          setMultiplePinnedAssets(state: import('./account/types').AccountState, pinnedAssetAddresses: string[]): void;
          removePinnedAsset(
            state: import('./account/types').AccountState,
            pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
          ): void;
          setAssetToNotify(
            state: import('./account/types').AccountState,
            asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
          ): void;
          popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
          setWhitelist(
            state: import('./account/types').AccountState,
            whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
          ): void;
          setNftBlacklist(
            state: import('./account/types').AccountState,
            blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
          ): void;
          clearWhitelist(state: import('./account/types').AccountState): void;
          clearBlacklist(state: import('./account/types').AccountState): void;
          setAvailableWallets(
            state: import('./account/types').AccountState,
            wallets: import('../services/wallet/types').Wallet[]
          ): void;
          setAccountPassphrase(
            state: import('./account/types').AccountState,
            {
              address,
              password,
            }: {
              address: string;
              password: string;
            }
          ): void;
          resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
          setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
          setAccountPassphraseTimer(
            state: import('./account/types').AccountState,
            {
              address,
              timer,
            }: {
              address: string;
              timer: NodeJS.Timeout;
            }
          ): void;
          resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
          setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
          setAddressToBook(
            state: import('./account/types').AccountState,
            { address, name }: import('../types/common').PolkadotJsAccount
          ): void;
          removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
          setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
          setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
        };
        actions: {
          afterLogin(context: ActionContext<any, any>): Promise<void>;
          logout(context: ActionContext<any, any>): Promise<void>;
          checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
          checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
          updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
          loginAccount(
            context: ActionContext<any, any>,
            accountData: import('../types/common').PolkadotJsAccount
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
            { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
          ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
          vestedTransfer(
            context: ActionContext<any, any>,
            {
              to,
              asset,
              amount,
              vestingPercent,
              unlockPeriodInDays,
              start,
              current,
            }: import('./account/types').VestedTransferParams
          ): Promise<void>;
          resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
          resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
          resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
          resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
          initMultisigAddress(context: ActionContext<any, any>): void;
        };
        getters: {
          isLoggedIn(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): boolean;
          account(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').PolkadotJsAccount;
          assetsDataTable(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').AssetsTable;
          accountAssetsAddressTable(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').AccountAssetsTable;
          whitelist(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
          pinnedAssets(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
          isAssetPinned(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
          whitelistIdsBySymbol(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): any;
          getPassword(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): (address: string) => Nullable<string>;
          blacklist(state: import('./account/types').AccountState, getters: any, rootState: any, rootGetters: any): any;
          isConnectedAccount(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): (account: import('../types/common').PolkadotJsAccount) => boolean;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectGetters<{
        namespaced: true;
        state: import('./router/types').RouterState;
        mutations: {
          navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
        };
        actions: {
          back(context: ActionContext<any, any>): Promise<void>;
          checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectGetters<{
        namespaced: true;
        state: import('./settings/types').SettingsState;
        mutations: {
          setIndexerType(
            state: import('./settings/types').SettingsState,
            indexerType: import('../consts').IndexerType
          ): void;
          setIndexerStatus(
            state: import('./settings/types').SettingsState,
            {
              indexer,
              status,
            }: {
              indexer: import('../consts').IndexerType;
              status: import('../types/common').ConnectionStatus;
            }
          ): void;
          setIndexerEndpoint(
            state: import('./settings/types').SettingsState,
            {
              indexer,
              endpoint,
            }: {
              indexer: import('../consts').IndexerType;
              endpoint: string;
            }
          ): void;
          setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
          setPermissions(
            state: import('./settings/types').SettingsState,
            permissions: import('../consts').WalletPermissions
          ): void;
          setSoraNetwork(
            state: import('./settings/types').SettingsState,
            value: Nullable<import('../consts').SoraNetwork>
          ): void;
          setNetworkFees(
            state: import('./settings/types').SettingsState,
            fees?: import('@sora-substrate/sdk').NetworkFeesObject
          ): void;
          updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
          toggleHideBalance(state: import('./settings/types').SettingsState): void;
          setFilterOptions(
            state: import('./settings/types').SettingsState,
            filters: import('../consts').WalletAssetFilters
          ): void;
          setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
          setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
          setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
          setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
          setBlockNumberSubscription(
            state: import('./settings/types').SettingsState,
            subscription: import('rxjs').Subscription
          ): void;
          resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
          setFeeMultiplierAndRuntimeSubscriptions(
            state: import('./settings/types').SettingsState,
            subscription: import('rxjs').Subscription
          ): void;
          resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
          setApiKeys(
            state: import('./settings/types').SettingsState,
            keys?: import('../types/common').ApiKeysObject
          ): void;
          setNftStorage(
            state: import('./settings/types').SettingsState,
            {
              marketplaceDid,
              ucan,
            }: {
              marketplaceDid?: string;
              ucan?: string;
            }
          ): void;
          setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
          addPriceAlert(state: import('./settings/types').SettingsState, alert: import('../types/common').Alert): void;
          removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
          editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
          setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
          setFiatCurrency(
            state: import('./settings/types').SettingsState,
            currency?: import('../types/currency').Currency
          ): void;
          setCurrencies(
            state: import('./settings/types').SettingsState,
            currencies: import('../types/currency').CurrencyFields[]
          ): void;
          updateFiatExchangeRates(
            state: import('./settings/types').SettingsState,
            newRates?: import('../types/currency').FiatExchangeRateObject
          ): void;
          setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
          resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
          setAssetsFilter(
            state: import('./settings/types').SettingsState,
            filter: import('../types/common').FilterOptions
          ): void;
          setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
          setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
        };
        actions: {
          setApiKeys(context: ActionContext<any, any>, keys: import('../types/common').ApiKeysObject): Promise<void>;
          createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
          subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
          resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
          subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
          resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
          selectIndexer(context: ActionContext<any, any>, indexerType?: import('../consts').IndexerType): Promise<void>;
          setIndexerStatus(
            context: ActionContext<any, any>,
            {
              indexer,
              status,
            }: {
              indexer: import('../consts').IndexerType;
              status: import('../types/common').ConnectionStatus;
            }
          ): Promise<void>;
          subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
          setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
          toggleTheme(context: ActionContext<any, any>): Promise<void>;
        };
        getters: {
          currencySymbol(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): string;
          exchangeRate(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): number;
          libraryTheme(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../consts').Theme;
          libraryDesignSystem(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').LibraryDesignSystem;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectGetters<{
        namespaced: true;
        state: import('./subscriptions/types').SubscriptionsState;
        mutations: {
          setSubscription(
            state: import('./subscriptions/types').SubscriptionsState,
            newSubscription: Nullable<VoidFunction>
          ): void;
        };
        actions: {
          resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
          subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
          activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
          resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
          activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
          resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
          activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
          resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectGetters<{
        namespaced: true;
        state: import('./transactions/types').TransactionsState;
        mutations: {
          setActiveTxsSubscription(
            state: import('./transactions/types').TransactionsState,
            subscription: NodeJS.Timeout | number
          ): void;
          resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
          addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
          removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
          removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
          setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
          resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
          getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
          setExternalHistory(
            state: import('./transactions/types').TransactionsState,
            history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
          ): void;
          setExternalHistoryUpdates(
            state: import('./transactions/types').TransactionsState,
            history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
          ): void;
          saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
          setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
          resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
          setExternalHistorySubscription(
            state: import('./transactions/types').TransactionsState,
            subscription: VoidFunction
          ): void;
          resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
          setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
          setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
          setSignTxDialogVisibility(state: import('./transactions/types').TransactionsState, visibility: boolean): void;
          setPendingMstTxsSubscription(
            state: import('./transactions/types').TransactionsState,
            subscription: import('rxjs').Subscription | null
          ): void;
          resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
          setPendingMstTransactions(
            state: import('./transactions/types').TransactionsState,
            transactions: import('@sora-substrate/sdk').HistoryItem[]
          ): void;
        };
        actions: {
          subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
          getExternalHistory(
            context: ActionContext<any, any>,
            { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
          ): Promise<void>;
          trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
          trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
          resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
          getAccountHistory(context: ActionContext<any, any>): Promise<void>;
          resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
          resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
        };
        getters: {
          activeTxs(
            state: import('./transactions/types').TransactionsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Array<import('@sora-substrate/sdk').HistoryItem>;
          firstReadyTx(
            state: import('./transactions/types').TransactionsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
          selectedTx(
            state: import('./transactions/types').TransactionsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
        };
      }>;
  commit:
    | import('direct-vuex/types/direct-types').DirectMutations<{
        namespaced: true;
        state: import('./settings/types').SettingsState;
        mutations: {
          setIndexerType(
            state: import('./settings/types').SettingsState,
            indexerType: import('../consts').IndexerType
          ): void;
          setIndexerStatus(
            state: import('./settings/types').SettingsState,
            {
              indexer,
              status,
            }: {
              indexer: import('../consts').IndexerType;
              status: import('../types/common').ConnectionStatus;
            }
          ): void;
          setIndexerEndpoint(
            state: import('./settings/types').SettingsState,
            {
              indexer,
              endpoint,
            }: {
              indexer: import('../consts').IndexerType;
              endpoint: string;
            }
          ): void;
          setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
          setPermissions(
            state: import('./settings/types').SettingsState,
            permissions: import('../consts').WalletPermissions
          ): void;
          setSoraNetwork(
            state: import('./settings/types').SettingsState,
            value: Nullable<import('../consts').SoraNetwork>
          ): void;
          setNetworkFees(
            state: import('./settings/types').SettingsState,
            fees?: import('@sora-substrate/sdk').NetworkFeesObject
          ): void;
          updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
          toggleHideBalance(state: import('./settings/types').SettingsState): void;
          setFilterOptions(
            state: import('./settings/types').SettingsState,
            filters: import('../consts').WalletAssetFilters
          ): void;
          setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
          setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
          setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
          setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
          setBlockNumberSubscription(
            state: import('./settings/types').SettingsState,
            subscription: import('rxjs').Subscription
          ): void;
          resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
          setFeeMultiplierAndRuntimeSubscriptions(
            state: import('./settings/types').SettingsState,
            subscription: import('rxjs').Subscription
          ): void;
          resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
          setApiKeys(
            state: import('./settings/types').SettingsState,
            keys?: import('../types/common').ApiKeysObject
          ): void;
          setNftStorage(
            state: import('./settings/types').SettingsState,
            {
              marketplaceDid,
              ucan,
            }: {
              marketplaceDid?: string;
              ucan?: string;
            }
          ): void;
          setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
          addPriceAlert(state: import('./settings/types').SettingsState, alert: import('../types/common').Alert): void;
          removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
          editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
          setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
          setFiatCurrency(
            state: import('./settings/types').SettingsState,
            currency?: import('../types/currency').Currency
          ): void;
          setCurrencies(
            state: import('./settings/types').SettingsState,
            currencies: import('../types/currency').CurrencyFields[]
          ): void;
          updateFiatExchangeRates(
            state: import('./settings/types').SettingsState,
            newRates?: import('../types/currency').FiatExchangeRateObject
          ): void;
          setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
          resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
          setAssetsFilter(
            state: import('./settings/types').SettingsState,
            filter: import('../types/common').FilterOptions
          ): void;
          setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
          setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
        };
        actions: {
          setApiKeys(context: ActionContext<any, any>, keys: import('../types/common').ApiKeysObject): Promise<void>;
          createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
          subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
          resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
          subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
          resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
          selectIndexer(context: ActionContext<any, any>, indexerType?: import('../consts').IndexerType): Promise<void>;
          setIndexerStatus(
            context: ActionContext<any, any>,
            {
              indexer,
              status,
            }: {
              indexer: import('../consts').IndexerType;
              status: import('../types/common').ConnectionStatus;
            }
          ): Promise<void>;
          subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
          setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
          toggleTheme(context: ActionContext<any, any>): Promise<void>;
        };
        getters: {
          currencySymbol(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): string;
          exchangeRate(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): number;
          libraryTheme(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../consts').Theme;
          libraryDesignSystem(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').LibraryDesignSystem;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectMutations<{
        namespaced: true;
        state: import('./account/types').AccountState;
        mutations: {
          setFiatPriceObject(
            state: import('./account/types').AccountState,
            object: import('../services/indexer/types').FiatPriceObject
          ): void;
          updateFiatPriceObject(
            state: import('./account/types').AccountState,
            fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
          ): void;
          clearFiatPriceObject(state: import('./account/types').AccountState): void;
          setAlertSubject(
            state: import('./account/types').AccountState,
            alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
          ): void;
          resetAlertSubscription(state: import('./account/types').AccountState): void;
          setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
          resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
          setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
          resetAccount(state: import('./account/types').AccountState): void;
          setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
          resetAssetsSubscription(state: import('./account/types').AccountState): void;
          setAccountAssetsSubscription(
            state: import('./account/types').AccountState,
            subscription: import('rxjs').Subscription
          ): void;
          resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
          syncWithStorage(state: import('./account/types').AccountState): void;
          setAssets(
            state: import('./account/types').AccountState,
            assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
          ): void;
          setAccountAssets(
            state: import('./account/types').AccountState,
            accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
          ): void;
          setPinnedAsset(
            state: import('./account/types').AccountState,
            pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
          ): void;
          setMultiplePinnedAssets(state: import('./account/types').AccountState, pinnedAssetAddresses: string[]): void;
          removePinnedAsset(
            state: import('./account/types').AccountState,
            pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
          ): void;
          setAssetToNotify(
            state: import('./account/types').AccountState,
            asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
          ): void;
          popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
          setWhitelist(
            state: import('./account/types').AccountState,
            whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
          ): void;
          setNftBlacklist(
            state: import('./account/types').AccountState,
            blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
          ): void;
          clearWhitelist(state: import('./account/types').AccountState): void;
          clearBlacklist(state: import('./account/types').AccountState): void;
          setAvailableWallets(
            state: import('./account/types').AccountState,
            wallets: import('../services/wallet/types').Wallet[]
          ): void;
          setAccountPassphrase(
            state: import('./account/types').AccountState,
            {
              address,
              password,
            }: {
              address: string;
              password: string;
            }
          ): void;
          resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
          setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
          setAccountPassphraseTimer(
            state: import('./account/types').AccountState,
            {
              address,
              timer,
            }: {
              address: string;
              timer: NodeJS.Timeout;
            }
          ): void;
          resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
          setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
          setAddressToBook(
            state: import('./account/types').AccountState,
            { address, name }: import('../types/common').PolkadotJsAccount
          ): void;
          removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
          setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
          setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
        };
        actions: {
          afterLogin(context: ActionContext<any, any>): Promise<void>;
          logout(context: ActionContext<any, any>): Promise<void>;
          checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
          checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
          updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
          loginAccount(
            context: ActionContext<any, any>,
            accountData: import('../types/common').PolkadotJsAccount
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
            { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
          ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
          vestedTransfer(
            context: ActionContext<any, any>,
            {
              to,
              asset,
              amount,
              vestingPercent,
              unlockPeriodInDays,
              start,
              current,
            }: import('./account/types').VestedTransferParams
          ): Promise<void>;
          resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
          resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
          resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
          resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
          initMultisigAddress(context: ActionContext<any, any>): void;
        };
        getters: {
          isLoggedIn(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): boolean;
          account(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').PolkadotJsAccount;
          assetsDataTable(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').AssetsTable;
          accountAssetsAddressTable(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').AccountAssetsTable;
          whitelist(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
          pinnedAssets(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
          isAssetPinned(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
          whitelistIdsBySymbol(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): any;
          getPassword(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): (address: string) => Nullable<string>;
          blacklist(state: import('./account/types').AccountState, getters: any, rootState: any, rootGetters: any): any;
          isConnectedAccount(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): (account: import('../types/common').PolkadotJsAccount) => boolean;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectMutations<{
        namespaced: true;
        state: import('./transactions/types').TransactionsState;
        mutations: {
          setActiveTxsSubscription(
            state: import('./transactions/types').TransactionsState,
            subscription: NodeJS.Timeout | number
          ): void;
          resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
          addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
          removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
          removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
          setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
          resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
          getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
          setExternalHistory(
            state: import('./transactions/types').TransactionsState,
            history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
          ): void;
          setExternalHistoryUpdates(
            state: import('./transactions/types').TransactionsState,
            history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
          ): void;
          saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
          setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
          resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
          setExternalHistorySubscription(
            state: import('./transactions/types').TransactionsState,
            subscription: VoidFunction
          ): void;
          resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
          setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
          setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
          setSignTxDialogVisibility(state: import('./transactions/types').TransactionsState, visibility: boolean): void;
          setPendingMstTxsSubscription(
            state: import('./transactions/types').TransactionsState,
            subscription: import('rxjs').Subscription | null
          ): void;
          resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
          setPendingMstTransactions(
            state: import('./transactions/types').TransactionsState,
            transactions: import('@sora-substrate/sdk').HistoryItem[]
          ): void;
        };
        actions: {
          subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
          getExternalHistory(
            context: ActionContext<any, any>,
            { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
          ): Promise<void>;
          trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
          trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
          resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
          getAccountHistory(context: ActionContext<any, any>): Promise<void>;
          resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
          resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
        };
        getters: {
          activeTxs(
            state: import('./transactions/types').TransactionsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Array<import('@sora-substrate/sdk').HistoryItem>;
          firstReadyTx(
            state: import('./transactions/types').TransactionsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
          selectedTx(
            state: import('./transactions/types').TransactionsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectMutations<{
        namespaced: true;
        state: import('./router/types').RouterState;
        mutations: {
          navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
        };
        actions: {
          back(context: ActionContext<any, any>): Promise<void>;
          checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectMutations<{
        namespaced: true;
        state: import('./subscriptions/types').SubscriptionsState;
        mutations: {
          setSubscription(
            state: import('./subscriptions/types').SubscriptionsState,
            newSubscription: Nullable<VoidFunction>
          ): void;
        };
        actions: {
          resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
          subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
          activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
          resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
          activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
          resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
          activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
          resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
        };
      }>;
  dispatch:
    | import('direct-vuex/types/direct-types').DirectActions<{
        namespaced: true;
        state: import('./settings/types').SettingsState;
        mutations: {
          setIndexerType(
            state: import('./settings/types').SettingsState,
            indexerType: import('../consts').IndexerType
          ): void;
          setIndexerStatus(
            state: import('./settings/types').SettingsState,
            {
              indexer,
              status,
            }: {
              indexer: import('../consts').IndexerType;
              status: import('../types/common').ConnectionStatus;
            }
          ): void;
          setIndexerEndpoint(
            state: import('./settings/types').SettingsState,
            {
              indexer,
              endpoint,
            }: {
              indexer: import('../consts').IndexerType;
              endpoint: string;
            }
          ): void;
          setWalletLoaded(state: import('./settings/types').SettingsState, flag: boolean): void;
          setPermissions(
            state: import('./settings/types').SettingsState,
            permissions: import('../consts').WalletPermissions
          ): void;
          setSoraNetwork(
            state: import('./settings/types').SettingsState,
            value: Nullable<import('../consts').SoraNetwork>
          ): void;
          setNetworkFees(
            state: import('./settings/types').SettingsState,
            fees?: import('@sora-substrate/sdk').NetworkFeesObject
          ): void;
          updateNetworkFees(state: import('./settings/types').SettingsState, fees?: any): void;
          toggleHideBalance(state: import('./settings/types').SettingsState): void;
          setFilterOptions(
            state: import('./settings/types').SettingsState,
            filters: import('../consts').WalletAssetFilters
          ): void;
          setAllowFeePopup(state: import('./settings/types').SettingsState, flag: boolean): void;
          setFeeMultiplier(state: import('./settings/types').SettingsState, multiplier: number): void;
          setRuntimeVersion(state: import('./settings/types').SettingsState, version: number): void;
          setBlockNumber(state: import('./settings/types').SettingsState, blockNumber: number): void;
          setBlockNumberSubscription(
            state: import('./settings/types').SettingsState,
            subscription: import('rxjs').Subscription
          ): void;
          resetBlockNumberSubscription(state: import('./settings/types').SettingsState): void;
          setFeeMultiplierAndRuntimeSubscriptions(
            state: import('./settings/types').SettingsState,
            subscription: import('rxjs').Subscription
          ): void;
          resetFeeMultiplierAndRuntimeSubscriptions(state: import('./settings/types').SettingsState): void;
          setApiKeys(
            state: import('./settings/types').SettingsState,
            keys?: import('../types/common').ApiKeysObject
          ): void;
          setNftStorage(
            state: import('./settings/types').SettingsState,
            {
              marketplaceDid,
              ucan,
            }: {
              marketplaceDid?: string;
              ucan?: string;
            }
          ): void;
          setDepositNotifications(state: import('./settings/types').SettingsState, allow: boolean): void;
          addPriceAlert(state: import('./settings/types').SettingsState, alert: import('../types/common').Alert): void;
          removePriceAlert(state: import('./settings/types').SettingsState, position: number): void;
          editPriceAlert(state: import('./settings/types').SettingsState, { alert, position }: any): void;
          setPriceAlertAsNotified(state: import('./settings/types').SettingsState, { position, value }: any): void;
          setFiatCurrency(
            state: import('./settings/types').SettingsState,
            currency?: import('../types/currency').Currency
          ): void;
          setCurrencies(
            state: import('./settings/types').SettingsState,
            currencies: import('../types/currency').CurrencyFields[]
          ): void;
          updateFiatExchangeRates(
            state: import('./settings/types').SettingsState,
            newRates?: import('../types/currency').FiatExchangeRateObject
          ): void;
          setExchangeRateUnsubFn(state: import('./settings/types').SettingsState, unsubFn: VoidFunction): void;
          resetExchangeRateSubscription(state: import('./settings/types').SettingsState): void;
          setAssetsFilter(
            state: import('./settings/types').SettingsState,
            filter: import('../types/common').FilterOptions
          ): void;
          setIsMstAvailable(state: import('./settings/types').SettingsState, isAvailable: boolean): void;
          setTheme(state: import('./settings/types').SettingsState, theme: import('../consts').Theme): void;
        };
        actions: {
          setApiKeys(context: ActionContext<any, any>, keys: import('../types/common').ApiKeysObject): Promise<void>;
          createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
          subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
          resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
          subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
          resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
          selectIndexer(context: ActionContext<any, any>, indexerType?: import('../consts').IndexerType): Promise<void>;
          setIndexerStatus(
            context: ActionContext<any, any>,
            {
              indexer,
              status,
            }: {
              indexer: import('../consts').IndexerType;
              status: import('../types/common').ConnectionStatus;
            }
          ): Promise<void>;
          subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
          setTheme(context: ActionContext<any, any>, theme: import('../consts').Theme): Promise<void>;
          toggleTheme(context: ActionContext<any, any>): Promise<void>;
        };
        getters: {
          currencySymbol(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): string;
          exchangeRate(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): number;
          libraryTheme(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../consts').Theme;
          libraryDesignSystem(
            state: import('./settings/types').SettingsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').LibraryDesignSystem;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectActions<{
        namespaced: true;
        state: import('./account/types').AccountState;
        mutations: {
          setFiatPriceObject(
            state: import('./account/types').AccountState,
            object: import('../services/indexer/types').FiatPriceObject
          ): void;
          updateFiatPriceObject(
            state: import('./account/types').AccountState,
            fiatPriceAndApyRecord?: import('../services/indexer/types').FiatPriceObject
          ): void;
          clearFiatPriceObject(state: import('./account/types').AccountState): void;
          setAlertSubject(
            state: import('./account/types').AccountState,
            alertSubject: import('rxjs').Subject<import('../services/indexer/types').FiatPriceObject>
          ): void;
          resetAlertSubscription(state: import('./account/types').AccountState): void;
          setFiatPriceSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
          resetFiatPriceSubscription(state: import('./account/types').AccountState): void;
          setCeresFiatValuesUsage(state: import('./account/types').AccountState, flag: any): void;
          resetAccount(state: import('./account/types').AccountState): void;
          setAssetsSubscription(state: import('./account/types').AccountState, subscription: VoidFunction): void;
          resetAssetsSubscription(state: import('./account/types').AccountState): void;
          setAccountAssetsSubscription(
            state: import('./account/types').AccountState,
            subscription: import('rxjs').Subscription
          ): void;
          resetAccountAssetsSubscription(state: import('./account/types').AccountState): void;
          syncWithStorage(state: import('./account/types').AccountState): void;
          setAssets(
            state: import('./account/types').AccountState,
            assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
          ): void;
          setAccountAssets(
            state: import('./account/types').AccountState,
            accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
          ): void;
          setPinnedAsset(
            state: import('./account/types').AccountState,
            pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
          ): void;
          setMultiplePinnedAssets(state: import('./account/types').AccountState, pinnedAssetAddresses: string[]): void;
          removePinnedAsset(
            state: import('./account/types').AccountState,
            pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
          ): void;
          setAssetToNotify(
            state: import('./account/types').AccountState,
            asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
          ): void;
          popAssetFromNotificationQueue(state: import('./account/types').AccountState): void;
          setWhitelist(
            state: import('./account/types').AccountState,
            whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
          ): void;
          setNftBlacklist(
            state: import('./account/types').AccountState,
            blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
          ): void;
          clearWhitelist(state: import('./account/types').AccountState): void;
          clearBlacklist(state: import('./account/types').AccountState): void;
          setAvailableWallets(
            state: import('./account/types').AccountState,
            wallets: import('../services/wallet/types').Wallet[]
          ): void;
          setAccountPassphrase(
            state: import('./account/types').AccountState,
            {
              address,
              password,
            }: {
              address: string;
              password: string;
            }
          ): void;
          resetAccountPassphrase(state: import('./account/types').AccountState, address: string): void;
          setPasswordTimeout(state: import('./account/types').AccountState, timeout: number): void;
          setAccountPassphraseTimer(
            state: import('./account/types').AccountState,
            {
              address,
              timer,
            }: {
              address: string;
              timer: NodeJS.Timeout;
            }
          ): void;
          resetAccountPassphraseTimer(state: import('./account/types').AccountState, address: string): void;
          setIsDesktop(state: import('./account/types').AccountState, value: boolean): void;
          setAddressToBook(
            state: import('./account/types').AccountState,
            { address, name }: import('../types/common').PolkadotJsAccount
          ): void;
          removeAddressFromBook(state: import('./account/types').AccountState, address: string): void;
          setIsMstAddressExist(state: import('./account/types').AccountState, isExist: boolean): void;
          setIsMST(state: import('./account/types').AccountState, isMST: boolean): void;
        };
        actions: {
          afterLogin(context: ActionContext<any, any>): Promise<void>;
          logout(context: ActionContext<any, any>): Promise<void>;
          checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
          checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
          updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
          loginAccount(
            context: ActionContext<any, any>,
            accountData: import('../types/common').PolkadotJsAccount
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
            { asset, amount, vestingPercent, unlockPeriodInDays }: import('./account/types').VestedTransferFeeParams
          ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
          vestedTransfer(
            context: ActionContext<any, any>,
            {
              to,
              asset,
              amount,
              vestingPercent,
              unlockPeriodInDays,
              start,
              current,
            }: import('./account/types').VestedTransferParams
          ): Promise<void>;
          resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
          resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
          resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
          resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
          initMultisigAddress(context: ActionContext<any, any>): void;
        };
        getters: {
          isLoggedIn(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): boolean;
          account(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').PolkadotJsAccount;
          assetsDataTable(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').AssetsTable;
          accountAssetsAddressTable(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('../types/common').AccountAssetsTable;
          whitelist(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
          pinnedAssets(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
          isAssetPinned(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
          whitelistIdsBySymbol(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): any;
          getPassword(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): (address: string) => Nullable<string>;
          blacklist(state: import('./account/types').AccountState, getters: any, rootState: any, rootGetters: any): any;
          isConnectedAccount(
            state: import('./account/types').AccountState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): (account: import('../types/common').PolkadotJsAccount) => boolean;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectActions<{
        namespaced: true;
        state: import('./transactions/types').TransactionsState;
        mutations: {
          setActiveTxsSubscription(
            state: import('./transactions/types').TransactionsState,
            subscription: NodeJS.Timeout | number
          ): void;
          resetActiveTxs(state: import('./transactions/types').TransactionsState): void;
          addActiveTx(state: import('./transactions/types').TransactionsState, id: string): void;
          removeActiveTxs(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
          removeHistoryByIds(state: import('./transactions/types').TransactionsState, ids: Array<string>): void;
          setTxDetailsId(state: import('./transactions/types').TransactionsState, id: string): void;
          resetTxDetailsId(state: import('./transactions/types').TransactionsState): void;
          getHistory(state: import('./transactions/types').TransactionsState): Promise<void>;
          setExternalHistory(
            state: import('./transactions/types').TransactionsState,
            history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
          ): void;
          setExternalHistoryUpdates(
            state: import('./transactions/types').TransactionsState,
            history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
          ): void;
          saveExternalHistoryUpdates(state: import('./transactions/types').TransactionsState, flag: boolean): void;
          setExternalHistoryTotal(state: import('./transactions/types').TransactionsState, total?: any): void;
          resetExternalHistory(state: import('./transactions/types').TransactionsState): void;
          setExternalHistorySubscription(
            state: import('./transactions/types').TransactionsState,
            subscription: VoidFunction
          ): void;
          resetExternalHistorySubscription(state: import('./transactions/types').TransactionsState): void;
          setConfirmTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
          setSignTxDialogDisabled(state: import('./transactions/types').TransactionsState, flag: boolean): void;
          setSignTxDialogVisibility(state: import('./transactions/types').TransactionsState, visibility: boolean): void;
          setPendingMstTxsSubscription(
            state: import('./transactions/types').TransactionsState,
            subscription: import('rxjs').Subscription | null
          ): void;
          resetPendingMstTxsSubscription(state: import('./transactions/types').TransactionsState): void;
          setPendingMstTransactions(
            state: import('./transactions/types').TransactionsState,
            transactions: import('@sora-substrate/sdk').HistoryItem[]
          ): void;
        };
        actions: {
          subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
          getExternalHistory(
            context: ActionContext<any, any>,
            { address, assetAddress, pageAmount, page, query }?: import('../types/history').ExternalHistoryParams
          ): Promise<void>;
          trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
          trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
          resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
          getAccountHistory(context: ActionContext<any, any>): Promise<void>;
          resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
          resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
        };
        getters: {
          activeTxs(
            state: import('./transactions/types').TransactionsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Array<import('@sora-substrate/sdk').HistoryItem>;
          firstReadyTx(
            state: import('./transactions/types').TransactionsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
          selectedTx(
            state: import('./transactions/types').TransactionsState,
            getters: any,
            rootState: any,
            rootGetters: any
          ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectActions<{
        namespaced: true;
        state: import('./router/types').RouterState;
        mutations: {
          navigate(state: import('./router/types').RouterState, params: import('./router/types').Route): void;
        };
        actions: {
          back(context: ActionContext<any, any>): Promise<void>;
          checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
        };
      }>
    | import('direct-vuex/types/direct-types').DirectActions<{
        namespaced: true;
        state: import('./subscriptions/types').SubscriptionsState;
        mutations: {
          setSubscription(
            state: import('./subscriptions/types').SubscriptionsState,
            newSubscription: Nullable<VoidFunction>
          ): void;
        };
        actions: {
          resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
          subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
          activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
          resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
          activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
          resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
          activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
          resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
        };
      }>;
};
export { modules, rootActionContext, rootGetterContext, prepareWalletActionContext };
export default store;
