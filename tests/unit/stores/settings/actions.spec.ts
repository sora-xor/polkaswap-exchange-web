import { api } from '@wallet/core';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import axiosInstance from '@/api';
import legacyStore from '@/store';
import { setLegacyStoreOverride } from '@/utils/legacy-store';
import { resolveStaticAssetUrl } from '@/utils/staticAssets';

vi.mock('@/store', () => import('@stubs/store'));

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
vi.mock('@/utils/walletCore', () => ({
  loadWalletCore: vi.fn(async () => ({
    api: walletApiStub,
    connection: {},
    WALLET_CONSTS: walletConstsStub,
    WALLET_TYPES: walletTypesStub,
  })),
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
    setLegacyStoreOverride(legacyStore as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    setLegacyStoreOverride(null);
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

  it('reads fiat formatting values from legacy wallet settings', () => {
    const settingsStore = useSettingsStore();
    const store = legacyStore as any;

    store.getters.wallet.settings.currencySymbol = '€';
    store.getters.wallet.settings.exchangeRate = 1.33;
    store.state.wallet.settings.currency = 'eur';
    store.state.wallet.settings.networkFees = { swap: '123000000' };

    expect(settingsStore.currencySymbol).toBe('€');
    expect(settingsStore.exchangeRate).toBe(1.33);
    expect(settingsStore.currency).toBe('eur');
    expect(settingsStore.networkFees).toEqual({ swap: '123000000' });
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
