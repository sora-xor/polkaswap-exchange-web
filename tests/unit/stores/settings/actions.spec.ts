import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import axiosInstance from '@/api';
import { api } from '@/shims/wallet-api';
import { resolveStaticAssetUrl } from '@/utils/staticAssets';

const walletApiStub = vi.hoisted(() => ({
  swap: { isALT: false },
}));
const storageStub = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
}));
const settingsStorageStub = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
}));
const walletConstsStub = vi.hoisted(() => ({
  IndexerType: { SUBQUERY: 'subquery', SUBSQUID: 'subsquid' },
  SoraNetwork: { Test: 'test', Prod: 'prod' },
}));
const walletTypesStub = vi.hoisted(() => ({}));
const connectionStub = vi.hoisted(() => ({
  open: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  endpoint: '',
  api: null,
}));
const walletStoreState = vi.hoisted(() => ({
  moonpayApiKey: '',
  theme: null,
  currencySymbol: 'DAI',
  exchangeRate: 1,
  networkFees: {} as Record<string, string>,
  blockNumber: 0,
  shouldBalanceBeHidden: false,
  isWalletLoaded: false,
  allowFeePopup: true,
  soraNetwork: null,
  isMSTAvailable: false,
  currency: 'dai',
  filters: {
    option: 'All',
    verifiedOnly: false,
    zeroBalance: false,
  },
  assetsFilter: 'All',
  currencies: [] as Array<Record<string, unknown>>,
  alerts: [] as Array<Record<string, unknown>>,
  allowTopUpAlert: false,
  indexers: {} as Record<string, unknown>,
  indexerType: 'subquery',
  addPriceAlert: vi.fn(),
  editPriceAlert: vi.fn(),
  removePriceAlert: vi.fn(),
  setDepositNotifications: vi.fn((value: boolean) => {
    walletStoreState.allowTopUpAlert = value;
  }),
  setFiatCurrency: vi.fn((value?: string) => {
    walletStoreState.currency = value ?? 'dai';
  }),
  updateFiatExchangeRates: vi.fn(),
  setAssetsFilter: vi.fn((value: string) => {
    walletStoreState.assetsFilter = value;
  }),
  setFilterOptions: vi.fn((value: Record<string, unknown>) => {
    walletStoreState.filters = value as typeof walletStoreState.filters;
  }),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  const walletMock = await createWalletMock({
    api: walletApiStub,
    storage: storageStub,
    settingsStorage: settingsStorageStub,
    WALLET_CONSTS: walletConstsStub,
    WALLET_TYPES: walletTypesStub,
  });
  return walletMock;
});
vi.mock('@wallet/core', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    api: walletApiStub,
    WALLET_CONSTS: walletConstsStub,
    WALLET_TYPES: walletTypesStub,
  });
});
vi.mock('@/shims/wallet-api', () => ({
  api: walletApiStub,
  connection: connectionStub,
}));
vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreState,
}));

vi.mock('@/lang', () => ({
  getLocale: () => 'en',
  getSupportedLocale: (value: string) => value,
  setDayJsLocale: vi.fn().mockResolvedValue(undefined),
  setI18nLocale: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils', () => ({
  updateDocumentTitle: vi.fn(),
  updateFpNumberLocale: vi.fn(),
}));

let createPinia: typeof import('pinia').createPinia;
let setActivePinia: typeof import('pinia').setActivePinia;

let useSettingsStore: typeof import('@/stores/settings').useSettingsStore;

describe('settings store actions', () => {
  beforeAll(async () => {
    const storage = new Map<string, string>();
    const localStorageStub: Storage = {
      get length() {
        return storage.size;
      },
      clear: () => storage.clear(),
      getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
      key: (index: number) => Array.from(storage.keys())[index] ?? null,
      removeItem: (key: string) => {
        storage.delete(key);
      },
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: localStorageStub,
    });

    ({ createPinia, setActivePinia } = await import('pinia'));
    ({ useSettingsStore } = await import('@/stores/settings'));
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    walletStoreState.currencySymbol = 'DAI';
    walletStoreState.exchangeRate = 1;
    walletStoreState.currency = 'dai';
    walletStoreState.networkFees = {};
    walletStoreState.allowTopUpAlert = false;
    walletStoreState.assetsFilter = 'All';
    walletStoreState.filters = {
      option: 'All',
      verifiedOnly: false,
      zeroBalance: false,
    };
    walletStoreState.currencies = [];
    walletStoreState.alerts = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('merges feature flags and toggles ALT flag', () => {
    const settingsStore = useSettingsStore();

    if (!api.swap) {
      (api as any).swap = { isALT: false };
    } else if (typeof api.swap.isALT !== 'boolean') {
      api.swap.isALT = false;
    }

    expect(settingsStore.featureFlags.alt).toBeUndefined();
    expect(api.swap.isALT).toBe(false);

    settingsStore.setFeatureFlags({ alt: true, moonpay: true });

    expect(settingsStore.featureFlags.alt).toBe(true);
    expect(settingsStore.featureFlags.moonpay).toBe(true);
    expect(api.swap.isALT).toBe(true);
  });

  it('updates language and related intl helpers', async () => {
    const settingsStore = useSettingsStore();
    const { setDayJsLocale, setI18nLocale } = await import('@/lang');
    const { updateDocumentTitle, updateFpNumberLocale } = await import('@/utils');

    await settingsStore.setLanguage('ru');

    expect(setDayJsLocale).toHaveBeenCalledWith('ru');
    expect(setI18nLocale).toHaveBeenCalledWith('ru');
    expect(updateDocumentTitle).toHaveBeenCalled();
    expect(updateFpNumberLocale).toHaveBeenCalledWith('ru');
    expect(settingsStore.language).toBe('ru');
  });

  it('normalises marketing asset paths when fetching ads config', async () => {
    const settingsStore = useSettingsStore();
    const mockResponse = {
      data: [
        {
          title: 'Banner',
          img: '/marketing/banner.png',
          link: '/#/swap',
        },
      ],
    };

    const axiosGetSpy = vi.spyOn(axiosInstance, 'get').mockResolvedValue(mockResponse);

    await settingsStore.fetchAdsArray();

    expect(axiosGetSpy).toHaveBeenCalledWith(expect.stringContaining('marketing.json'));
    expect(settingsStore.adsArray).toHaveLength(1);
    expect(settingsStore.adsArray[0]?.img).toBe(resolveStaticAssetUrl('/marketing/banner.png'));
    expect(settingsStore.adsArray[0]?.link).toBe('#/swap');
  });

  it('reads fiat formatting values from wallet state snapshots', () => {
    const settingsStore = useSettingsStore();
    walletStoreState.currency = 'eur';
    walletStoreState.currencySymbol = '€';
    walletStoreState.exchangeRate = 1.33;
    walletStoreState.currencies = [{ key: 'eur', symbol: '€' }];
    walletStoreState.networkFees = { swap: '123000000' };

    expect(settingsStore.currencySymbol).toBe('€');
    expect(settingsStore.exchangeRate).toBe(1.33);
    expect(settingsStore.currency).toBe('eur');
    expect(settingsStore.networkFees).toEqual({ swap: '123000000' });
  });

  it('forwards alert and deposit-notification mutations to the wallet Pinia facade', () => {
    const settingsStore = useSettingsStore();
    const alert = {
      token: 'XOR',
      price: '10',
      type: 'raise',
      once: true,
      wasNotified: false,
    };
    const editableAlert = {
      alert,
      position: 1,
    };

    settingsStore.addPriceAlert(alert as any);
    settingsStore.editPriceAlert(editableAlert as any);
    settingsStore.removePriceAlert(1);
    settingsStore.setDepositNotifications(true);

    expect(walletStoreState.addPriceAlert).toHaveBeenCalledWith(alert);
    expect(walletStoreState.editPriceAlert).toHaveBeenCalledWith(editableAlert);
    expect(walletStoreState.removePriceAlert).toHaveBeenCalledWith(1);
    expect(walletStoreState.setDepositNotifications).toHaveBeenCalledWith(true);
  });

  it('forwards wallet filter and exchange-rate mutations to the wallet Pinia facade', () => {
    const settingsStore = useSettingsStore();
    const filters = {
      option: 'All',
      verifiedOnly: true,
      zeroBalance: false,
    };

    settingsStore.updateFiatExchangeRates({ usd: 1.5 } as any);
    settingsStore.setAssetsFilter('Native' as any);
    settingsStore.setFilterOptions(filters as any);
    settingsStore.setFiatCurrency();

    expect(walletStoreState.updateFiatExchangeRates).toHaveBeenCalledWith({ usd: 1.5 });
    expect(walletStoreState.setAssetsFilter).toHaveBeenCalledWith('Native');
    expect(walletStoreState.setFilterOptions).toHaveBeenCalledWith(filters);
    expect(walletStoreState.setFiatCurrency).toHaveBeenCalledWith(undefined);
  });

  it('shows disclaimer by default for users who did not accept it yet', () => {
    settingsStorageStub.get.mockImplementation((key: string) => {
      if (key === 'disclaimerApprove') return null;
      return null;
    });

    const settingsStore = useSettingsStore();

    expect(settingsStore.userDisclaimerApprove).toBe(false);
    expect(settingsStore.disclaimerVisibility).toBe(true);
  });

  it('stores only safe external faucet links', () => {
    const settingsStore = useSettingsStore();

    settingsStore.setFaucetUrl('javascript:alert(1)');
    expect(settingsStore.faucetUrl).toBe('');

    settingsStore.setFaucetUrl('https://faucet.dev.sora.org');
    expect(settingsStore.faucetUrl).toBe('https://faucet.dev.sora.org');
  });

  it('allows localhost http faucet links for local development', () => {
    const settingsStore = useSettingsStore();

    settingsStore.setFaucetUrl('http://localhost:3000/faucet');
    expect(settingsStore.faucetUrl).toBe('http://localhost:3000/faucet');
  });
});
