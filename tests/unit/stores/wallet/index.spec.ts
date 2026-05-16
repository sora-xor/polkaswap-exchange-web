import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { Observable } from 'rxjs';

import { RouteNames } from '@/consts';
import { Theme } from '@/consts/theme';
import { NFTStorage } from 'nft.storage';
import { AppWallet, SoraNetwork } from '@/lib/soraneo-wallet/src/consts';
import { NFT_BLACK_LIST_URL, WHITE_LIST_URL } from '@/lib/soraneo-wallet/src/util';
import { Operation, TransactionStatus } from '@sora-substrate/sdk';
import type { WALLET_TYPES } from '@tests/stubs/walletRuntime';

const loginAccountMock = vi.hoisted(() => vi.fn());
const afterLoginMock = vi.hoisted(() => vi.fn());
const resetNetworkSubscriptionsMock = vi.hoisted(() => vi.fn());
const resetInternalSubscriptionsMock = vi.hoisted(() => vi.fn());
const activateNetworkSubscriptionsMock = vi.hoisted(() => vi.fn());
const setSoraNetworkMock = vi.hoisted(() => vi.fn());
const setIndexerEndpointMock = vi.hoisted(() => vi.fn());
const addPriceAlertMock = vi.hoisted(() => vi.fn());
const editPriceAlertMock = vi.hoisted(() => vi.fn());
const removePriceAlertMock = vi.hoisted(() => vi.fn());
const setDepositNotificationsMock = vi.hoisted(() => vi.fn());
const setFiatCurrencyMock = vi.hoisted(() => vi.fn());
const updateFiatExchangeRatesMock = vi.hoisted(() => vi.fn());
const setAssetsFilterMock = vi.hoisted(() => vi.fn());
const setFilterOptionsMock = vi.hoisted(() => vi.fn());
const setAllowFeePopupMock = vi.hoisted(() => vi.fn());
const setIsDesktopMock = vi.hoisted(() => vi.fn());
const selectIndexerMock = vi.hoisted(() => vi.fn());
const addActiveTxMock = vi.hoisted(() => vi.fn());
const removeActiveTxsMock = vi.hoisted(() => vi.fn());
const setIsMSTMock = vi.hoisted(() => vi.fn());
const setIsMstAddressExistMock = vi.hoisted(() => vi.fn());
const syncWithStorageMock = vi.hoisted(() => vi.fn());
const setSignTxDialogDisabledMock = vi.hoisted(() => vi.fn());
const setConfirmTxDialogDisabledMock = vi.hoisted(() => vi.fn());
const setPasswordTimeoutMock = vi.hoisted(() => vi.fn());
const trackPendingMstTxsMock = vi.hoisted(() => vi.fn());
const toggleHideBalanceMock = vi.hoisted(() => vi.fn());
const setSignTxDialogVisibilityMock = vi.hoisted(() => vi.fn());
const setPinnedAssetMock = vi.hoisted(() => vi.fn());
const removePinnedAssetMock = vi.hoisted(() => vi.fn());
const logoutMock = vi.hoisted(() => vi.fn());
const runtimeBridgeAvailable = vi.hoisted(() => ({ value: true }));
const pushNotificationMock = vi.hoisted(() => vi.fn(async () => undefined));
const createPriceAlertSubscriptionMock = vi.hoisted(() => vi.fn(() => ({ unsubscribe: vi.fn() })));
const createExchangeRatesSubscriptionMock = vi.hoisted(() => vi.fn());
const setGoogleDriveOptionsMock = vi.hoisted(() => vi.fn());
const changeAccountNameMock = vi.hoisted(() => vi.fn());
const addAccountAssetMock = vi.hoisted(() => vi.fn(async () => undefined));
const simpleTransferMock = vi.hoisted(() => vi.fn(async () => undefined));
const getVestedTransferFeeMock = vi.hoisted(() => vi.fn(async () => null));
const vestedTransferMock = vi.hoisted(() => vi.fn(async () => undefined));
const removeHistoryMock = vi.hoisted(() => vi.fn());
const loginApiMock = vi.hoisted(() => vi.fn(async () => undefined));
const logoutApiMock = vi.hoisted(() => vi.fn());
const isAppStorageSourceMock = vi.hoisted(() => vi.fn((source?: string) => source === 'sora'));
const accountAssetsUnsubscribeMock = vi.hoisted(() => vi.fn());
const balanceUpdatedSubscribeMock = vi.hoisted(() =>
  vi.fn(() => ({
    unsubscribe: accountAssetsUnsubscribeMock,
  }))
);
const updateAccountAssetsMock = vi.hoisted(() => vi.fn(async () => undefined));
const clearAccountAssetsMock = vi.hoisted(() => vi.fn());
const isNftBlacklistedMock = vi.hoisted(() => vi.fn(() => false));
const externalHistoryUnsubscribeMock = vi.hoisted(() => vi.fn());
const createHistorySubscriptionMock = vi.hoisted(() => vi.fn(() => externalHistoryUnsubscribeMock));
const getExplorerHistoryMock = vi.hoisted(() => vi.fn(async () => ({ nodes: [], totalCount: 0 })));
const parseTransactionAsHistoryItemMock = vi.hoisted(() => vi.fn());
const historyElementsFilterMock = vi.hoisted(() => vi.fn((value) => value));
const getCurrentIndexerMock = vi.hoisted(() => vi.fn());
const createNewAssetsSubscriptionMock = vi.hoisted(() => vi.fn(() => vi.fn()));
const getAssetsMock = vi.hoisted(() => vi.fn(async () => []));
const getFiatPriceObjectMock = vi.hoisted(() => vi.fn(async () => ({ xor: '1' })));
const getFiatPriceUpdatesMock = vi.hoisted(() => vi.fn(async () => ({ xor: '2' })));
const fiatPriceUnsubscribeMock = vi.hoisted(() => vi.fn());
const createFiatPriceSubscriptionMock = vi.hoisted(() => vi.fn(() => fiatPriceUnsubscribeMock));
const blockNumberSubscriptionUnsubscribeMock = vi.hoisted(() => vi.fn());
const blockNumberObservableSubscribeMock = vi.hoisted(() =>
  vi.fn((callback: (value: number) => void) => {
    callback(42);
    return { unsubscribe: blockNumberSubscriptionUnsubscribeMock };
  })
);
const feeRuntimeSubscriptionUnsubscribeMock = vi.hoisted(() => vi.fn());
const runtimeVersionObservableSubscribeMock = vi.hoisted(() => vi.fn());
const networkFeeMultiplierObservableSubscribeMock = vi.hoisted(() => vi.fn());
const calcStaticNetworkFeesMock = vi.hoisted(() => vi.fn(async () => undefined));
const pendingMstTxsUnsubscribeMock = vi.hoisted(() => vi.fn());
const pendingTxsUpdatedSubscribeMock = vi.hoisted(() =>
  vi.fn(() => ({
    unsubscribe: pendingMstTxsUnsubscribeMock,
  }))
);
const startPendingTxsSubscriptionMock = vi.hoisted(() => vi.fn(async () => undefined));
const stopPendingTxsSubscriptionMock = vi.hoisted(() => vi.fn());
const isMstAddressExistApiMock = vi.hoisted(() => vi.fn(() => true));
const getMstAddressMock = vi.hoisted(() => vi.fn(() => 'mst-address'));
const isMstApiMock = vi.hoisted(() => vi.fn(() => false));
const getPreviousAccountMock = vi.hoisted(() => vi.fn(() => 'prev-account'));
const checkWalletMock = vi.hoisted(() => vi.fn());
const getAppWalletsMock = vi.hoisted(() => vi.fn(() => []));
const updateApiSignerMock = vi.hoisted(() => vi.fn(async () => undefined));
const getUcanTokensMock = vi.hoisted(() => vi.fn(async () => ({ marketplaceDid: 'did:market', ucan: 'ucan-token' })));
const fetchMock = vi.hoisted(() => vi.fn());
const waitForAccountPairMock = vi.hoisted(() =>
  vi.fn(async (handler?: () => unknown | Promise<unknown>) => await handler?.())
);

const walletRuntimeBridge = vi.hoisted(() => {
  const subscribers = new Set<(mutation: { type?: unknown }, state?: unknown) => void>();

  const buildState = () => ({
    wallet: {
      account: {
        address: '',
        name: '',
        source: '',
        isExternal: false,
        assets: [],
        assetsSubscription: null,
        accountAssets: [],
        accountAssetsLoading: false,
        accountAssetsLoaded: false,
        alertSubject: null,
        accountAssetsSubscription: null,
        book: {},
        whitelistArray: [],
        blacklistArray: [],
        fiatPriceObject: {},
        fiatPriceSubscription: null,
        ceresFiatValuesUsage: false,
        availableWallets: [],
        addressKeyMapping: {},
        addressPassphraseMapping: {},
        assetsToNotifyQueue: [],
        isDesktop: false,
        accountPasswordTimer: {},
        accountPasswordTimestamp: {},
        accountPasswordTimeout: 900_000,
        pinnedAssets: [],
        isMstAddressExist: false,
        isMST: false,
      },
      settings: {
        apiKeys: {
          moonpay: '',
        },
        alerts: [],
        allowTopUpAlert: false,
        indexerType: 'polkaswap',
        indexers: {
          polkaswap: { endpoint: '', status: 'available' },
        },
        isWalletLoaded: false,
        permissions: {
          addAssets: true,
          addLiquidity: true,
          bridgeAssets: true,
          createAssets: true,
          sendAssets: true,
          swapAssets: true,
          showAssetDetails: true,
        },
        filters: {
          option: 'All',
          verifiedOnly: false,
          zeroBalance: false,
        },
        allowFeePopup: true,
        soraNetwork: null,
        networkFees: {},
        shouldBalanceBeHidden: false,
        feeMultiplier: 0,
        runtimeVersion: 0,
        blockNumber: 0,
        blockNumberSubscription: null,
        feeMultiplierAndRuntimeSubscriptions: null,
        nftStorage: null,
        currency: 'usd',
        currencies: [],
        fiatExchangeRateObject: {
          dai: 1,
          usd: 1,
        },
        exchangeRateUnsubFn: null,
        assetsFilter: 'All',
        isMSTAvailable: false,
        theme: 'light',
      },
      transactions: {
        history: {},
        externalHistory: {},
        externalHistoryUpdates: {},
        saveExternalHistoryUpdates: false,
        externalHistoryTotal: 0,
        externalHistorySubscription: null,
        activeTxsIds: [],
        updateActiveTxsId: null,
        selectedTxId: null,
        isConfirmTxDialogDisabled: false,
        isSignTxDialogDisabled: false,
        isSignTxDialogVisible: false,
        pendingMstTxsSubscription: null,
        pendingMstTransactions: [],
      },
    },
    settings: {
      appConnection: null,
      screenBreakpointClass: '',
      browserNotifPopupVisibility: false,
      browserNotifPopupBlockedVisibility: false,
      isThemePreference: false,
      isTMA: false,
      disclaimerVisibility: false,
      userDisclaimerApprove: false,
      isWalletLoaded: true,
    },
    router: {
      loading: false,
    },
  });

  const store = {
    state: buildState(),
    getters: {} as Record<string, unknown>,
    commit: vi.fn(),
    dispatch: vi.fn(),
    subscribe: vi.fn(),
  };

  const emit = (type = 'wallet/mock'): void => {
    subscribers.forEach((handler) => handler({ type }, store.state));
  };

  const reset = (): void => {
    subscribers.clear();
    store.state = buildState();
    store.getters = {};
    store.subscribe.mockImplementation((handler: (mutation: { type?: unknown }, state?: unknown) => void) => {
      subscribers.add(handler);
      return () => {
        subscribers.delete(handler);
      };
    });
  };

  return {
    store,
    emit,
    reset,
  };
});

vi.stubGlobal('fetch', fetchMock);

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({});
});

vi.mock('@/lib/soraneo-wallet/src/services/alerts', () => ({
  __esModule: true,
  default: {
    pushNotification: pushNotificationMock,
    createPriceAlertSubscription: createPriceAlertSubscriptionMock,
  },
}));

vi.mock('@/lib/soraneo-wallet/src/services/currency', () => ({
  CurrencyExchangeRateService: {
    createExchangeRatesSubscription: createExchangeRatesSubscriptionMock,
  },
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: getCurrentIndexerMock,
}));

vi.mock('@/lib/soraneo-wallet/src/services/google', () => ({
  GDriveStorage: {
    setOptions: setGoogleDriveOptionsMock,
  },
}));

vi.mock('@/lib/soraneo-wallet/src/services/wallet', () => ({
  checkWallet: checkWalletMock,
  getAppWallets: getAppWalletsMock,
}));

vi.mock('@/lib/soraneo-wallet/src/util/account', () => ({
  loginApi: loginApiMock,
  logoutApi: logoutApiMock,
  isAppStorageSource: isAppStorageSourceMock,
  updateApiSigner: updateApiSignerMock,
}));

vi.mock('@/lib/soraneo-wallet/src/util/ipfsStorage', () => ({
  IpfsStorage: {
    getUcanTokens: getUcanTokensMock,
  },
}));

vi.mock('@/utils/walletReady', () => {
  return {
    waitForAccountPair: waitForAccountPairMock,
  };
});

vi.mock('@/utils/staticAssets', () => ({
  resolveStaticAssetUrl: (value: string) => `https://app.test/${value}`,
  resolveVersionedStaticAssetUrl: (value: string) => `https://app.test/${value}`,
}));

vi.mock('@/lib/substrate/sdk/types', () => ({
  Operation: {
    AddLiquidity: 'AddLiquidity',
    BatchAll: 'BatchAll',
    BorrowVaultDebt: 'BorrowVaultDebt',
    Burn: 'Burn',
    BurnWithRemark: 'BurnWithRemark',
    CreatePair: 'CreatePair',
    CreateVault: 'CreateVault',
    EthBridgeIncoming: 'EthBridgeIncoming',
    EthBridgeOutgoing: 'EthBridgeOutgoing',
    EvmIncoming: 'EvmIncoming',
    EvmOutgoing: 'EvmOutgoing',
    Mint: 'Mint',
    RegisterAsset: 'RegisterAsset',
    RepayVaultDebt: 'RepayVaultDebt',
    SwapAndSend: 'SwapAndSend',
    SwapTransferBatch: 'SwapTransferBatch',
    Transfer: 'Transfer',
    VestedTransfer: 'VestedTransfer',
    XorEvmTransfer: 'XorEvmTransfer',
  },
  TransactionStatus: {
    Error: 'Error',
    Failed: 'Failed',
    Finalized: 'Finalized',
    InBlock: 'InBlock',
    Pending: 'Pending',
  },
}));

vi.mock('@/lib/substrate/sdk/api', async () => {
  const sdk = await import('@stubs/sora-sdk');

  return {
    api: sdk.api,
    connection: sdk.connection,
  };
});

vi.mock('nft.storage', async () => {
  return await import('@tests/stubs/nft-storage');
});

import { useRouterStore } from '@/stores/router';
import { useWalletStore } from '@/stores/wallet';
import { api as walletApi } from '@/lib/soraneo-wallet/src/api';
import { storage } from '@/lib/soraneo-wallet/src/util/storage';

Object.assign(walletApi as Record<string, unknown>, {
  changeAccountName: changeAccountNameMock,
  formatAddress: (address: string) => address,
});
Object.assign(((walletApi as Record<string, unknown>).assets ??= {}) as Record<string, unknown>, {
  addAccountAsset: addAccountAssetMock,
  simpleTransfer: simpleTransferMock,
  getVestedTransferFee: getVestedTransferFeeMock,
  vestedTransfer: vestedTransferMock,
  balanceUpdated: {
    subscribe: balanceUpdatedSubscribeMock,
  },
  getAssets: getAssetsMock,
  updateAccountAssets: updateAccountAssetsMock,
  clearAccountAssets: clearAccountAssetsMock,
  isNftBlacklisted: isNftBlacklistedMock,
  accountAssets: [],
});
Object.assign(walletApi as Record<string, unknown>, {
  history: {},
  removeHistory: removeHistoryMock,
});
Object.assign(((walletApi as Record<string, unknown>).system ??= {}) as Record<string, unknown>, {
  getBlockNumberObservable: () => ({
    subscribe: blockNumberObservableSubscribeMock,
  }),
  getRuntimeVersionObservable: () =>
    new Observable<number>((subscriber) => {
      runtimeVersionObservableSubscribeMock();
      subscriber.next(1);
      return () => feeRuntimeSubscriptionUnsubscribeMock();
    }),
  getNetworkFeeMultiplierObservable: () =>
    new Observable<number>((subscriber) => {
      networkFeeMultiplierObservableSubscribeMock();
      subscriber.next(2);
      return () => feeRuntimeSubscriptionUnsubscribeMock();
    }),
});
Object.assign(((walletApi as Record<string, unknown>).mst ??= {}) as Record<string, unknown>, {
  isMstAddressExist: isMstAddressExistApiMock,
  getMstAddress: getMstAddressMock,
  startPendingTxsSubscription: startPendingTxsSubscriptionMock,
  pendingTxsUpdated: {
    subscribe: pendingTxsUpdatedSubscribeMock,
  },
  stopPendingTxsSubscription: stopPendingTxsSubscriptionMock,
  isMST: isMstApiMock,
  getPrevoiusAccount: getPreviousAccountMock,
});
(walletApi as Record<string, unknown>).calcStaticNetworkFees = calcStaticNetworkFeesMock;
(walletApi as Record<string, unknown>).NetworkFee = { Swap: '100' };

describe('wallet store actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    walletRuntimeBridge.reset();
    runtimeBridgeAvailable.value = true;
    globalThis.localStorage?.clear();
    fetchMock.mockReset();
    createPriceAlertSubscriptionMock.mockClear();
    setGoogleDriveOptionsMock.mockClear();

    walletRuntimeBridge.store.commit.mockImplementation((type: string, payload?: unknown) => {
      const { account, settings, transactions } = walletRuntimeBridge.store.state.wallet;

      switch (type) {
        case 'wallet/account/setIsMST':
          account.isMST = Boolean(payload);
          setIsMSTMock(payload);
          break;
        case 'wallet/account/setIsMstAddressExist':
          account.isMstAddressExist = Boolean(payload);
          setIsMstAddressExistMock(payload);
          break;
        case 'wallet/account/syncWithStorage':
          account.address = storage.get('address') || '';
          account.name = storage.get('name') || '';
          account.source = storage.get('source') || '';
          account.isExternal = JSON.parse(storage.get('isExternal') || 'false');
          syncWithStorageMock();
          break;
        case 'wallet/account/setAssets':
          account.assets = payload as never;
          break;
        case 'wallet/account/setAssetsSubscription':
          account.assetsSubscription = payload as never;
          break;
        case 'wallet/account/resetAssetsSubscription':
          account.assetsSubscription = null;
          break;
        case 'wallet/account/setAccountAssets':
          account.accountAssets = payload as never;
          break;
        case 'wallet/account/setAvailableWallets':
          account.availableWallets = payload as never;
          break;
        case 'wallet/account/setFiatPriceObject':
          account.fiatPriceObject = payload as never;
          break;
        case 'wallet/account/updateFiatPriceObject':
          account.fiatPriceObject = { ...account.fiatPriceObject, ...(payload as Record<string, string>) };
          break;
        case 'wallet/account/clearFiatPriceObject':
          account.fiatPriceObject = {};
          break;
        case 'wallet/account/setFiatPriceSubscription':
          account.fiatPriceSubscription = payload as never;
          break;
        case 'wallet/account/resetFiatPriceSubscription':
          account.fiatPriceSubscription = null;
          break;
        case 'wallet/account/setAlertSubject':
          account.alertSubject = payload as never;
          break;
        case 'wallet/account/resetAlertSubscription':
          account.alertSubject = null;
          break;
        case 'wallet/account/setCeresFiatValuesUsage':
          account.ceresFiatValuesUsage = Boolean(payload);
          break;
        case 'wallet/account/setPasswordTimeout':
          account.accountPasswordTimeout = Number(payload);
          setPasswordTimeoutMock(payload);
          break;
        case 'wallet/account/setAccountPassphrase':
          account.addressPassphraseMapping[(payload as { address: string }).address] = 'encrypted';
          account.addressKeyMapping[(payload as { address: string }).address] = 'key';
          break;
        case 'wallet/account/setAccountPassphraseTimer':
          account.accountPasswordTimer[(payload as { address: string }).address] = (payload as { timer: unknown })
            .timer as never;
          account.accountPasswordTimestamp[(payload as { address: string }).address] = 123_456;
          break;
        case 'wallet/account/resetAccountPassphraseTimer':
          account.accountPasswordTimer[payload as string] = null;
          account.accountPasswordTimestamp[payload as string] = null;
          break;
        case 'wallet/account/resetAccountPassphrase':
          account.addressKeyMapping[payload as string] = null;
          account.addressPassphraseMapping[payload as string] = null;
          break;
        case 'wallet/account/resetAccountAssetsSubscription':
          account.accountAssetsSubscription = null;
          break;
        case 'wallet/account/setAccountAssetsSubscription':
          account.accountAssetsSubscription = payload as never;
          break;
        case 'wallet/account/resetAccount':
          account.address = '';
          account.name = '';
          account.source = '';
          account.isExternal = false;
          account.accountAssets = [];
          account.assetsToNotifyQueue = [];
          account.accountAssetsSubscription = null;
          account.addressKeyMapping = {};
          account.addressPassphraseMapping = {};
          account.accountPasswordTimer = {};
          account.accountPasswordTimestamp = {};
          account.isMstAddressExist = false;
          account.isMST = false;
          break;
        case 'wallet/account/clearWhitelist':
          account.whitelistArray = [];
          break;
        case 'wallet/account/setWhitelist':
          account.whitelistArray = payload as never;
          break;
        case 'wallet/account/clearBlacklist':
          account.blacklistArray = [];
          break;
        case 'wallet/account/setNftBlacklist':
          account.blacklistArray = payload as never;
          break;
        case 'wallet/account/setIsDesktop':
          account.isDesktop = Boolean(payload);
          setIsDesktopMock(payload);
          break;
        case 'wallet/account/setAssetToNotify':
          account.assetsToNotifyQueue.push(payload as never);
          break;
        case 'wallet/account/popAssetFromNotificationQueue':
          account.assetsToNotifyQueue.shift();
          break;
        case 'wallet/account/setPinnedAsset':
          account.pinnedAssets.push((payload as { address: string }).address);
          setPinnedAssetMock(payload);
          break;
        case 'wallet/account/setMultiplePinnedAssets':
          account.pinnedAssets = payload as never;
          break;
        case 'wallet/account/removePinnedAsset':
          account.pinnedAssets = account.pinnedAssets.filter(
            (address: string) => address !== (payload as { address: string }).address
          );
          removePinnedAssetMock(payload);
          break;
        case 'wallet/account/setAddressToBook':
          account.book = {
            ...account.book,
            [(payload as { address: string }).address]: (payload as { name: string }).name,
          };
          break;
        case 'wallet/account/removeAddressFromBook':
          delete account.book[payload as string];
          break;
        case 'wallet/settings/toggleHideBalance':
          settings.shouldBalanceBeHidden = !settings.shouldBalanceBeHidden;
          toggleHideBalanceMock();
          break;
        case 'wallet/settings/setSoraNetwork':
          settings.soraNetwork = payload as string | null;
          setSoraNetworkMock(payload);
          break;
        case 'wallet/settings/setApiKeys':
          settings.apiKeys = {
            ...settings.apiKeys,
            ...(payload as Record<string, string>),
          };
          break;
        case 'wallet/settings/setNftStorage': {
          const { marketplaceDid, ucan } = (payload as { marketplaceDid?: string; ucan?: string }) ?? {};
          settings.nftStorage =
            marketplaceDid && ucan
              ? new NFTStorage({ token: ucan, did: marketplaceDid })
              : new NFTStorage({ token: settings.apiKeys.nftStorage });
          break;
        }
        case 'wallet/settings/setIndexerEndpoint':
          settings.indexers[(payload as { indexer: string }).indexer] = {
            ...settings.indexers[(payload as { indexer: string }).indexer],
            endpoint: (payload as { endpoint: string }).endpoint,
            status: (payload as { endpoint: string }).endpoint
              ? (settings.indexers[(payload as { indexer: string }).indexer]?.status ?? 'available')
              : 'unavailable',
          };
          setIndexerEndpointMock(payload);
          break;
        case 'wallet/settings/addPriceAlert':
          settings.alerts = [payload as any, ...settings.alerts].slice(0, 10);
          addPriceAlertMock(payload);
          break;
        case 'wallet/settings/editPriceAlert':
          settings.alerts[(payload as { position: number }).position] = (payload as { alert: unknown }).alert as any;
          editPriceAlertMock(payload);
          break;
        case 'wallet/settings/removePriceAlert':
          settings.alerts.splice(Number(payload), 1);
          removePriceAlertMock(payload);
          break;
        case 'wallet/settings/setDepositNotifications':
          settings.allowTopUpAlert = Boolean(payload);
          setDepositNotificationsMock(payload);
          break;
        case 'wallet/settings/setFiatCurrency':
          settings.currency = (payload as string | undefined) ?? 'dai';
          setFiatCurrencyMock(payload);
          break;
        case 'wallet/settings/updateFiatExchangeRates':
          settings.fiatExchangeRateObject = {
            dai: 1,
            ...((payload as Record<string, number> | undefined) ?? {}),
          };
          updateFiatExchangeRatesMock(payload);
          break;
        case 'wallet/settings/setAssetsFilter':
          settings.assetsFilter = payload as string;
          setAssetsFilterMock(payload);
          break;
        case 'wallet/settings/setFilterOptions':
          settings.filters = payload as typeof settings.filters;
          setFilterOptionsMock(payload);
          break;
        case 'wallet/settings/setAllowFeePopup':
          settings.allowFeePopup = Boolean(payload);
          setAllowFeePopupMock(payload);
          break;
        case 'wallet/settings/setPermissions':
          settings.permissions = {
            ...settings.permissions,
            ...(payload as Record<string, boolean>),
          };
          break;
        case 'wallet/settings/setExchangeRateUnsubFn':
          settings.exchangeRateUnsubFn = payload as never;
          break;
        case 'wallet/settings/setPriceAlertAsNotified':
          settings.alerts[(payload as { position: number }).position] = {
            ...(settings.alerts[(payload as { position: number }).position] ?? {}),
            wasNotified: (payload as { value: boolean }).value,
          } as never;
          break;
        case 'wallet/settings/setIndexerType':
          settings.indexerType = payload as never;
          break;
        case 'wallet/settings/setIndexerStatus':
          settings.indexers[(payload as { indexer: string }).indexer].status = (payload as { status: string })
            .status as never;
          break;
        case 'wallet/settings/setTheme':
          settings.theme = payload as never;
          break;
        case 'wallet/settings/setIsMstAvailable':
          settings.isMSTAvailable = Boolean(payload);
          break;
        case 'wallet/settings/setWalletLoaded':
          settings.isWalletLoaded = Boolean(payload);
          break;
        case 'wallet/settings/setBlockNumber':
          settings.blockNumber = Number(payload);
          break;
        case 'wallet/settings/setBlockNumberSubscription':
          settings.blockNumberSubscription = payload as never;
          break;
        case 'wallet/settings/resetBlockNumberSubscription':
          settings.blockNumberSubscription = null;
          break;
        case 'wallet/settings/setFeeMultiplier':
          settings.feeMultiplier = Number(payload);
          break;
        case 'wallet/settings/setRuntimeVersion':
          settings.runtimeVersion = Number(payload);
          break;
        case 'wallet/settings/setNetworkFees':
        case 'wallet/settings/updateNetworkFees':
          settings.networkFees = payload as never;
          break;
        case 'wallet/settings/setFeeMultiplierAndRuntimeSubscriptions':
          settings.feeMultiplierAndRuntimeSubscriptions = payload as never;
          break;
        case 'wallet/settings/resetFeeMultiplierAndRuntimeSubscriptions':
          settings.feeMultiplierAndRuntimeSubscriptions = null;
          break;
        case 'wallet/transactions/setSignTxDialogVisibility':
          transactions.isSignTxDialogVisible = Boolean(payload);
          setSignTxDialogVisibilityMock(payload);
          break;
        case 'wallet/transactions/setSignTxDialogDisabled':
          transactions.isSignTxDialogDisabled = Boolean(payload);
          setSignTxDialogDisabledMock(payload);
          break;
        case 'wallet/transactions/setConfirmTxDialogDisabled':
          transactions.isConfirmTxDialogDisabled = Boolean(payload);
          setConfirmTxDialogDisabledMock(payload);
          break;
        case 'wallet/transactions/getHistory':
          transactions.history = Object.freeze({ ...(walletApi.history as Record<string, unknown>) }) as never;
          break;
        case 'wallet/transactions/setExternalHistory':
          transactions.externalHistory = Object.freeze({ ...((payload as Record<string, unknown>) ?? {}) }) as never;
          break;
        case 'wallet/transactions/setExternalHistoryUpdates':
          transactions.externalHistoryUpdates = Object.freeze({
            ...((payload as Record<string, unknown>) ?? {}),
          }) as never;
          break;
        case 'wallet/transactions/setExternalHistoryTotal':
          transactions.externalHistoryTotal = Number(payload);
          break;
        case 'wallet/transactions/setTxDetailsId':
          transactions.selectedTxId = payload as never;
          break;
        case 'wallet/transactions/resetTxDetailsId':
          transactions.selectedTxId = null;
          break;
        case 'wallet/transactions/removeHistoryByIds':
          transactions.activeTxsIds = transactions.activeTxsIds.filter(
            (id: string) => !(payload as string[]).includes(id)
          );
          removeHistoryMock(...((payload as string[]) ?? []));
          break;
        case 'wallet/transactions/saveExternalHistoryUpdates':
          transactions.saveExternalHistoryUpdates = Boolean(payload);
          break;
        case 'wallet/transactions/resetExternalHistory':
          transactions.externalHistory = {};
          transactions.externalHistoryUpdates = {};
          transactions.externalHistoryTotal = 0;
          break;
        case 'wallet/transactions/addActiveTx':
          transactions.activeTxsIds = [...new Set([...transactions.activeTxsIds, payload as string])];
          addActiveTxMock(payload);
          break;
        case 'wallet/transactions/setExternalHistorySubscription':
          transactions.externalHistorySubscription = payload as never;
          break;
        case 'wallet/transactions/resetExternalHistorySubscription':
          transactions.externalHistorySubscription = null;
          break;
        case 'wallet/transactions/setActiveTxsSubscription':
          transactions.updateActiveTxsId = payload as never;
          break;
        case 'wallet/transactions/resetActiveTxs':
          transactions.updateActiveTxsId = null;
          transactions.activeTxsIds = [];
          break;
        case 'wallet/transactions/resetPendingMstTxsSubscription':
          transactions.pendingMstTxsSubscription = null;
          break;
        case 'wallet/transactions/setPendingMstTransactions':
          transactions.pendingMstTransactions = payload as never;
          break;
        case 'wallet/transactions/setPendingMstTxsSubscription':
          transactions.pendingMstTxsSubscription = payload as never;
          break;
        case 'wallet/transactions/removeActiveTxs':
          transactions.activeTxsIds = transactions.activeTxsIds.filter(
            (id: string) => !(payload as string[]).includes(id)
          );
          removeActiveTxsMock(payload);
          break;
        default:
          break;
      }

      walletRuntimeBridge.emit(type);
      return undefined;
    });

    walletRuntimeBridge.store.dispatch.mockImplementation(async (type: string, payload?: unknown) => {
      const { settings } = walletRuntimeBridge.store.state.wallet;

      switch (type) {
        case 'wallet/account/loginAccount':
          await loginAccountMock(payload);
          break;
        case 'wallet/account/afterLogin':
          await afterLoginMock();
          break;
        case 'wallet/account/logout':
          await logoutMock();
          break;
        case 'wallet/settings/selectIndexer':
          await selectIndexerMock(payload);
          break;
        case 'wallet/subscriptions/resetNetworkSubscriptions':
          await resetNetworkSubscriptionsMock();
          break;
        case 'wallet/subscriptions/resetInternalSubscriptions':
          await resetInternalSubscriptionsMock();
          break;
        case 'wallet/subscriptions/activateNetwokSubscriptions':
          await activateNetworkSubscriptionsMock();
          break;
        case 'wallet/transactions/trackPendingMstTxs':
          await trackPendingMstTxsMock();
          break;
        default:
          break;
      }

      walletRuntimeBridge.emit(type);
      return undefined;
    });

    changeAccountNameMock.mockReset();
    addAccountAssetMock.mockReset();
    addAccountAssetMock.mockImplementation(async () => undefined);
    loginApiMock.mockReset();
    loginApiMock.mockImplementation(async (_api, account: WALLET_TYPES.PolkadotJsAccount) => {
      storage.set('address', account.address);
      storage.set('name', account.name);
      storage.set('source', account.source);
      storage.set('isExternal', JSON.stringify(false));
    });
    logoutApiMock.mockReset();
    logoutApiMock.mockImplementation(() => {
      storage.set('address', '');
      storage.set('name', '');
      storage.set('source', '');
      storage.set('isExternal', JSON.stringify(false));
    });
    isAppStorageSourceMock.mockClear();
    balanceUpdatedSubscribeMock.mockClear();
    updateAccountAssetsMock.mockReset();
    updateAccountAssetsMock.mockImplementation(async () => undefined);
    waitForAccountPairMock.mockClear();
    clearAccountAssetsMock.mockClear();
    isNftBlacklistedMock.mockClear();
    getAssetsMock.mockReset();
    getAssetsMock.mockImplementation(async () => []);
    createHistorySubscriptionMock.mockClear();
    createNewAssetsSubscriptionMock.mockClear();
    parseTransactionAsHistoryItemMock.mockReset();
    parseTransactionAsHistoryItemMock.mockResolvedValue(null);
    getFiatPriceObjectMock.mockReset();
    getFiatPriceObjectMock.mockResolvedValue({ xor: '1' });
    getFiatPriceUpdatesMock.mockReset();
    getFiatPriceUpdatesMock.mockResolvedValue({ xor: '2' });
    createFiatPriceSubscriptionMock.mockReset();
    createFiatPriceSubscriptionMock.mockReturnValue(fiatPriceUnsubscribeMock);
    blockNumberObservableSubscribeMock.mockClear();
    runtimeVersionObservableSubscribeMock.mockClear();
    networkFeeMultiplierObservableSubscribeMock.mockClear();
    calcStaticNetworkFeesMock.mockReset();
    calcStaticNetworkFeesMock.mockImplementation(async () => undefined);
    startPendingTxsSubscriptionMock.mockReset();
    startPendingTxsSubscriptionMock.mockImplementation(async () => undefined);
    stopPendingTxsSubscriptionMock.mockClear();
    pendingTxsUpdatedSubscribeMock.mockClear();
    pendingMstTxsUnsubscribeMock.mockClear();
    isMstAddressExistApiMock.mockReset();
    isMstAddressExistApiMock.mockReturnValue(true);
    getMstAddressMock.mockReset();
    getMstAddressMock.mockReturnValue('mst-address');
    isMstApiMock.mockReset();
    isMstApiMock.mockReturnValue(false);
    getPreviousAccountMock.mockReset();
    getPreviousAccountMock.mockReturnValue('prev-account');
    checkWalletMock.mockReset();
    getAppWalletsMock.mockReset();
    getAppWalletsMock.mockReturnValue([]);
    updateApiSignerMock.mockReset();
    updateApiSignerMock.mockImplementation(async () => undefined);
    getCurrentIndexerMock.mockReset();
    getCurrentIndexerMock.mockReturnValue({
      historyElementsFilter: historyElementsFilterMock,
      services: {
        explorer: {
          account: {
            createHistorySubscription: createHistorySubscriptionMock,
            getHistory: getExplorerHistoryMock,
          },
          asset: {
            createNewAssetsSubscription: createNewAssetsSubscriptionMock,
          },
          price: {
            getFiatPriceObject: getFiatPriceObjectMock,
            getFiatPriceUpdates: getFiatPriceUpdatesMock,
            createFiatPriceSubscription: createFiatPriceSubscriptionMock,
          },
        },
        dataParser: {
          supportedOperations: [Operation.Swap],
          parseTransactionAsHistoryItem: parseTransactionAsHistoryItemMock,
        },
      },
    });
    pushNotificationMock.mockClear();
    createExchangeRatesSubscriptionMock.mockReset();
    createExchangeRatesSubscriptionMock.mockReturnValue(() => undefined);
    simpleTransferMock.mockReset();
    simpleTransferMock.mockResolvedValue(undefined);
    getVestedTransferFeeMock.mockReset();
    getVestedTransferFeeMock.mockResolvedValue(null);
    vestedTransferMock.mockReset();
    vestedTransferMock.mockResolvedValue(undefined);
    removeHistoryMock.mockReset();
    getExplorerHistoryMock.mockReset();
    getExplorerHistoryMock.mockResolvedValue({ nodes: [], totalCount: 0 });
    historyElementsFilterMock.mockReset();
    historyElementsFilterMock.mockImplementation((value) => value);
    getUcanTokensMock.mockReset();
    getUcanTokensMock.mockResolvedValue({ marketplaceDid: 'did:market', ucan: 'ucan-token' });
    (walletApi as Record<string, unknown>).history = {};
    Object.assign(((walletApi as Record<string, unknown>).assets ??= {}) as Record<string, unknown>, {
      accountAssets: [],
      accountAssetsAddresses: [],
    });
  });

  it('builds wallet getters from local Pinia state', () => {
    const walletStore = useWalletStore();

    walletStore.accountState.address = 'addr';
    walletStore.accountState.name = 'Alice';
    walletStore.accountState.source = AppWallet.PolkadotJS;
    walletStore.accountState.assets = [{ address: 'xor', symbol: 'XOR', name: 'SORA', decimals: 18 }] as never;
    walletStore.transactionsState.history = {
      'tx-1': { id: 'tx-1', status: TransactionStatus.InBlock },
    } as never;
    walletStore.transactionsState.activeTxsIds = ['tx-1'];
    walletStore.settingsState.shouldBalanceBeHidden = true;
    walletStore.accountState.isDesktop = true;

    expect(walletStore.address).toBe('addr');
    expect(walletStore.account).toEqual({
      address: 'addr',
      name: 'Alice',
      source: 'polkadot-js',
    });
    expect(walletStore.isLoggedIn).toBe(true);
    expect(walletStore.assetsDataTable).toEqual({
      xor: { address: 'xor', symbol: 'XOR', name: 'SORA', decimals: 18 },
    });
    expect(walletStore.firstReadyTransaction).toEqual({
      id: 'tx-1',
      status: TransactionStatus.InBlock,
    });
    expect(walletStore.shouldBalanceBeHidden).toBe(true);
    expect(walletStore.isDesktop).toBe(true);
  });

  it('exposes wallet visibility flag and transaction helpers', () => {
    const walletStore = useWalletStore();

    expect(walletStore.shouldBalanceBeHidden).toBe(false);
    expect(walletStore.isDesktop).toBe(false);

    walletStore.toggleHideBalance();
    expect(walletStore.shouldBalanceBeHidden).toBe(true);

    walletStore.addActiveTransaction('tx-1');
    expect(walletStore.transactionsState.activeTxsIds).toEqual(['tx-1']);

    walletStore.removeActiveTransactions(['tx-1']);
    expect(walletStore.transactionsState.activeTxsIds).toEqual([]);

    walletStore.setIsMstAccount(true);
    expect(walletStore.isMstAccount).toBe(true);

    storage.set('address', 'sync-address');
    storage.set('name', 'Sync User');
    storage.set('source', 'polkadot-js');
    walletStore.syncAccountWithStorage();
    expect(walletStore.account).toEqual({
      address: 'sync-address',
      name: 'Sync User',
      source: 'polkadot-js',
    });
  });

  it('exposes transaction history collections for wallet UI components', () => {
    const walletStore = useWalletStore();

    walletStore.transactionsState.history = {
      'tx-local': { id: 'tx-local', status: TransactionStatus.Finalized },
    } as never;
    walletStore.transactionsState.externalHistory = {
      'tx-external': { id: 'tx-external', status: TransactionStatus.Finalized },
    } as never;
    walletStore.transactionsState.externalHistoryUpdates = {
      'tx-update': { id: 'tx-update', status: TransactionStatus.Pending },
    } as never;
    walletStore.transactionsState.externalHistoryTotal = 3;

    expect(walletStore.history).toEqual({
      'tx-local': { id: 'tx-local', status: TransactionStatus.Finalized },
    });
    expect(walletStore.externalHistory).toEqual({
      'tx-external': { id: 'tx-external', status: TransactionStatus.Finalized },
    });
    expect(walletStore.externalHistoryUpdates).toEqual({
      'tx-update': { id: 'tx-update', status: TransactionStatus.Pending },
    });
    expect(walletStore.externalHistoryTotal).toBe(3);
  });

  it('exposes account book, source, and NFT storage aliases for wallet UI components', () => {
    const walletStore = useWalletStore();
    const storageInstance = { store: vi.fn() };

    walletStore.accountState.source = 'polkadot-js' as any;
    walletStore.accountState.book = {
      cnContact: 'Saved Contact',
    };
    walletStore.settingsState.nftStorage = storageInstance as never;

    expect(walletStore.source).toBe(AppWallet.PolkadotJS);
    expect(walletStore.book).toEqual({
      cnContact: 'Saved Contact',
    });
    expect(walletStore.nftStorage).toEqual(storageInstance);
  });

  it('exposes password timeout state and forwards MST dialog helpers', async () => {
    const walletStore = useWalletStore();

    walletStore.accountState.accountPasswordTimeout = 1_800_000;
    walletStore.accountState.accountPasswordTimestamp = { addr: 123_456 } as never;
    walletStore.transactionsState.isSignTxDialogDisabled = true;
    walletStore.transactionsState.isConfirmTxDialogDisabled = true;

    expect(walletStore.accountPasswordTimeout).toBe(1_800_000);
    expect(walletStore.accountPasswordTimestamp).toEqual({ addr: 123_456 });
    expect(walletStore.isSignTxDialogDisabled).toBe(true);
    expect(walletStore.isConfirmTxDialogDisabled).toBe(true);

    walletStore.setSignTxDialogDisabled(true);
    walletStore.setConfirmTxDialogDisabled(true);
    walletStore.setPasswordTimeout(600_000);
    walletStore.setIsMstAddressExist(true);

    const resetAddress = 'addr';
    walletStore.accountState.accountPasswordTimer = { [resetAddress]: 1 as never };
    walletStore.accountState.accountPasswordTimestamp = { [resetAddress]: 123_456 };
    walletStore.accountState.addressKeyMapping = { [resetAddress]: 'key' };
    walletStore.accountState.addressPassphraseMapping = { [resetAddress]: 'secret' };
    walletStore.resetAccountPassphrase('addr');
    expect(walletStore.accountState.isMstAddressExist).toBe(true);

    expect(walletStore.accountState.accountPasswordTimer[resetAddress] ?? null).toBeNull();
    expect(walletStore.accountState.accountPasswordTimestamp[resetAddress] ?? null).toBeNull();
    expect(walletStore.accountState.addressKeyMapping[resetAddress] ?? null).toBeNull();
    expect(walletStore.accountState.addressPassphraseMapping[resetAddress] ?? null).toBeNull();

    walletStore.accountState.address = 'addr';
    walletStore.accountState.name = 'Alice';
    walletStore.accountState.source = 'polkadot-js' as any;
    await walletStore.checkConnectedAccountSource('polkadot-js');
    await walletStore.trackPendingMstTxs();

    expect(walletStore.isSignTxDialogDisabled).toBe(true);
    expect(walletStore.isConfirmTxDialogDisabled).toBe(true);
    expect(walletStore.accountPasswordTimeout).toBe(600_000);
    expect(logoutApiMock).toHaveBeenCalledTimes(1);
    expect(startPendingTxsSubscriptionMock).not.toHaveBeenCalled();
    expect(stopPendingTxsSubscriptionMock).toHaveBeenCalledTimes(1);
  });

  it('exposes wallet fiat preferences and network fee map from Pinia state', () => {
    const walletStore = useWalletStore();

    walletStore.settingsState.apiKeys.moonpay = 'moonpay-key';
    walletStore.settingsState.alerts = [{ token: 'XOR' }] as never;
    walletStore.settingsState.allowTopUpAlert = true;
    walletStore.settingsState.allowFeePopup = false;
    walletStore.settingsState.assetsFilter = 'Verified' as never;
    walletStore.settingsState.blockNumber = 42;
    walletStore.settingsState.currency = 'eur' as never;
    walletStore.settingsState.currencies = [{ key: 'eur', symbol: '€' }] as never;
    walletStore.settingsState.filters = {
      option: 'Verified',
      verifiedOnly: true,
      zeroBalance: false,
    } as never;
    walletStore.settingsState.fiatExchangeRateObject = {
      dai: 1,
      eur: 1.25,
    } as never;
    walletStore.settingsState.indexers = {
      polkaswap: { endpoint: 'https://polkaswap.example', status: 'available' },
    } as never;
    walletStore.settingsState.indexerType = 'polkaswap' as never;
    walletStore.settingsState.isWalletLoaded = true;
    walletStore.settingsState.networkFees = { swap: '1000000000' } as never;
    walletStore.settingsState.soraNetwork = 'prod' as never;

    expect(walletStore.apiKeys).toEqual({ moonpay: 'moonpay-key' });
    expect(walletStore.moonpayApiKey).toBe('moonpay-key');
    expect(walletStore.currencySymbol).toBe('€');
    expect(walletStore.fiatExchangeRateObject).toEqual({
      dai: 1,
      eur: 1.25,
    });
    expect(walletStore.exchangeRate).toBe(1.25);
    expect(walletStore.blockNumber).toBe(42);
    expect(walletStore.isWalletLoaded).toBe(true);
    expect(walletStore.allowFeePopup).toBe(false);
    expect(walletStore.filters).toEqual({
      option: 'Verified',
      verifiedOnly: true,
      zeroBalance: false,
    });
    expect(walletStore.assetsFilter).toBe('Verified');
    expect(walletStore.currencies).toEqual([{ key: 'eur', symbol: '€' }]);
    expect(walletStore.alerts).toEqual([{ token: 'XOR' }]);
    expect(walletStore.allowTopUpAlert).toBe(true);
    expect(walletStore.indexers).toEqual({
      polkaswap: { endpoint: 'https://polkaswap.example', status: 'available' },
    });
    expect(walletStore.indexerType).toBe('polkaswap');
    expect(walletStore.currency).toBe('eur');
    expect(walletStore.networkFees).toEqual({ swap: '1000000000' });
    expect(walletStore.soraNetwork).toBe('prod');
  });

  it('wraps account connection helpers', async () => {
    const walletStore = useWalletStore();
    const account = { address: 'addr', name: 'User', source: 'polkadot-js' } as WALLET_TYPES.PolkadotJsAccount;

    await walletStore.loginAccount(account);
    expect(loginApiMock).toHaveBeenCalledWith(walletApi, account, false);
    expect(walletStore.account).toEqual({
      address: 'addr',
      name: 'User',
      source: account.source,
    });
    expect(balanceUpdatedSubscribeMock).toHaveBeenCalledTimes(1);
    expect(updateAccountAssetsMock).toHaveBeenCalledTimes(1);
    expect(createHistorySubscriptionMock).toHaveBeenCalledWith('addr', expect.any(Function));

    storage.set('address', 'addr');
    storage.set('name', 'User');
    storage.set('source', 'polkadot-js');
    changeAccountNameMock.mockImplementation((address, name) => {
      storage.set('address', address);
      storage.set('name', name);
    });

    const renamePayload = { address: 'addr', name: 'New Name' };
    await walletStore.renameAccount(renamePayload);
    expect(changeAccountNameMock).toHaveBeenCalledWith(renamePayload.address, renamePayload.name);
    expect(walletStore.account).toEqual({
      address: 'addr',
      name: 'New Name',
      source: account.source,
    });

    await walletStore.addAsset('0x1');
    expect(addAccountAssetMock).toHaveBeenCalledWith('0x1');

    const depositPayload = { asset: { address: '0x1' }, message: 'hello' } as any;
    walletStore.setAssetToNotify(depositPayload.asset);
    await walletStore.notifyOnDeposit(depositPayload);
    expect(pushNotificationMock).toHaveBeenCalledWith(depositPayload.asset, depositPayload.message);
    expect(walletStore.assetsToNotifyQueue).toEqual([]);

    const clearAccountAssetsCount = clearAccountAssetsMock.mock.calls.length;
    const accountAssetsUnsubscribeCount = accountAssetsUnsubscribeMock.mock.calls.length;
    const externalHistoryUnsubscribeCount = externalHistoryUnsubscribeMock.mock.calls.length;

    await walletStore.logout();
    expect(logoutApiMock).toHaveBeenCalledTimes(1);
    expect(clearAccountAssetsMock.mock.calls.length).toBe(clearAccountAssetsCount + 1);
    expect(accountAssetsUnsubscribeMock.mock.calls.length).toBe(accountAssetsUnsubscribeCount + 1);
    expect(externalHistoryUnsubscribeMock.mock.calls.length).toBe(externalHistoryUnsubscribeCount + 1);
    expect(walletStore.isLoggedIn).toBe(false);
  });

  it('hydrates account assets immediately after login', async () => {
    const walletStore = useWalletStore();
    const account = { address: 'addr', name: 'User', source: 'polkadot-js' } as WALLET_TYPES.PolkadotJsAccount;
    const assets = [
      {
        address: 'xor-address',
        symbol: 'XOR',
        decimals: 18,
        balance: {
          transferable: '1000000000000000000',
        },
      },
    ];

    Object.assign(((walletApi as Record<string, unknown>).assets ??= {}) as Record<string, unknown>, {
      accountAssets: assets,
    });

    await walletStore.loginAccount(account);

    expect(waitForAccountPairMock).toHaveBeenCalledTimes(1);
    expect(updateAccountAssetsMock).toHaveBeenCalledTimes(1);
    expect(walletStore.accountAssets).toEqual(assets);
    expect(walletStore.accountAssetsLoaded).toBe(true);
  });

  it('tracks account asset hydration loading while balances are updating', async () => {
    const walletStore = useWalletStore();
    const account = { address: 'addr', name: 'User', source: 'polkadot-js' } as WALLET_TYPES.PolkadotJsAccount;
    let resolveUpdateAccountAssets!: () => void;

    updateAccountAssetsMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdateAccountAssets = resolve;
        })
    );

    const loginPromise = walletStore.loginAccount(account);

    await vi.waitFor(() => {
      expect(walletStore.accountAssetsLoading).toBe(true);
      expect(walletStore.accountAssetsLoaded).toBe(false);
    });

    resolveUpdateAccountAssets();
    await loginPromise;

    expect(walletStore.accountAssetsLoading).toBe(false);
    expect(walletStore.accountAssetsLoaded).toBe(true);
  });

  it('marks account asset hydration settled after an empty asset update', async () => {
    const walletStore = useWalletStore();
    const account = { address: 'addr', name: 'User', source: 'polkadot-js' } as WALLET_TYPES.PolkadotJsAccount;

    await walletStore.loginAccount(account);

    expect(walletStore.accountAssets).toEqual([]);
    expect(walletStore.accountAssetsLoading).toBe(false);
    expect(walletStore.accountAssetsLoaded).toBe(true);
  });

  it('forwards wallet settings actions', async () => {
    const walletStore = useWalletStore();
    const apiKeys = { foo: 'bar', googleApi: 'google-api', googleClientId: 'google-client' };
    const exchangeRateUnsubMock = vi.fn();

    createExchangeRatesSubscriptionMock.mockImplementation((handler: (value: Record<string, number>) => void) => {
      handler({ eur: 1.4 });
      return exchangeRateUnsubMock;
    });

    await walletStore.setApiKeys(apiKeys);
    expect(walletStore.settingsState.apiKeys).toEqual(apiKeys);
    expect(setGoogleDriveOptionsMock).toHaveBeenCalledWith('google-api', 'google-client');

    await walletStore.subscribeOnAlerts();
    expect(createPriceAlertSubscriptionMock).toHaveBeenCalledTimes(1);

    await walletStore.subscribeOnExchangeRatesApi();
    expect(createExchangeRatesSubscriptionMock).toHaveBeenCalledTimes(1);
    expect(walletStore.settingsState.fiatExchangeRateObject).toEqual({ dai: 1, eur: 1.4 });

    await walletStore.setTheme(Theme.DARK);
    expect(walletStore.theme).toBe(Theme.DARK);
  });

  it('exposes wallet permissions locally and keeps them in sync with updates', () => {
    const walletStore = useWalletStore();

    expect(walletStore.permissions.createAssets).toBe(true);
    expect(walletStore.permissions.bridgeAssets).toBe(true);

    walletStore.setPermissions({ bridgeAssets: false });

    expect(walletStore.permissions.bridgeAssets).toBe(false);
    expect(walletStore.permissions.swapAssets).toBe(true);
    expect(walletStore.settingsState.permissions.bridgeAssets).toBe(false);
    expect(walletStore.settingsState.permissions.swapAssets).toBe(true);
    expect(walletStore.permissions).toEqual(walletStore.settingsState.permissions);
    expect(walletRuntimeBridge.store.commit).not.toHaveBeenCalled();
  });

  it('owns the wallet loaded flag locally while mirroring the compat mutation', () => {
    const walletStore = useWalletStore();

    walletStore.setWalletLoaded(true);

    expect(walletStore.isWalletLoaded).toBe(true);
    expect(walletStore.settingsState.isWalletLoaded).toBe(true);
    expect(walletRuntimeBridge.store.commit).not.toHaveBeenCalled();
  });

  it('owns address-book, pinning, and tx-detail mutations locally while mirroring compat commits', () => {
    const walletStore = useWalletStore();

    walletStore.setAddressToBook({ address: 'cnV5Cyx', name: 'Alice' } as never);
    walletStore.setMultiplePinnedAssets(['xor', 'val', 'xor']);
    walletStore.setTxDetailsId('tx-1');
    walletStore.saveExternalHistoryUpdates(true);
    walletStore.transactionsState.externalHistory = { 'tx-1': { id: 'tx-1' } } as never;
    walletStore.transactionsState.externalHistoryUpdates = { 'tx-2': { id: 'tx-2' } } as never;
    walletStore.transactionsState.externalHistoryTotal = 2;
    walletStore.resetExternalHistory();
    walletStore.resetTxDetailsId();
    walletStore.removeAddressFromBook('cnV5Cyx');

    expect(walletStore.accountState.book).toEqual({});
    expect(walletStore.accountState.pinnedAssets).toEqual(['xor', 'val']);
    expect(walletStore.transactionsState.selectedTxId).toBeNull();
    expect(walletStore.transactionsState.saveExternalHistoryUpdates).toBe(true);
    expect(walletStore.transactionsState.externalHistory).toEqual({});
    expect(walletStore.transactionsState.externalHistoryUpdates).toEqual({});
    expect(walletStore.transactionsState.externalHistoryTotal).toBe(0);
    expect(walletRuntimeBridge.store.commit).not.toHaveBeenCalled();
  });

  it('owns transfer and vested transfer account actions locally', async () => {
    const walletStore = useWalletStore();
    const routerStore = useRouterStore();
    const asset = { address: 'xor', symbol: 'XOR', decimals: 18 } as never;
    const fee = { formatted: '0.01' } as never;

    routerStore.setCurrentParams({ asset });
    walletStore.settingsState.blockNumber = 120;
    getVestedTransferFeeMock.mockResolvedValueOnce(fee);

    await walletStore.transfer({ to: 'cnRecipient', amount: '12' });
    const result = await walletStore.getVestedTransferFee({
      asset,
      amount: '12',
      vestingPercent: 40,
      unlockPeriodInDays: 30,
    });
    await walletStore.vestedTransfer({
      to: 'cnRecipient',
      asset,
      amount: '12',
      vestingPercent: 40,
      unlockPeriodInDays: 30,
      start: 96_000,
      current: 0,
    });

    expect(simpleTransferMock).toHaveBeenCalledWith(asset, 'cnRecipient', '12');
    expect(getVestedTransferFeeMock).toHaveBeenCalledWith(asset, '12', 120, 40, 30);
    expect(result).toBe(fee);
    expect(vestedTransferMock).toHaveBeenCalledWith(asset, 'cnRecipient', '12', 136, 40, 30);
  });

  it('forwards wallet route synchronization through the router store', () => {
    const walletStore = useWalletStore();
    const routerStore = useRouterStore();
    const checkCurrentRouteSpy = vi.spyOn(routerStore, 'checkCurrentRoute');

    walletStore.syncWalletRoute();

    expect(checkCurrentRouteSpy).toHaveBeenCalledTimes(1);

    walletStore.navigate({ name: RouteNames.WalletSend, params: { address: 'cnRecipient' } });

    expect(routerStore.current).toBe(RouteNames.WalletSend);
    expect(routerStore.currentParams).toEqual({ address: 'cnRecipient' });
  });

  it('prepares the wallet runtime entry route through the wallet boundary', () => {
    const walletStore = useWalletStore();
    const routerStore = useRouterStore();
    const navigateSpy = vi.spyOn(routerStore, 'navigate');

    walletStore.accountState.address = '';
    walletStore.accountState.source = '' as never;
    walletStore.prepareWalletEntryNavigation();
    expect(navigateSpy).toHaveBeenCalledWith({ name: RouteNames.WalletConnection });

    navigateSpy.mockClear();
    walletStore.accountState.address = 'cnUser';
    walletStore.accountState.source = 'sora' as never;
    routerStore.navigate({ name: RouteNames.WalletSend });

    walletStore.prepareWalletEntryNavigation();

    expect(navigateSpy).toHaveBeenCalledWith({ name: RouteNames.Wallet });
  });

  it('owns external history and NFT storage actions locally while mirroring compat commits', async () => {
    const walletStore = useWalletStore();

    walletStore.transactionsState.externalHistory = {
      'tx-existing': { id: 'tx-existing', type: Operation.Swap },
    } as never;
    walletStore.transactionsState.externalHistoryUpdates = {
      'tx-external': { id: 'tx-external', type: Operation.Swap },
    } as never;
    walletStore.transactionsState.activeTxsIds = ['tx-internal', 'tx-keep'];
    walletStore.settingsState.soraNetwork = SoraNetwork.Prod;
    (walletApi as Record<string, unknown>).history = {
      'tx-internal': { id: 'tx-internal', type: Operation.Swap },
    };

    getExplorerHistoryMock.mockResolvedValueOnce({
      nodes: [{ id: 'tx-internal' }, { id: 'tx-external' }],
      totalCount: 2,
    });
    parseTransactionAsHistoryItemMock.mockImplementation(async (transaction: { id: string }) => ({
      id: transaction.id,
      type: Operation.Swap,
    }));

    await walletStore.getExternalHistory({
      address: 'cnUser',
      assetAddress: 'xor',
      pageAmount: 2,
      page: 3,
      query: { statuses: ['SUCCESS'] } as never,
    });
    await walletStore.createNftStorageInstance();

    expect(historyElementsFilterMock).toHaveBeenCalledWith({
      address: 'cnUser',
      assetAddress: 'xor',
      operations: [Operation.Swap],
      query: { statuses: ['SUCCESS'] },
    });
    expect(getExplorerHistoryMock).toHaveBeenCalledWith({
      filter: {
        address: 'cnUser',
        assetAddress: 'xor',
        operations: [Operation.Swap],
        query: { statuses: ['SUCCESS'] },
      },
      first: 2,
      offset: 4,
    });
    expect(removeHistoryMock).toHaveBeenCalledWith('tx-internal');
    expect(walletStore.transactionsState.activeTxsIds).toEqual(['tx-keep']);
    expect(walletStore.transactionsState.externalHistory).toEqual({
      'tx-existing': { id: 'tx-existing', type: Operation.Swap },
      'tx-internal': { id: 'tx-internal', type: Operation.Swap },
      'tx-external': { id: 'tx-external', type: Operation.Swap },
    });
    expect(walletStore.transactionsState.externalHistoryUpdates).toEqual({});
    expect(walletStore.transactionsState.externalHistoryTotal).toBe(2);
    expect(getUcanTokensMock).toHaveBeenCalledTimes(1);
    expect(walletStore.settingsState.nftStorage?.constructor.name).toBe('NFTStorage');
    expect(walletStore.settingsState.nftStorage?.store).toEqual(expect.any(Function));
    expect(walletRuntimeBridge.store.commit).not.toHaveBeenCalled();
  });

  it('loads and sanitizes the wallet whitelist through the Pinia store', async () => {
    const walletStore = useWalletStore();

    fetchMock.mockResolvedValue({
      ok: true,
      text: vi.fn(async () =>
        JSON.stringify([
          { address: 'xor', symbol: 'XOR', name: 'SORA', icon: 'https://example.com/xor.svg', decimals: 18 },
        ])
      ),
    });

    await walletStore.getWhitelist();

    expect(fetchMock).toHaveBeenCalledWith(`https://app.test/${WHITE_LIST_URL}`, { cache: 'no-cache' });
    expect(walletStore.accountState.whitelistArray).toEqual([
      {
        address: 'xor',
        symbol: 'XOR',
        name: 'SORA',
        icon: 'https://example.com/xor.svg',
        decimals: 18,
      },
    ]);
  });

  it('loads the NFT blacklist through the Pinia store', async () => {
    const walletStore = useWalletStore();

    fetchMock.mockResolvedValue({
      ok: true,
      text: vi.fn(async () => JSON.stringify(['nft-1', 'nft-2'])),
    });

    await walletStore.getNftBlacklist();

    expect(fetchMock).toHaveBeenCalledWith(`https://app.test/${NFT_BLACK_LIST_URL}`, { cache: 'no-cache' });
    expect(walletStore.accountState.blacklistArray).toEqual(['nft-1', 'nft-2']);
  });

  it('controls wallet subscriptions via Pinia store', async () => {
    const walletStore = useWalletStore();
    walletStore.accountState.address = 'addr';
    walletStore.accountState.source = 'polkadot-js' as any;

    await walletStore.resetNetworkSubscriptions();
    expect(clearAccountAssetsMock).toHaveBeenCalledTimes(1);
    expect(stopPendingTxsSubscriptionMock).not.toHaveBeenCalled();

    await walletStore.resetInternalSubscriptions();
    expect(stopPendingTxsSubscriptionMock).toHaveBeenCalledTimes(1);

    await walletStore.activateNetworkSubscriptions();
    expect(blockNumberObservableSubscribeMock).toHaveBeenCalledTimes(1);
    expect(runtimeVersionObservableSubscribeMock).toHaveBeenCalledTimes(1);
    expect(networkFeeMultiplierObservableSubscribeMock).toHaveBeenCalledTimes(1);
    expect(getAssetsMock).toHaveBeenCalledTimes(1);
    expect(balanceUpdatedSubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('keeps local mutation-backed wallet state in sync', async () => {
    const walletStore = useWalletStore();
    const unlockPair = vi.fn();

    walletStore.addPriceAlert({ token: 'XOR' } as any);
    walletStore.editPriceAlert({ alert: { token: 'VAL' }, position: 1 } as any);
    walletStore.removePriceAlert(1);
    walletStore.setDepositNotifications(true);
    walletStore.setFiatCurrency('eur' as any);
    walletStore.updateFiatExchangeRates({ eur: 1.4 } as any);
    walletStore.setAssetsFilter('Verified' as any);
    walletStore.setFilterOptions({ option: 'Verified', verifiedOnly: true, zeroBalance: false } as any);
    walletStore.setAllowFeePopup(false);
    walletStore.setSoraNetwork('prod');
    walletStore.setIndexerEndpoint({ indexer: 'polkaswap', endpoint: 'https://indexer.example' });
    walletStore.setIsDesktop(true);
    await walletStore.selectIndexer('polkaswap');
    walletStore.setSignTxDialogDisabled(true);
    walletStore.setAccountPassphrase({ address: 'alice', password: 'secret' });
    await walletStore.beforeTransactionSign({ address: 'alice', unlockPair } as any);

    expect(walletStore.alerts).toEqual([{ token: 'XOR' }]);
    expect(walletStore.allowTopUpAlert).toBe(true);
    expect(walletStore.currency).toBe('eur');
    expect(walletStore.settingsState.fiatExchangeRateObject).toEqual({ dai: 1, eur: 1.4 });
    expect(walletStore.assetsFilter).toBe('Verified');
    expect(walletStore.filters).toEqual({
      option: 'Verified',
      verifiedOnly: true,
      zeroBalance: false,
    });
    expect(walletStore.allowFeePopup).toBe(false);
    expect(walletStore.soraNetwork).toBe('prod');
    expect(walletStore.indexers.polkaswap).toEqual({
      endpoint: 'https://indexer.example',
      status: 'loading',
    });
    expect(walletStore.isDesktop).toBe(true);
    expect(getFiatPriceObjectMock).toHaveBeenCalledTimes(1);
    expect(createFiatPriceSubscriptionMock).toHaveBeenCalledTimes(1);
    expect(walletStore.indexerType).toBe('polkaswap');
    expect(unlockPair).toHaveBeenCalledWith('secret');
  });

  it('updates local mutation-backed state without a legacy runtime bridge', () => {
    const walletStore = useWalletStore();
    walletStore.accountState.pinnedAssets = [];

    walletStore.setAllowFeePopup(false);
    walletStore.setSignTxDialogVisibility(true);
    walletStore.setSignTxDialogDisabled(true);
    walletStore.setConfirmTxDialogDisabled(true);
    walletStore.addActiveTransaction('tx-1');
    walletStore.setPinnedAsset({ address: 'xor' } as any);
    walletStore.setPasswordTimeout(600_000);

    expect(walletStore.settingsState.allowFeePopup).toBe(false);
    expect(walletStore.transactionsState.isSignTxDialogVisible).toBe(true);
    expect(walletStore.transactionsState.isSignTxDialogDisabled).toBe(true);
    expect(walletStore.transactionsState.isConfirmTxDialogDisabled).toBe(true);
    expect(walletStore.transactionsState.activeTxsIds).toEqual(['tx-1']);
    expect(walletStore.accountState.pinnedAssets).toEqual(['xor']);
    expect(walletStore.accountState.accountPasswordTimeout).toBe(600_000);
    expect(walletRuntimeBridge.store.commit).not.toHaveBeenCalled();
  });
});
