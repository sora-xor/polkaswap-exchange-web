import { beforeEach, describe, expect, it, vi } from 'vitest';

const piniaStub = vi.hoisted(() => ({
  createPinia: vi.fn(() => ({})),
  setActivePinia: vi.fn(),
  defineStore: (_id: string, options: any) => {
    return () => {
      const store: Record<string, any> = {};

      if (options.getters) {
        Object.entries(options.getters).forEach(([name, getter]) => {
          Object.defineProperty(store, name, {
            enumerable: true,
            get: () => getter.call(store),
          });
        });
      }

      if (options.actions) {
        Object.entries(options.actions).forEach(([name, action]) => {
          store[name] = (...args: unknown[]) => action.apply(store, args);
        });
      }

      return store;
    };
  },
}));

vi.mock('pinia', () => ({
  createPinia: piniaStub.createPinia,
  setActivePinia: piniaStub.setActivePinia,
  defineStore: piniaStub.defineStore,
}));

import { Theme } from '@/consts/theme';
import type { WALLET_TYPES } from '@wallet';
import { setAppStoreOverride } from '@/utils/app-store';

const loginAccountMock = vi.hoisted(() => vi.fn());
const renameAccountMock = vi.hoisted(() => vi.fn());
const addAssetMock = vi.hoisted(() => vi.fn());
const notifyOnDepositMock = vi.hoisted(() => vi.fn());
const afterLoginMock = vi.hoisted(() => vi.fn());
const setApiKeysMock = vi.hoisted(() => vi.fn());
const subscribeOnExchangeRatesApiMock = vi.hoisted(() => vi.fn());
const resetNetworkSubscriptionsMock = vi.hoisted(() => vi.fn());
const resetInternalSubscriptionsMock = vi.hoisted(() => vi.fn());
const activateNetworkSubscriptionsMock = vi.hoisted(() => vi.fn());
const setThemeMock = vi.hoisted(() => vi.fn());
const addActiveTxMock = vi.hoisted(() => vi.fn());
const removeActiveTxsMock = vi.hoisted(() => vi.fn());

vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    state: {
      wallet: {
        account: {
          address: 'addr',
          assets: [],
          accountAssets: [],
          accountAssetsAddressTable: {},
          assetsToNotifyQueue: [],
          source: null,
          fiatPriceObject: {},
        },
        settings: {
          shouldBalanceBeHidden: false,
          isMSTAvailable: false,
          currency: 'usd',
          networkFees: {},
          theme: Theme.LIGHT,
        },
        transactions: {
          isSignTxDialogVisible: false,
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
    },
    getters: {
      wallet: {
        account: {
          isLoggedIn: false,
          whitelist: [],
          whitelistIdsBySymbol: {},
          assetsDataTable: {},
          accountAssetsAddressTable: {},
        },
        transactions: {
          firstReadyTx: null,
        },
        settings: {
          currencySymbol: '$',
          exchangeRate: 1,
        },
      },
      settings: {
        nodeIsConnected: true,
      },
    },
    commit: {
      wallet: {
        settings: {
          toggleHideBalance: vi.fn(),
        },
        transactions: {
          setSignTxDialogVisibility: vi.fn(),
          addActiveTx: addActiveTxMock,
          removeActiveTxs: removeActiveTxsMock,
        },
      },
    },
    dispatch: {
      wallet: {
        account: {
          loginAccount: loginAccountMock,
          renameAccount: renameAccountMock,
          addAsset: addAssetMock,
          notifyOnDeposit: notifyOnDepositMock,
          afterLogin: afterLoginMock,
          logout: vi.fn(),
        },
        settings: {
          setApiKeys: setApiKeysMock,
          subscribeOnExchangeRatesApi: subscribeOnExchangeRatesApiMock,
          setTheme: setThemeMock,
        },
        subscriptions: {
          resetNetworkSubscriptions: resetNetworkSubscriptionsMock,
          resetInternalSubscriptions: resetInternalSubscriptionsMock,
          activateNetwokSubscriptions: activateNetworkSubscriptionsMock,
        },
      },
    },
  },
}));

import { useWalletStore } from '@/stores/wallet';

describe('wallet store actions', () => {
  beforeEach(async () => {
    piniaStub.setActivePinia(piniaStub.createPinia());
    vi.clearAllMocks();
    const legacyStore = (await import('@/store')).default;
    setAppStoreOverride(legacyStore as any);
  });

  it('falls back when legacy getters return undefined during boot', async () => {
    const legacyStore = (await import('@/store')).default as any;
    const previous = legacyStore.getters.wallet.account.assetsDataTable;
    legacyStore.getters.wallet.account.assetsDataTable = undefined;

    expect(useWalletStore().assetsDataTable).toEqual({});

    legacyStore.getters.wallet.account.assetsDataTable = previous;
  });

  it('exposes wallet visibility flag and transaction helpers', async () => {
    const walletStore = useWalletStore();
    expect(walletStore.shouldBalanceBeHidden).toBe(false);

    const legacyStore = (await import('@/store')).default;
    legacyStore.state.wallet.settings.shouldBalanceBeHidden = true;
    expect(useWalletStore().shouldBalanceBeHidden).toBe(true);
    legacyStore.state.wallet.settings.shouldBalanceBeHidden = false;

    walletStore.addActiveTransaction('tx-1');
    expect(addActiveTxMock).toHaveBeenCalledWith('tx-1');

    walletStore.removeActiveTransactions(['tx-1']);
    expect(removeActiveTxsMock).toHaveBeenCalledWith(['tx-1']);
  });

  it('exposes wallet fiat preferences and network fee map', async () => {
    const legacyStore = (await import('@/store')).default as any;
    legacyStore.getters.wallet.settings.currencySymbol = '€';
    legacyStore.getters.wallet.settings.exchangeRate = 1.25;
    legacyStore.state.wallet.settings.currency = 'eur';
    legacyStore.state.wallet.settings.networkFees = { swap: '1000000000' };

    const walletStore = useWalletStore();

    expect(walletStore.currencySymbol).toBe('€');
    expect(walletStore.exchangeRate).toBe(1.25);
    expect(walletStore.currency).toBe('eur');
    expect(walletStore.networkFees).toEqual({ swap: '1000000000' });
  });

  it('wraps account connection helpers', async () => {
    const walletStore = useWalletStore();
    const account = { address: 'addr', name: 'User' } as WALLET_TYPES.PolkadotJsAccount;
    await walletStore.loginAccount(account);
    expect(loginAccountMock).toHaveBeenCalledWith(account);

    const renamePayload = { address: 'addr', name: 'New Name' };
    await walletStore.renameAccount(renamePayload);
    expect(renameAccountMock).toHaveBeenCalledWith(renamePayload);

    await walletStore.addAsset('0x1');
    expect(addAssetMock).toHaveBeenCalledWith('0x1');

    const depositPayload = { asset: { address: '0x1' }, message: 'hello' } as any;
    await walletStore.notifyOnDeposit(depositPayload);
    expect(notifyOnDepositMock).toHaveBeenCalledWith(depositPayload);

    await walletStore.afterLogin();
    expect(afterLoginMock).toHaveBeenCalledTimes(1);
  });

  it('forwards wallet settings actions', async () => {
    const walletStore = useWalletStore();
    const apiKeys = { foo: 'bar' };
    await walletStore.setApiKeys(apiKeys);
    expect(setApiKeysMock).toHaveBeenCalledWith(apiKeys);

    await walletStore.subscribeOnExchangeRatesApi();
    expect(subscribeOnExchangeRatesApiMock).toHaveBeenCalledTimes(1);

    await walletStore.setTheme(Theme.DARK);
    expect(setThemeMock).toHaveBeenCalledWith(Theme.DARK);
  });

  it('controls wallet subscriptions via Pinia store', async () => {
    const walletStore = useWalletStore();

    await walletStore.resetNetworkSubscriptions();
    expect(resetNetworkSubscriptionsMock).toHaveBeenCalledTimes(1);

    await walletStore.resetInternalSubscriptions();
    expect(resetInternalSubscriptionsMock).toHaveBeenCalledTimes(1);

    await walletStore.activateNetworkSubscriptions();
    expect(activateNetworkSubscriptionsMock).toHaveBeenCalledTimes(1);
  });
});
