import cryptoRandomString from 'crypto-random-string';
import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { AES, enc } from 'crypto-js';
import debounce from 'lodash/fp/debounce';
import { FPNumber } from '@sora-substrate/math';
import { Operation, TransactionStatus, type HistoryItem, type NetworkFeesObject } from '@/lib/substrate/sdk/types';

import { DefaultPassphraseTimeout } from '@/consts';
import type { EditableAlertObject, WalletAssetFilters } from '@/consts';
import type { Theme } from '@/consts/theme';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { excludePoolXYKAssets } from '@sora-substrate/sdk/build/assets';
import { api as walletApi } from '@/lib/soraneo-wallet/src/api';
import {
  accountIdBasedOperations,
  BLOCK_PRODUCE_TIME,
  MAX_ALERTS_NUMBER,
  RouteNames,
  SoraNetwork,
} from '@/lib/soraneo-wallet/src/consts';
import { getCurrenciesState } from '@/lib/soraneo-wallet/src/consts/currencies';
import { checkWallet, getAppWallets } from '@/lib/soraneo-wallet/src/services/wallet';
import { setWalletConnectProjectId } from '@/lib/soraneo-wallet/src/services/walletconnect/config';
import {
  beforeTransactionSign,
  NFT_BLACK_LIST_URL,
  WHITE_LIST_URL,
  formatAccountAddress,
} from '@/lib/soraneo-wallet/src/util';
import {
  getWalletCurrentParams,
  getWalletCurrentRoute,
  navigateWallet,
  syncWalletCurrentRoute,
} from '@/platform/wallet/navigation';
import { initialState as createAccountState } from '@/stores/wallet/account/state';
import type { AccountState, VestedTransferFeeParams, VestedTransferParams } from '@/stores/wallet/account/types';
import { initialState as createSettingsState } from '@/stores/wallet/settings/state';
import { normalizeTheme } from '@/stores/wallet/settings/theme';
import type { SettingsState } from '@/stores/wallet/settings/types';
import { initialState as createTransactionsState } from '@/stores/wallet/transactions/state';
import type { TransactionsState } from '@/stores/wallet/transactions/types';
import { createNftStorage } from '@/stores/wallet/nftStorage';
import { IpfsStorage } from '@/lib/soraneo-wallet/src/util/ipfsStorage';
import { runtimeStorage, settingsStorage, storage } from '@/lib/soraneo-wallet/src/util/storage';
import { isAppStorageSource, loginApi, logoutApi, updateApiSigner } from '@/lib/soraneo-wallet/src/util/account';
import { sanitizeNftBlacklistPayload, sanitizeWhitelistPayload } from '@/lib/soraneo-wallet/src/util/security';
import type { ExternalHistoryParams } from '@/lib/soraneo-wallet/src/types/history';
import { resolveFallbackIndexer, resolvePreferredIndexer } from '@/stores/wallet/utils/indexers';
import type { Nullable } from '@/types/common';
import type { AppWallet } from '@/lib/soraneo-wallet/src/consts';
import type { TransactionSignVisibilityController } from '@/lib/soraneo-wallet/src/util';
import { resolveStaticAssetUrl } from '@/utils/staticAssets';
import { waitForAccountPair } from '@/utils/walletReady';

import type {
  Alert,
  FilterOptions,
  IndexerState,
  PolkadotJsAccount,
  WhitelistIdsBySymbol,
} from '@/lib/soraneo-wallet/src/types/common';
import type { Currency, CurrencyFields, FiatExchangeRateObject } from '@/lib/soraneo-wallet/src/types/currency';
import type {
  AccountAsset,
  Asset,
  RegisteredAccountAsset,
  Whitelist,
  WhitelistArrayItem,
} from '@sora-substrate/sdk/build/assets/types';

type AssetsTable = Record<string, Asset | RegisteredAccountAsset>;
type AccountAssetsTable = Record<string, AccountAsset>;
type FiatPriceObject = Record<string, string>;
type AlertsServiceModule = typeof import('@/lib/soraneo-wallet/src/services/alerts');
type CurrencyServiceModule = typeof import('@/lib/soraneo-wallet/src/services/currency');
type GoogleServicesModule = typeof import('@/lib/soraneo-wallet/src/services/google');
type IndexerServicesModule = typeof import('@/lib/soraneo-wallet/src/services/indexer');
type RxjsModule = typeof import('rxjs');
type CurrentIndexer = ReturnType<IndexerServicesModule['getCurrentIndexer']>;

const DEFAULT_CURRENCY_SYMBOL = '$';
const XOR_CURRENCY_KEY = 'xor';
const DAI_CURRENCY_KEY = 'dai';
const UPDATE_ACTIVE_TRANSACTIONS_INTERVAL = 2_000;
const UPDATE_ASSETS_TIMEOUT = BLOCK_PRODUCE_TIME * 3;

let indexerServicesModulePromise: Promise<IndexerServicesModule> | null = null;
let alertsServiceModulePromise: Promise<AlertsServiceModule> | null = null;
let currencyServiceModulePromise: Promise<CurrencyServiceModule> | null = null;
let googleServicesModulePromise: Promise<GoogleServicesModule> | null = null;
let rxjsModulePromise: Promise<RxjsModule> | null = null;

/**
 * Loads browser notification alert code only when alert subscriptions or
 * deposit notifications need it.
 */
const loadAlertsApiService = async (): Promise<AlertsServiceModule['default']> => {
  alertsServiceModulePromise ??= import('@/lib/soraneo-wallet/src/services/alerts');
  const { default: alertsApiService } = await alertsServiceModulePromise;
  return alertsApiService;
};

/**
 * Loads the fiat exchange-rate service only after indexer subscriptions start.
 */
const loadCurrencyExchangeRateService = async (): Promise<
  CurrencyServiceModule['CurrencyExchangeRateService']
> => {
  currencyServiceModulePromise ??= import('@/lib/soraneo-wallet/src/services/currency');
  const { CurrencyExchangeRateService } = await currencyServiceModulePromise;
  return CurrencyExchangeRateService;
};

/**
 * Loads Google Drive backup support only when Google API credentials are present.
 */
const loadGoogleDriveStorage = async (): Promise<GoogleServicesModule['GDriveStorage']> => {
  googleServicesModulePromise ??= import('@/lib/soraneo-wallet/src/services/google');
  const { GDriveStorage } = await googleServicesModulePromise;
  return GDriveStorage;
};

/**
 * Loads RxJS combination helpers for network-fee/runtime subscriptions on demand.
 */
const loadRxjs = (): Promise<RxjsModule> => {
  rxjsModulePromise ??= import('rxjs');
  return rxjsModulePromise;
};

/**
 * Defers Polkaswap indexer and GraphQL client code until an indexer-backed
 * wallet action actually needs it.
 */
const loadIndexerServices = (): Promise<IndexerServicesModule> => {
  indexerServicesModulePromise ??= import('@/lib/soraneo-wallet/src/services/indexer');
  return indexerServicesModulePromise;
};

/**
 * Resolves the active indexer descriptor from the lazily loaded service module.
 */
const getCurrentIndexerService = async (): Promise<CurrentIndexer> => {
  const { getCurrentIndexer } = await loadIndexerServices();
  return getCurrentIndexer();
};

const fallbackFilters: WalletAssetFilters = {
  option: 'All',
  verifiedOnly: false,
  zeroBalance: false,
};

const mapByAddress = <T extends { address: string }>(items: ReadonlyArray<T> = []): Record<string, T> => {
  return items.reduce<Record<string, T>>((buffer, item) => {
    if (item?.address) {
      buffer[item.address] = item;
    }

    return buffer;
  }, {});
};

const resolveWhitelist = (whitelistArray: ReadonlyArray<WhitelistArrayItem> = []): Whitelist => {
  if (!whitelistArray.length) {
    return {};
  }

  try {
    return walletApi.assets.getWhitelist([...whitelistArray]);
  } catch {
    return {};
  }
};

const resolveWhitelistIdsBySymbol = (whitelistArray: ReadonlyArray<WhitelistArrayItem> = []): WhitelistIdsBySymbol => {
  if (!whitelistArray.length) {
    return {} as WhitelistIdsBySymbol;
  }

  try {
    return walletApi.assets.getWhitelistIdsBySymbol([...whitelistArray]) as WhitelistIdsBySymbol;
  } catch {
    return {} as WhitelistIdsBySymbol;
  }
};

const resolveCurrencySymbol = (currency: Nullable<string>, currencies: CurrencyFields[] = []): string => {
  if (!currency) {
    return DEFAULT_CURRENCY_SYMBOL;
  }

  const currencyKey = currency.toLowerCase();
  const configuredCurrency = currencies.find((entry) => String(entry.key).toLowerCase() === currencyKey);

  if (configuredCurrency?.symbol) {
    return configuredCurrency.symbol;
  }

  if (currencyKey === XOR_CURRENCY_KEY) {
    return 'XOR';
  }

  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyKey.toUpperCase(),
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(1);

    return parts.find((part) => part.type === 'currency')?.value ?? DEFAULT_CURRENCY_SYMBOL;
  } catch {
    return DEFAULT_CURRENCY_SYMBOL;
  }
};

const resolveExchangeRate = (settings: SettingsState, account: AccountState): number => {
  if (String(settings.currency).toLowerCase() === XOR_CURRENCY_KEY) {
    const xorPriceCodec = account.fiatPriceObject?.[XOR.address];
    const xorPrice = FPNumber.fromCodecValue(xorPriceCodec ?? 0);

    if (xorPrice.isGtZero()) {
      return FPNumber.ONE.div(xorPrice).toNumber();
    }

    return 1;
  }

  return settings.fiatExchangeRateObject?.[settings.currency] ?? 1;
};

const areLocalNetworkFeesOkay = (
  localFees: NetworkFeesObject = {} as NetworkFeesObject,
  apiFees: NetworkFeesObject = {} as NetworkFeesObject
): boolean => {
  const localFeeKeys = Object.keys(localFees);
  const apiFeeKeys = Object.keys(apiFees);

  if (!localFeeKeys.length) {
    return false;
  }

  if (!Number(localFees.Swap ?? 0)) {
    return false;
  }

  if (localFeeKeys.length !== apiFeeKeys.length) {
    return false;
  }

  localFeeKeys.sort();
  apiFeeKeys.sort();

  return localFeeKeys.every((key, index) => key === apiFeeKeys[index]);
};

const resolveFirstReadyTransaction = (state: TransactionsState): Nullable<HistoryItem> => {
  return state.activeTxsIds
    .map((id) => state.history[id])
    .find((transaction) =>
      transaction
        ? [TransactionStatus.InBlock, TransactionStatus.Finalized, TransactionStatus.Error].includes(
            transaction.status as TransactionStatus
          )
        : false
    ) as Nullable<HistoryItem>;
};

const resolveSelectedTransaction = (state: TransactionsState): Nullable<HistoryItem> => {
  if (!state.selectedTxId) {
    return null;
  }

  return (
    state.history[state.selectedTxId] ||
    state.externalHistory[state.selectedTxId] ||
    state.externalHistoryUpdates[state.selectedTxId]
  );
};

/**
 * Pinia-backed wallet facade that owns wallet state locally and exposes
 * stable wallet state/getters to the rest of the app.
 */
export const useWalletStore = defineStore('wallet', () => {
  const accountState = ref<AccountState>(createAccountState());
  const settingsState = ref<SettingsState>(createSettingsState());
  const transactionsState = ref<TransactionsState>(createTransactionsState());

  const storageUpdatesSubscription = ref<Nullable<VoidFunction>>(null);

  const address = computed(() => accountState.value.address ?? '');
  const soraAddress = computed(() => address.value);
  const account = computed<Nullable<PolkadotJsAccount>>(() => {
    const { address, name, source } = accountState.value;

    if (!(address && source)) {
      return null;
    }

    return {
      address,
      name,
      source: source as AppWallet,
    };
  });
  const isLoggedIn = computed(() => Boolean(accountState.value.address && accountState.value.source));
  const whitelist = computed<Whitelist>(() => resolveWhitelist(accountState.value.whitelistArray));
  const whitelistIdsBySymbol = computed<WhitelistIdsBySymbol>(() =>
    resolveWhitelistIdsBySymbol(accountState.value.whitelistArray)
  );
  const assets = computed(() => (accountState.value.assets ?? []) as AccountAsset[]);
  const accountAssets = computed(() => accountState.value.accountAssets ?? []);
  const isAssetPinned = (asset: AccountAsset): boolean =>
    Boolean(asset && accountState.value.pinnedAssets.includes(asset.address));
  const fiatPriceObject = computed(() => (accountState.value.fiatPriceObject ?? {}) as FiatPriceObject);
  const assetsDataTable = computed<AssetsTable>(() => mapByAddress((accountState.value.assets ?? []) as Asset[]));
  const accountAssetsAddressTable = computed<AccountAssetsTable>(() =>
    mapByAddress(accountState.value.accountAssets ?? [])
  );
  const pinnedAssets = computed(() => accountState.value.pinnedAssets ?? []);
  const assetsToNotifyQueue = computed<WhitelistArrayItem[]>(() => accountState.value.assetsToNotifyQueue ?? []);
  const availableWallets = computed(() => accountState.value.availableWallets ?? []);
  const accountSource = computed(() => (accountState.value.source as Nullable<AppWallet>) ?? null);
  const currentRoute = computed<Nullable<string>>(() => getWalletCurrentRoute());
  const isExternal = computed(() => Boolean(accountState.value.isExternal));
  const isDesktop = computed(() => Boolean(accountState.value.isDesktop));
  const isMST = computed(() => Boolean(accountState.value.isMST));
  const isMstAccount = computed(() => Boolean(accountState.value.isMST));
  const isMstAddressExist = computed(() => Boolean(accountState.value.isMstAddressExist));
  const ceresFiatValuesUsage = computed(() => Boolean(accountState.value.ceresFiatValuesUsage));
  const blacklist = computed(() => accountState.value.blacklistArray ?? []);
  const shouldBalanceBeHidden = computed(() => Boolean(settingsState.value.shouldBalanceBeHidden));
  const apiKeys = computed(() => ({ ...(settingsState.value.apiKeys ?? {}) }) as Record<string, string>);
  const moonpayApiKey = computed(() => settingsState.value.apiKeys?.moonpay ?? '');
  const currency = computed(() => (settingsState.value.currency as Nullable<string>) ?? null);
  const theme = computed(() => (settingsState.value.theme as Nullable<Theme>) ?? null);
  const libraryTheme = computed(() => normalizeTheme(settingsState.value.theme as Theme));
  const currencySymbol = computed(() =>
    resolveCurrencySymbol(settingsState.value.currency, settingsState.value.currencies)
  );
  const fiatExchangeRateObject = computed<FiatExchangeRateObject>(() => ({
    [DAI_CURRENCY_KEY]: 1,
    ...(settingsState.value.fiatExchangeRateObject ?? {}),
  }));
  const exchangeRate = computed(() => resolveExchangeRate(settingsState.value, accountState.value));
  const networkFees = computed(() => (settingsState.value.networkFees ?? {}) as NetworkFeesObject);
  const blockNumber = computed(() => Number(settingsState.value.blockNumber ?? 0));
  const isWalletLoaded = computed(() => Boolean(settingsState.value.isWalletLoaded));
  const allowFeePopup = computed(() => Boolean(settingsState.value.allowFeePopup));
  const permissions = computed(() => settingsState.value.permissions);
  const filters = computed(() => (settingsState.value.filters as WalletAssetFilters) ?? fallbackFilters);
  const assetsFilter = computed(() => (settingsState.value.assetsFilter as FilterOptions) ?? ('All' as FilterOptions));
  const currencies = computed(() => (settingsState.value.currencies ?? []) as CurrencyFields[]);
  const alerts = computed(() => (settingsState.value.alerts ?? []) as Alert[]);
  const allowTopUpAlert = computed(() => Boolean(settingsState.value.allowTopUpAlert));
  const indexers = computed(() => (settingsState.value.indexers ?? {}) as Record<string, IndexerState>);
  const indexerType = computed(() => (settingsState.value.indexerType as Nullable<string>) ?? null);
  const activeTransactions = computed<HistoryItem[]>(() =>
    transactionsState.value.activeTxsIds
      .map((id) => transactionsState.value.history[id])
      .filter((transaction): transaction is HistoryItem => Boolean(transaction))
  );
  const firstReadyTransaction = computed(() => resolveFirstReadyTransaction(transactionsState.value));
  const selectedTransaction = computed(() => resolveSelectedTransaction(transactionsState.value));
  const pendingMstTransactions = computed(() => transactionsState.value.pendingMstTransactions ?? []);
  const isSignTxDialogVisible = computed(() => Boolean(transactionsState.value.isSignTxDialogVisible));
  const isSignTxDialogDisabled = computed(() => Boolean(transactionsState.value.isSignTxDialogDisabled));
  const isConfirmTxDialogDisabled = computed(() => Boolean(transactionsState.value.isConfirmTxDialogDisabled));
  const accountPasswordTimeout = computed(() =>
    Number(accountState.value.accountPasswordTimeout ?? DefaultPassphraseTimeout)
  );
  const accountPasswordTimestamp = computed(
    () => (accountState.value.accountPasswordTimestamp ?? {}) as Record<string, Nullable<number>>
  );
  const isMstWarningVisible = computed(() => Boolean(settingsState.value.isMSTAvailable));
  const isMSTAvailable = computed(() => Boolean(settingsState.value.isMSTAvailable));
  const soraNetwork = computed(() => (settingsState.value.soraNetwork as Nullable<string>) ?? null);
  const getPassword = (accountAddress: string): Nullable<string> => {
    if (!accountAddress) {
      return null;
    }

    const address = walletApi.formatAddress(accountAddress, false);
    const encryptedPassphrase = accountState.value.addressPassphraseMapping[address];
    const sessionKey = accountState.value.addressKeyMapping[address];

    if (!(encryptedPassphrase && sessionKey)) {
      return null;
    }

    return AES.decrypt(encryptedPassphrase, sessionKey).toString(enc.Utf8);
  };
  const isConnectedAccount = (nextAccount: PolkadotJsAccount): boolean => {
    if (!nextAccount) {
      return false;
    }

    return (
      formatAccountAddress(nextAccount.address) === accountState.value.address &&
      nextAccount.name === accountState.value.name &&
      nextAccount.source === accountState.value.source
    );
  };

  const resetExchangeRateSubscription = (): void => {
    settingsState.value.exchangeRateUnsubFn?.();
    settingsState.value.exchangeRateUnsubFn = null;
  };

  const handleExchangeRatesSuccess = (newRates: FiatExchangeRateObject): void => {
    updateFiatExchangeRates(newRates);
    settingsState.value.currencies = getCurrenciesState(true);
  };

  const handleExchangeRatesError = (): void => {
    updateFiatExchangeRates({});
    settingsState.value.currencies = getCurrenciesState(false);
  };

  const setAccountAssets = (value: AccountAsset[]): void => {
    accountState.value.accountAssets = value;
  };

  const setAssets = (value: Asset[]): void => {
    accountState.value.assets = value;
  };

  const setAvailableWallets = (wallets: unknown[]): void => {
    accountState.value.availableWallets = wallets as AccountState['availableWallets'];
  };

  const resetAssetsSubscription = (): void => {
    accountState.value.assetsSubscription?.();
    accountState.value.assetsSubscription = null;
  };

  const getAssets = async (): Promise<void> => {
    const allAssets = await Promise.race([
      walletApi.assets.getAssets(true, whitelist.value, blacklist.value),
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error('Request Timeout')), UPDATE_ASSETS_TIMEOUT);
      }),
    ]);
    const filtered = excludePoolXYKAssets(allAssets);

    setAssets(filtered);
  };

  const subscribeOnAssets = async (): Promise<void> => {
    resetAssetsSubscription();
    await getAssets();

    const indexer = await getCurrentIndexerService();
    const subscription = indexer.services.explorer.asset.createNewAssetsSubscription((newAssets) => {
      if (!newAssets.length) {
        return;
      }

      const assetsToAdd = newAssets.filter((asset) => !(asset.address in assetsDataTable.value));

      if (assetsToAdd.length) {
        setAssets([...(accountState.value.assets as Asset[]), ...assetsToAdd]);
      }
    }, console.error);

    accountState.value.assetsSubscription = subscription;
  };

  const resetAccountAssetsSubscription = (): void => {
    walletApi.assets.clearAccountAssets();

    if (accountState.value.accountAssetsSubscription) {
      accountState.value.accountAssetsSubscription.unsubscribe();
      accountState.value.accountAssetsSubscription = null;
    }
  };

  const syncAccountAssetsFromApi = (): void => {
    setAccountAssets(
      walletApi.assets.accountAssets.filter((asset) => !walletApi.assets.isNftBlacklisted(asset, blacklist.value))
    );
  };

  const subscribeOnAccountAssets = async (): Promise<void> => {
    resetAccountAssetsSubscription();

    if (!isLoggedIn.value) {
      return;
    }

    try {
      await waitForAccountPair(async () => {
        const subscription = walletApi.assets.balanceUpdated.subscribe(() => {
          syncAccountAssetsFromApi();
        });

        accountState.value.accountAssetsSubscription = subscription;
        await walletApi.assets.updateAccountAssets();
        syncAccountAssetsFromApi();
      });
    } catch {
      setAccountAssets([]);
    }
  };

  const syncAccountHistory = (): void => {
    transactionsState.value.history = Object.freeze({ ...walletApi.history });
  };

  const getHistory = (): void => {
    syncAccountHistory();
  };

  const setExternalHistory = (history: TransactionsState['externalHistory']): void => {
    transactionsState.value.externalHistory = Object.freeze({ ...history });
  };

  const setExternalHistoryUpdates = (history: TransactionsState['externalHistoryUpdates']): void => {
    transactionsState.value.externalHistoryUpdates = Object.freeze({ ...history });
  };

  const setExternalHistoryTotal = (total = 0): void => {
    transactionsState.value.externalHistoryTotal = total;
  };

  const removeHistoryByIds = (ids: string[]): void => {
    transactionsState.value.activeTxsIds = transactionsState.value.activeTxsIds.filter((txId) => !ids.includes(txId));
    walletApi.removeHistory(...ids);
  };

  const setTxDetailsId = (id: string): void => {
    transactionsState.value.selectedTxId = id;
  };

  const resetTxDetailsId = (): void => {
    transactionsState.value.selectedTxId = null;
  };

  const saveExternalHistoryUpdates = (flag: boolean): void => {
    transactionsState.value.saveExternalHistoryUpdates = flag;
  };

  const resetExternalHistory = (): void => {
    transactionsState.value.externalHistory = {};
    transactionsState.value.externalHistoryUpdates = {};
    transactionsState.value.externalHistoryTotal = 0;
  };

  const resetExternalHistorySubscription = (): void => {
    transactionsState.value.externalHistorySubscription?.();
    transactionsState.value.externalHistorySubscription = null;
  };

  const subscribeOnExternalHistory = async (): Promise<void> => {
    resetExternalHistorySubscription();

    if (!(isLoggedIn.value && address.value)) {
      return;
    }

    try {
      const indexer = await getCurrentIndexerService();
      const subscription = indexer.services.explorer.account.createHistorySubscription(
        address.value,
        async (transaction) => {
          const historyItem = await indexer.services.dataParser.parseTransactionAsHistoryItem(transaction);

          if (!historyItem?.id) {
            return;
          }

          if ([Operation.EthBridgeIncoming, Operation.EthBridgeOutgoing].includes(historyItem.type as Operation)) {
            return;
          }

          if (historyItem.id in walletApi.history) {
            removeHistoryByIds([historyItem.id]);
            syncAccountHistory();
          }

          if (
            transactionsState.value.saveExternalHistoryUpdates &&
            !(historyItem.id in transactionsState.value.externalHistory)
          ) {
            transactionsState.value.externalHistoryUpdates = Object.freeze({
              ...transactionsState.value.externalHistoryUpdates,
              [historyItem.id]: historyItem,
            });
          }

          if (
            accountIdBasedOperations.includes(historyItem.type as Operation) &&
            historyItem.to === account.value?.address
          ) {
            const asset = whitelist.value[historyItem.assetAddress as string];

            if (asset && settingsState.value.allowTopUpAlert) {
              setAssetToNotify(asset as WhitelistArrayItem);
            }
          }
        }
      );

      transactionsState.value.externalHistorySubscription = subscription;
    } catch (error) {
      console.error(error);
    }
  };

  const getExternalHistory = async ({
    address = '',
    assetAddress = '',
    pageAmount = 8,
    page = 1,
    query = {},
  }: ExternalHistoryParams = {}): Promise<void> => {
    const indexer = await getCurrentIndexerService();
    const operations = indexer.services.dataParser.supportedOperations;
    const filter = indexer.historyElementsFilter({
      address,
      assetAddress,
      operations,
      query,
    });
    const variables = {
      filter,
      first: pageAmount,
      offset: pageAmount * (page - 1),
    };

    try {
      const response = await indexer.services.explorer.account.getHistory(variables);

      if (!response) {
        return;
      }

      const { nodes, totalCount } = response;
      const buffer: Record<string, HistoryItem> = {};
      const removeInternalIds: string[] = [];
      const removeExternalUpdatesIds: string[] = [];

      for (const transaction of nodes ?? []) {
        const id = transaction?.id as Nullable<string>;

        if (!(id && !(id in transactionsState.value.externalHistory))) {
          continue;
        }

        const historyItem = await indexer.services.dataParser.parseTransactionAsHistoryItem(transaction as never);

        if (!historyItem?.id) {
          continue;
        }

        buffer[id] = historyItem;

        if (id in walletApi.history) {
          removeInternalIds.push(id);
        }

        if (id in transactionsState.value.externalHistoryUpdates) {
          removeExternalUpdatesIds.push(id);
        }
      }

      if (removeInternalIds.length) {
        removeHistoryByIds(removeInternalIds);
      }

      if (removeExternalUpdatesIds.length) {
        const nextExternalHistoryUpdates = { ...transactionsState.value.externalHistoryUpdates };

        removeExternalUpdatesIds.forEach((id) => {
          delete nextExternalHistoryUpdates[id];
        });

        setExternalHistoryUpdates(nextExternalHistoryUpdates);
      }

      setExternalHistory({
        ...transactionsState.value.externalHistory,
        ...buffer,
      });
      setExternalHistoryTotal(totalCount);
    } catch (error) {
      console.error(error);
    }
  };

  const setFiatPriceObject = (value: FiatPriceObject): void => {
    accountState.value.fiatPriceObject = Object.freeze(value);
  };

  const updateFiatPriceObject = (value?: FiatPriceObject): void => {
    if (!value) {
      return;
    }

    const nextValue = Object.freeze({ ...(accountState.value.fiatPriceObject || {}), ...value });

    accountState.value.alertSubject?.next(nextValue);
    accountState.value.fiatPriceObject = nextValue;
  };

  const clearFiatPriceObject = (): void => {
    accountState.value.fiatPriceObject = {};
  };

  const resetFiatPriceSubscription = (): void => {
    accountState.value.fiatPriceSubscription?.();
    accountState.value.fiatPriceSubscription = null;
  };

  const getFiatPriceObjectUsingIndexer = async (): Promise<void> => {
    const indexer = await getCurrentIndexerService();
    const data = await indexer.services.explorer.price.getFiatPriceObject();

    if (data) {
      setFiatPriceObject(data);
    } else {
      clearFiatPriceObject();
    }
  };

  const getFiatPriceUpdatesUsingIndexer = async (): Promise<void> => {
    const indexer = await getCurrentIndexerService();
    const data = await indexer.services.explorer.price.getFiatPriceUpdates();

    if (data) {
      updateFiatPriceObject(data);
    }
  };

  const subscribeOnFiatUsingCurrentIndexer = async (): Promise<void> => {
    resetFiatPriceSubscription();

    const indexer = await getCurrentIndexerService();
    const subscription = indexer.services.explorer.price.createFiatPriceSubscription(
      (priceObject) => {
        if (priceObject) {
          updateFiatPriceObject(priceObject);
        } else {
          void getFiatPriceUpdatesUsingIndexer();
        }
      },
      () => undefined
    );

    accountState.value.fiatPriceSubscription = subscription;
  };

  const useFiatValuesFromIndexer = async (): Promise<void> => {
    await getFiatPriceObjectUsingIndexer();
    await subscribeOnFiatUsingCurrentIndexer();
  };

  const subscribeOnFiatPrice = async (): Promise<void> => {
    await useFiatValuesFromIndexer();
  };

  const setCeresFiatValuesUsage = (): void => {
    accountState.value.ceresFiatValuesUsage = false;
    settingsStorage.set('ceresFiatValues', false);
  };

  const useCeresApiForFiatValues = async (_flag = false): Promise<void> => {
    setCeresFiatValuesUsage();
    await subscribeOnFiatPrice();
  };

  const subscribeOnAlerts = async (): Promise<void> => {
    const alertsApiService = await loadAlertsApiService();
    const alertSubject = alertsApiService.createPriceAlertSubscription();

    accountState.value.alertSubject = alertSubject;
  };

  const resetAlertsSubscription = (): void => {
    accountState.value.alertSubject?.unsubscribe();
    accountState.value.alertSubject = null;
  };

  const resetBlockNumberSubscription = (): void => {
    settingsState.value.blockNumberSubscription?.unsubscribe();
    settingsState.value.blockNumberSubscription = null;
  };

  const subscribeOnBlockNumber = (): void => {
    resetBlockNumberSubscription();

    const subscription = walletApi.system.getBlockNumberObservable().subscribe((nextBlockNumber) => {
      settingsState.value.blockNumber = nextBlockNumber;
    });

    settingsState.value.blockNumberSubscription = subscription;
  };

  const resetFeeMultiplierAndRuntimeSubscriptions = (): void => {
    settingsState.value.feeMultiplierAndRuntimeSubscriptions?.unsubscribe();
    settingsState.value.feeMultiplierAndRuntimeSubscriptions = null;
  };

  const updateNetworkFees = (value: NetworkFeesObject = {} as NetworkFeesObject): void => {
    const nextNetworkFees = { ...value };

    settingsState.value.networkFees = nextNetworkFees;
    runtimeStorage.set('networkFees', JSON.stringify(nextNetworkFees));
  };

  const setNetworkFees = (value: NetworkFeesObject = {} as NetworkFeesObject): void => {
    const nextNetworkFees = { ...value };

    settingsState.value.networkFees = nextNetworkFees;
    walletApi.NetworkFee = nextNetworkFees;
  };

  const setFeeMultiplier = (multiplier: number): void => {
    settingsState.value.feeMultiplier = multiplier;
    runtimeStorage.set('feeMultiplier', multiplier);
  };

  const setRuntimeVersion = (version: number): void => {
    settingsState.value.runtimeVersion = version;
    runtimeStorage.set('version', version);
  };

  const subscribeOnFeeMultiplierAndRuntime = async (): Promise<void> => {
    resetFeeMultiplierAndRuntimeSubscriptions();

    const { combineLatest } = await loadRxjs();
    const subscription = combineLatest([
      walletApi.system.getRuntimeVersionObservable(),
      walletApi.system.getNetworkFeeMultiplierObservable(),
    ]).subscribe(async ([runtime, multiplier]) => {
      const runtimeVersion = runtimeStorage.get('version');
      const feeMultiplier = runtimeStorage.get('feeMultiplier');
      const networkFeesValue = runtimeStorage.get('networkFees');
      const localMultiplier = feeMultiplier ? Number(JSON.parse(feeMultiplier)) : 0;
      const localRuntime = runtimeVersion ? Number(JSON.parse(runtimeVersion)) : 0;
      const localNetworkFees = networkFeesValue
        ? (JSON.parse(networkFeesValue) as NetworkFeesObject)
        : ({} as NetworkFeesObject);

      if (
        localRuntime === runtime &&
        localMultiplier === multiplier &&
        areLocalNetworkFeesOkay(localNetworkFees, walletApi.NetworkFee)
      ) {
        setNetworkFees(localNetworkFees);
        return;
      }

      if (localMultiplier !== multiplier) {
        setFeeMultiplier(multiplier);
      }

      if (runtime && localRuntime !== runtime) {
        setRuntimeVersion(runtime);
      }

      await walletApi.calcStaticNetworkFees();
      updateNetworkFees(walletApi.NetworkFee);
    });

    settingsState.value.feeMultiplierAndRuntimeSubscriptions = subscription;
  };

  const resetAccountState = (): void => {
    const nextAccountState = createAccountState();

    nextAccountState.whitelistArray = accountState.value.whitelistArray;
    nextAccountState.blacklistArray = accountState.value.blacklistArray;
    nextAccountState.fiatPriceObject = accountState.value.fiatPriceObject;
    nextAccountState.fiatPriceSubscription = accountState.value.fiatPriceSubscription;
    nextAccountState.assets = accountState.value.assets;
    nextAccountState.assetsSubscription = accountState.value.assetsSubscription;
    nextAccountState.availableWallets = accountState.value.availableWallets;

    accountState.value = nextAccountState;
  };

  const toggleHideBalance = (): void => {
    settingsState.value.shouldBalanceBeHidden = !settingsState.value.shouldBalanceBeHidden;
    storage.set('shouldBalanceBeHidden', settingsState.value.shouldBalanceBeHidden);
  };

  const setSignTxDialogVisibility = (flag: boolean): void => {
    transactionsState.value.isSignTxDialogVisible = flag;
  };

  const setSignTxDialogDisabled = (flag: boolean): void => {
    transactionsState.value.isSignTxDialogDisabled = flag;
    settingsStorage.set('signTxDialogDisabled', flag);
  };

  const setConfirmTxDialogDisabled = (flag: boolean): void => {
    transactionsState.value.isConfirmTxDialogDisabled = flag;
    settingsStorage.set('confirmTxDialogDisabled', flag);
  };

  const setSoraNetwork = (value: Nullable<string>): void => {
    settingsState.value.soraNetwork = value;
  };

  const setIndexerEndpoint = (payload: { indexer: string; endpoint: string }): void => {
    const current = settingsState.value.indexers[payload.indexer] ?? {
      endpoint: null,
      status: (payload.endpoint ? 'available' : 'unavailable') as IndexerState['status'],
    };

    settingsState.value.indexers[payload.indexer] = {
      ...current,
      endpoint: payload.endpoint,
      status: (!payload.endpoint ? 'unavailable' : current.status) as IndexerState['status'],
    };
  };

  const setIsDesktop = (flag: boolean): void => {
    accountState.value.isDesktop = flag;
  };

  const navigate = (payload: { name: string; params?: Record<string, unknown> }): void => {
    navigateWallet(payload);
  };

  /** Prepares the internal wallet runtime route before the outer wallet page is entered. */
  const prepareWalletEntryNavigation = (): void => {
    if (!isLoggedIn.value) {
      navigate({ name: RouteNames.WalletConnection });
      return;
    }

    if (currentRoute.value !== RouteNames.Wallet) {
      navigate({ name: RouteNames.Wallet });
    }
  };

  /** Keeps wallet route access synchronized without exposing the router store to feature pages. */
  const syncWalletRoute = (): void => {
    syncWalletCurrentRoute();
  };

  const loginAccount = async (nextAccount: PolkadotJsAccount): Promise<void> => {
    await loginApi(walletApi as never, nextAccount as never, isAppStorageSource(accountState.value.source));
    syncAccountWithStorage();
    await afterLogin();
  };

  const logout = async (): Promise<void> => {
    const forgetCurrentAccount = !isAppStorageSource(accountState.value.source);

    logoutApi(walletApi as never, forgetCurrentAccount);
    resetAccountAssetsSubscription();
    resetExternalHistorySubscription();
    resetAccountState();
    syncWalletRoute();
  };

  const renameAccount = async (payload: { address: string; name: string }): Promise<void> => {
    walletApi.changeAccountName(payload.address, payload.name);
    syncAccountWithStorage();
  };

  const addAsset = async (assetAddress?: string): Promise<void> => {
    if (!assetAddress) {
      return;
    }

    try {
      await walletApi.assets.addAccountAsset(assetAddress);
    } catch (error) {
      console.error('[Add asset]:', error);
    }
  };

  const transfer = async ({ to, amount }: { to: string; amount: string }): Promise<void> => {
    const asset = getWalletCurrentParams<{ asset?: Nullable<AccountAsset> }>().asset ?? null;

    if (!asset) {
      console.warn('[Transfer]: Route asset is unavailable');
      return;
    }

    await walletApi.assets.simpleTransfer(asset, to, amount);
  };

  const getVestedTransferFee = async ({
    asset,
    amount,
    vestingPercent,
    unlockPeriodInDays,
  }: VestedTransferFeeParams): Promise<Nullable<FPNumber>> => {
    try {
      return await walletApi.assets.getVestedTransferFee(
        asset,
        amount,
        settingsState.value.blockNumber,
        vestingPercent,
        unlockPeriodInDays
      );
    } catch (error) {
      console.warn('[Vested Transfer Fee]:', error);
      return null;
    }
  };

  const vestedTransfer = async ({
    to,
    asset,
    amount,
    vestingPercent,
    unlockPeriodInDays,
    start,
    current,
  }: VestedTransferParams): Promise<void> => {
    const diff = Math.floor((start - current) / 6_000);
    const startBlock = diff > 0 ? settingsState.value.blockNumber + diff : settingsState.value.blockNumber;

    await walletApi.assets.vestedTransfer(asset, to, amount, startBlock, vestingPercent, unlockPeriodInDays);
  };

  /** Keeps the deposit-notification queue local-first. */
  const setAssetToNotify = (asset: WhitelistArrayItem): void => {
    accountState.value.assetsToNotifyQueue.push(asset);
  };

  /** Mirrors queue consumption so legacy wallet observers do not resurrect already-notified deposits. */
  const popAssetFromNotificationQueue = (): void => {
    accountState.value.assetsToNotifyQueue.shift();
  };

  const notifyOnDeposit = async (data: { asset: WhitelistArrayItem; message: string }): Promise<void> => {
    const alertsApiService = await loadAlertsApiService();
    await alertsApiService.pushNotification(data.asset, data.message);
    popAssetFromNotificationQueue();
  };

  const afterLogin = async (): Promise<void> => {
    await subscribeOnAccountAssets();
    await subscribeOnExternalHistory();
    syncWalletRoute();
  };

  const setApiKeys = async (keys: Record<string, string>): Promise<void> => {
    settingsState.value.apiKeys = {
      ...settingsState.value.apiKeys,
      ...keys,
    };

    const { googleApi, googleClientId, walletconnect } = settingsState.value.apiKeys;

    if (googleApi && googleClientId) {
      const GDriveStorage = await loadGoogleDriveStorage();
      GDriveStorage.setOptions(googleApi, googleClientId);
    }

    if (walletconnect) {
      setWalletConnectProjectId(walletconnect);
    }
  };

  const setNftStorage = async ({ marketplaceDid, ucan }: { marketplaceDid?: string; ucan?: string } = {}): Promise<void> => {
    settingsState.value.nftStorage =
      marketplaceDid && ucan
        ? await createNftStorage({
            token: ucan,
            did: marketplaceDid,
          })
        : await createNftStorage({ token: settingsState.value.apiKeys.nftStorage });
  };

  const createNftStorageInstance = async (): Promise<void> => {
    if (settingsState.value.soraNetwork === SoraNetwork.Prod) {
      try {
        const { marketplaceDid, ucan } = await IpfsStorage.getUcanTokens();
        await setNftStorage({ marketplaceDid, ucan });
      } catch {
        console.error('Error while getting API keys for NFT marketplace.');
      }
    } else {
      await setNftStorage({});
    }
  };

  const subscribeOnExchangeRatesApi = async (): Promise<void> => {
    resetExchangeRateSubscription();
    const CurrencyExchangeRateService = await loadCurrencyExchangeRateService();
    settingsState.value.exchangeRateUnsubFn = CurrencyExchangeRateService.createExchangeRatesSubscription(
      handleExchangeRatesSuccess,
      handleExchangeRatesError
    );
  };

  const addPriceAlert = (alert: Alert): void => {
    const nextAlerts = [alert, ...settingsState.value.alerts].slice(0, MAX_ALERTS_NUMBER);
    settingsState.value.alerts = nextAlerts;
    settingsStorage.set('alerts', JSON.stringify(nextAlerts));
  };

  const editPriceAlert = (payload: EditableAlertObject): void => {
    settingsState.value.alerts[payload.position] = payload.alert;
    settingsStorage.set('alerts', JSON.stringify(settingsState.value.alerts));
  };

  const removePriceAlert = (position: number): void => {
    settingsState.value.alerts.splice(position, 1);
    settingsStorage.set('alerts', JSON.stringify(settingsState.value.alerts));
  };

  const setPriceAlertAsNotified = (payload: { position: number; value: boolean }): void => {
    const nextAlert = settingsState.value.alerts[payload.position];

    if (!nextAlert) {
      return;
    }

    settingsState.value.alerts[payload.position] = {
      ...nextAlert,
      wasNotified: payload.value,
    };
    settingsStorage.set('alerts', JSON.stringify(settingsState.value.alerts));
  };

  const setDepositNotifications = (value: boolean): void => {
    settingsState.value.allowTopUpAlert = value;
    settingsStorage.set('allowTopUpAlerts', value);
  };

  const setFiatCurrency = (value?: Currency): void => {
    settingsState.value.currency = (value ?? DAI_CURRENCY_KEY) as Currency;
    settingsStorage.set('currency', settingsState.value.currency);
  };

  const updateFiatExchangeRates = (value?: FiatExchangeRateObject): void => {
    const nextRates = {
      [DAI_CURRENCY_KEY]: 1,
      ...(value ?? {}),
    };

    settingsState.value.fiatExchangeRateObject = nextRates;
    settingsStorage.set('fiatExchangeRates', JSON.stringify(nextRates));
  };

  const setAssetsFilter = (value: FilterOptions): void => {
    settingsState.value.assetsFilter = value;
  };

  const setFilterOptions = (value: WalletAssetFilters): void => {
    settingsState.value.filters = value;
    storage.set('filters', JSON.stringify(value));
  };

  const setAllowFeePopup = (flag: boolean): void => {
    settingsState.value.allowFeePopup = flag;
    settingsStorage.set('allowFeePopup', flag.toString());
  };

  const setPermissions = (permissions: Partial<SettingsState['permissions']>): void => {
    if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
      console.error(`Permissions should be an object, ${typeof permissions} is given`);
      return;
    }

    settingsState.value.permissions = {
      ...settingsState.value.permissions,
      ...permissions,
    };
  };

  const setWalletLoaded = (flag: boolean): void => {
    settingsState.value.isWalletLoaded = flag;
  };

  const setIndexerType = (type: string): void => {
    const nextType = resolvePreferredIndexer(type, settingsState.value.indexers);
    if (!nextType) return;

    settingsState.value.indexerType = nextType as SettingsState['indexerType'];
    settingsStorage.set('indexerType', settingsState.value.indexerType);
  };

  const setIndexerStatus = async (payload: { indexer: string; status: IndexerState['status'] }): Promise<void> => {
    const current = settingsState.value.indexers[payload.indexer];

    if (current) {
      current.status = payload.status;
    } else {
      settingsState.value.indexers[payload.indexer] = {
        endpoint: null,
        status: payload.status,
      };
    }

    if (payload.status !== 'unavailable' || settingsState.value.indexerType !== payload.indexer) {
      return;
    }

    const nextIndexer = resolveFallbackIndexer(settingsState.value.indexerType, settingsState.value.indexers);

    if (nextIndexer) {
      await selectIndexer(nextIndexer);
    }
  };

  const resetIndexerSubscriptions = async (): Promise<void> => {
    resetFiatPriceSubscription();
    resetExternalHistorySubscription();
  };

  const activateIndexerSubscriptions = async (): Promise<void> => {
    await Promise.all([subscribeOnFiatPrice(), subscribeOnExternalHistory()]);
  };

  const selectIndexer = async (type: string): Promise<void> => {
    const nextIndexer = resolvePreferredIndexer(type || settingsState.value.indexerType, settingsState.value.indexers);

    if (!nextIndexer) {
      return;
    }

    try {
      await resetIndexerSubscriptions();
      setIndexerType(nextIndexer);
      await activateIndexerSubscriptions();
    } catch (error) {
      console.error(error);
      await setIndexerStatus({ indexer: nextIndexer, status: 'unavailable' });
    }
  };

  const addActiveTransaction = (id: string): void => {
    transactionsState.value.activeTxsIds = [...new Set([...transactionsState.value.activeTxsIds, id])];
  };

  const removeActiveTransactions = (ids: string[]): void => {
    transactionsState.value.activeTxsIds = transactionsState.value.activeTxsIds.filter((txId) => !ids.includes(txId));
  };

  const setPinnedAsset = (asset: AccountAsset): void => {
    accountState.value.pinnedAssets.push(asset.address);
    settingsStorage.set('pinnedAssets', JSON.stringify(accountState.value.pinnedAssets));
  };

  const removePinnedAsset = (asset: AccountAsset): void => {
    accountState.value.pinnedAssets = accountState.value.pinnedAssets.filter((address) => address !== asset.address);
    settingsStorage.set('pinnedAssets', JSON.stringify(accountState.value.pinnedAssets));
  };

  const setMultiplePinnedAssets = (assetAddresses: string[]): void => {
    accountState.value.pinnedAssets = [...new Set(assetAddresses.filter(Boolean))];
    settingsStorage.set('pinnedAssets', JSON.stringify(accountState.value.pinnedAssets));
  };

  const setIsMstAccount = (flag: boolean): void => {
    accountState.value.isMST = flag;
  };

  const setIsMstAddressExist = (flag: boolean): void => {
    accountState.value.isMstAddressExist = flag;
  };

  const setPasswordTimeout = (timeout: number): void => {
    accountState.value.accountPasswordTimeout = timeout;
    settingsStorage.set('accountPasswordTimeout', JSON.stringify(timeout));
  };

  const setAddressToBook = (payload: Pick<PolkadotJsAccount, 'address' | 'name'>): void => {
    if (!payload?.address) {
      return;
    }

    accountState.value.book = {
      ...(accountState.value.book ?? {}),
      [payload.address]: payload.name ?? '',
    };
    settingsStorage.set('book', JSON.stringify(accountState.value.book));
  };

  const removeAddressFromBook = (address: string): void => {
    if (!address) {
      return;
    }

    const nextBook = { ...(accountState.value.book ?? {}) };
    delete nextBook[address];

    accountState.value.book = nextBook;
    settingsStorage.set('book', JSON.stringify(nextBook));
  };

  const setAccountPassphrase = (payload: { address: string; password: string }): void => {
    resetAccountPassphrase(payload.address);

    const address = walletApi.formatAddress(payload.address, false);
    const key = cryptoRandomString({ length: 10, type: 'ascii-printable' });
    const passphrase = AES.encrypt(payload.password, key).toString();

    accountState.value.addressPassphraseMapping = {
      ...accountState.value.addressPassphraseMapping,
      [address]: passphrase,
    };
    accountState.value.addressKeyMapping = {
      ...accountState.value.addressKeyMapping,
      [address]: key,
    };

    const timer = setTimeout(() => resetAccountPassphrase(payload.address), accountState.value.accountPasswordTimeout);

    accountState.value.accountPasswordTimer = {
      ...accountState.value.accountPasswordTimer,
      [address]: timer,
    };
    accountState.value.accountPasswordTimestamp = {
      ...accountState.value.accountPasswordTimestamp,
      [address]: Date.now(),
    };
  };

  const syncAccountWithStorage = (): void => {
    const isExternal = storage.get('isExternal');

    accountState.value.address = storage.get('address') || '';
    accountState.value.name = storage.get('name') || '';
    accountState.value.source = (storage.get('source') as AppWallet) || '';
    accountState.value.isExternal = isExternal ? JSON.parse(isExternal) : false;
  };

  const resetAccountPassphrase = (nextAddress: string): void => {
    const address = walletApi.formatAddress(nextAddress, false);
    const timer = accountState.value.accountPasswordTimer[address];

    if (timer) {
      clearTimeout(timer);
    }

    accountState.value.accountPasswordTimer[address] = null;
    accountState.value.accountPasswordTimestamp[address] = null;
    accountState.value.addressKeyMapping = {
      ...accountState.value.addressKeyMapping,
      [address]: null,
    };
    accountState.value.addressPassphraseMapping = {
      ...accountState.value.addressPassphraseMapping,
      [address]: null,
    };
  };

  const updateAvailableWallets = async (): Promise<void> => {
    try {
      setAvailableWallets(getAppWallets(accountState.value.isDesktop));
    } catch (error) {
      console.error(error);
      setAvailableWallets([]);
    }
  };

  const clearWhitelist = (): void => {
    accountState.value.whitelistArray = [];
  };

  const setWhitelist = (value: WhitelistArrayItem[]): void => {
    accountState.value.whitelistArray = value;
  };

  const clearBlacklist = (): void => {
    accountState.value.blacklistArray = [];
  };

  const setNftBlacklist = (value: AccountState['blacklistArray']): void => {
    accountState.value.blacklistArray = value;
  };

  const getWhitelist = async (): Promise<void> => {
    clearWhitelist();

    try {
      const response = await fetch(resolveStaticAssetUrl(WHITE_LIST_URL), { cache: 'no-cache' });

      if (!response.ok) {
        throw new Error(`Whitelist request failed with status ${response.status}`);
      }

      const payload = await response.text();
      setWhitelist(sanitizeWhitelistPayload(payload));
    } catch (error) {
      clearWhitelist();
      console.error('[whitelist] Unable to load whitelist.', error);
    }
  };

  const getNftBlacklist = async (): Promise<void> => {
    clearBlacklist();

    try {
      const response = await fetch(resolveStaticAssetUrl(NFT_BLACK_LIST_URL), { cache: 'no-cache' });

      if (!response.ok) {
        throw new Error(`NFT blacklist request failed with status ${response.status}`);
      }

      const payload = await response.text();
      setNftBlacklist(sanitizeNftBlacklistPayload(payload));
    } catch (error) {
      clearBlacklist();
      console.error('[nft-blacklist] Unable to load NFT blacklist.', error);
    }
  };

  const checkWalletAvailability = async (): Promise<void> => {
    if (!(isLoggedIn.value && accountState.value.source)) {
      return;
    }

    try {
      if (accountState.value.isExternal) {
        await updateApiSigner(walletApi as never, accountState.value.source as never);
      } else {
        checkWallet(accountState.value.source as never);
      }
    } catch (error) {
      console.error(error);
      await logout();
    }
  };

  const checkConnectedAccountSource = async (source: string): Promise<void> => {
    if (source && account.value?.source === source) {
      await logout();
    }
  };

  const initMultisigAddress = (): void => {
    setIsMstAddressExist(walletApi.mst.isMstAddressExist());
    setIsMstAccount(walletApi.mst.isMST());
  };

  const resetNetworkSubscriptions = async (): Promise<void> => {
    resetBlockNumberSubscription();
    resetFeeMultiplierAndRuntimeSubscriptions();
    resetAssetsSubscription();
    resetAccountAssetsSubscription();
  };

  const resetInternalSubscriptions = async (): Promise<void> => {
    resetActiveTxs();
    resetPendingMstTxsSubscription();
    resetAlertsSubscription();
    resetStorageUpdatesSubscription();
  };

  const activateNetworkSubscriptions = async (): Promise<void> => {
    await Promise.all([
      Promise.resolve(subscribeOnBlockNumber()),
      Promise.resolve(subscribeOnFeeMultiplierAndRuntime()),
      subscribeOnAssets(),
      subscribeOnAccountAssets(),
    ]);
  };

  const activateInternalSubscriptions = async (): Promise<void> => {
    await Promise.all([
      Promise.resolve(trackActiveTxs()),
      trackPendingMstTxs(),
      Promise.resolve(subscribeOnAlerts()),
      Promise.resolve(subscribeToStorageUpdates()),
    ]);
  };

  const trackActiveTxs = (): void => {
    resetActiveTxs();

    const subscription = setInterval(() => {
      if (transactionsState.value.activeTxsIds.length) {
        syncAccountHistory();
      }
    }, UPDATE_ACTIVE_TRANSACTIONS_INTERVAL);

    transactionsState.value.updateActiveTxsId = subscription;
  };

  const resetActiveTxs = (): void => {
    if (transactionsState.value.updateActiveTxsId) {
      clearInterval(transactionsState.value.updateActiveTxsId as number);
    }

    transactionsState.value.activeTxsIds = [];
    transactionsState.value.updateActiveTxsId = null;
  };

  const resetPendingMstTxsSubscription = (): void => {
    transactionsState.value.pendingMstTxsSubscription?.unsubscribe();
    transactionsState.value.pendingMstTxsSubscription = null;
    walletApi.mst.stopPendingTxsSubscription();
  };

  const trackPendingMstTxs = async (): Promise<void> => {
    resetPendingMstTxsSubscription();

    if (!(isLoggedIn.value && walletApi.mst.isMstAddressExist() && address.value)) {
      return;
    }

    try {
      const mstAddress = walletApi.mst.getMstAddress();

      await walletApi.mst.startPendingTxsSubscription(mstAddress);

      const subscription = walletApi.mst.pendingTxsUpdated.subscribe((pendingTxs) => {
        if (pendingTxs?.length) {
          let userAddress = address.value;

          if (walletApi.mst.isMST()) {
            userAddress = walletApi.formatAddress(walletApi.mst.getPrevoiusAccount());
          }

          const pendingApprovalTxs = pendingTxs.filter((tx) => {
            const multisig = (tx as { multisig?: { walletsApproved?: string[] } }).multisig;

            if (!multisig) {
              return false;
            }

            return !multisig.walletsApproved?.includes(userAddress);
          });

          transactionsState.value.pendingMstTransactions = pendingApprovalTxs;
        } else {
          transactionsState.value.pendingMstTransactions = [];
        }

        syncAccountHistory();
      });

      transactionsState.value.pendingMstTxsSubscription = subscription;
    } catch (error) {
      console.error('Error starting MST pending transactions subscription:', error);
    }
  };

  const setTheme = async (nextTheme: Theme): Promise<void> => {
    settingsState.value.theme = normalizeTheme(nextTheme);
    settingsStorage.set('theme', settingsState.value.theme);
  };

  const toggleTheme = async (): Promise<void> => {
    const nextTheme = settingsState.value.theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;

    await setTheme(nextTheme);
  };

  const setIsMstAvailable = (flag: boolean): void => {
    settingsState.value.isMSTAvailable = flag;
  };

  const subscribeToStorageUpdates = (): void => {
    resetStorageUpdatesSubscription();

    storageUpdatesSubscription.value = debounce(100)(() => {
      syncAccountWithStorage();
      syncAccountHistory();
    }) as VoidFunction;

    window.addEventListener('storage', storageUpdatesSubscription.value);
  };

  const resetStorageUpdatesSubscription = (): void => {
    if (!storageUpdatesSubscription.value) {
      return;
    }

    window.removeEventListener('storage', storageUpdatesSubscription.value);
    storageUpdatesSubscription.value = null;
  };

  const createSignDialogController = (): TransactionSignVisibilityController => ({
    setVisibility: (visible: boolean) => {
      setSignTxDialogVisibility(visible);
    },
    subscribe: (handler: (visible: boolean) => void) => {
      return watch(isSignTxDialogVisible, (visible) => {
        handler(Boolean(visible));
      });
    },
  });

  const signBeforeTransaction = async (signerApi: unknown, _mutationType?: string): Promise<void> => {
    await beforeTransactionSign(null, signerApi as never, createSignDialogController(), {
      getPassword,
      isSignTxDialogDisabled: isSignTxDialogDisabled.value,
    });
  };

  return {
    accountState,
    settingsState,
    transactionsState,
    address,
    soraAddress,
    account,
    isLoggedIn,
    whitelist,
    whitelistIdsBySymbol,
    assets,
    accountAssets,
    setAccountAssets,
    isAssetPinned,
    fiatPriceObject,
    assetsDataTable,
    accountAssetsAddressTable,
    pinnedAssets,
    assetsToNotifyQueue,
    availableWallets,
    accountSource,
    currentRoute,
    isExternal,
    isDesktop,
    isMST,
    isMstAccount,
    isMstAddressExist,
    ceresFiatValuesUsage,
    blacklist,
    shouldBalanceBeHidden,
    apiKeys,
    moonpayApiKey,
    currency,
    theme,
    libraryTheme,
    currencySymbol,
    fiatExchangeRateObject,
    exchangeRate,
    networkFees,
    blockNumber,
    isWalletLoaded,
    allowFeePopup,
    permissions,
    filters,
    assetsFilter,
    currencies,
    alerts,
    allowTopUpAlert,
    indexers,
    indexerType,
    activeTransactions,
    firstReadyTransaction,
    selectedTransaction,
    pendingMstTransactions,
    isSignTxDialogVisible,
    isSignTxDialogDisabled,
    isConfirmTxDialogDisabled,
    accountPasswordTimeout,
    accountPasswordTimestamp,
    isMstWarningVisible,
    isMSTAvailable,
    soraNetwork,
    getPassword,
    isConnectedAccount,
    toggleHideBalance,
    setSignTxDialogVisibility,
    setSignTxDialogDisabled,
    setConfirmTxDialogDisabled,
    setSoraNetwork,
    setIndexerEndpoint,
    setIsDesktop,
    navigate,
    prepareWalletEntryNavigation,
    syncWalletRoute,
    loginAccount,
    logout,
    renameAccount,
    addAsset,
    transfer,
    getVestedTransferFee,
    vestedTransfer,
    setAssetToNotify,
    notifyOnDeposit,
    afterLogin,
    setApiKeys,
    createNftStorageInstance,
    subscribeOnExchangeRatesApi,
    addPriceAlert,
    editPriceAlert,
    removePriceAlert,
    setDepositNotifications,
    setFiatCurrency,
    updateFiatExchangeRates,
    setAssetsFilter,
    setFilterOptions,
    setAllowFeePopup,
    setPermissions,
    setWalletLoaded,
    setPriceAlertAsNotified,
    setIndexerStatus,
    selectIndexer,
    addActiveTransaction,
    removeActiveTransactions,
    getHistory,
    setTxDetailsId,
    resetTxDetailsId,
    saveExternalHistoryUpdates,
    resetExternalHistory,
    setPinnedAsset,
    removePinnedAsset,
    setMultiplePinnedAssets,
    setIsMstAccount,
    setIsMstAddressExist,
    setIsMstAvailable,
    setPasswordTimeout,
    setAddressToBook,
    removeAddressFromBook,
    setAccountPassphrase,
    syncAccountWithStorage,
    updateAvailableWallets,
    getWhitelist,
    getNftBlacklist,
    checkWalletAvailability,
    initMultisigAddress,
    subscribeOnAssets,
    resetAssetsSubscription,
    subscribeOnAccountAssets,
    resetAccountAssetsSubscription,
    subscribeOnFiatPrice,
    resetFiatPriceSubscription,
    useCeresApiForFiatValues,
    subscribeOnAlerts,
    resetAlertsSubscription,
    subscribeOnBlockNumber,
    resetBlockNumberSubscription,
    subscribeOnFeeMultiplierAndRuntime,
    resetFeeMultiplierAndRuntimeSubscriptions,
    subscribeOnExternalHistory,
    getExternalHistory,
    resetExternalHistorySubscription,
    resetAccountPassphrase,
    checkConnectedAccountSource,
    resetIndexerSubscriptions,
    activateIndexerSubscriptions,
    resetNetworkSubscriptions,
    resetInternalSubscriptions,
    activateNetworkSubscriptions,
    activateInternalSubscriptions,
    trackActiveTxs,
    resetActiveTxs,
    resetPendingMstTxsSubscription,
    trackPendingMstTxs,
    setTheme,
    toggleTheme,
    subscribeToStorageUpdates,
    resetStorageUpdatesSubscription,
    beforeTransactionSign: signBeforeTransaction,
  };
});

export type WalletStore = ReturnType<typeof useWalletStore>;
