import { beforeEach, describe, expect, it, vi } from 'vitest';

const piniaStub = vi.hoisted(() => ({
  createPinia: vi.fn(() => ({})),
  setActivePinia: vi.fn(),
  defineStore: (id: string, options: any) => {
    const actions = options.actions ?? {};
    return () => ({ ...actions });
  },
}));

vi.mock('pinia', () => ({
  createPinia: piniaStub.createPinia,
  setActivePinia: piniaStub.setActivePinia,
  defineStore: piniaStub.defineStore,
}));

import { Theme } from '@/consts/theme';
import type { WALLET_TYPES } from '@wallet';
import { setLegacyStoreOverride } from '@/utils/legacy-store';

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
    setLegacyStoreOverride(legacyStore as any);
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
