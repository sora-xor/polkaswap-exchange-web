import { flushPromises, shallowMount } from '@vue/test-utils';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pinia } from 'pinia';
import { defineComponent } from 'vue';

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
  TranslationConsts: {},
  IndexerType: {
    SUBQUERY: 'subquery',
    SUBSQUID: 'subsquid',
  },
  SoraNetwork: {
    Test: 'test',
    Prod: 'prod',
  },
  LogoSize: {
    SMALL: 'small',
  },
  FontWeightRate: {
    MEDIUM: 'medium',
  },
  FontSizeRate: {
    MEDIUM: 'medium',
  },
}));
const walletTypesStub = vi.hoisted(() => ({
  FilterOptions: {},
}));
const connectionStub = vi.hoisted(() => ({
  nodeIsConnected: false,
}));
const walletStoreState = vi.hoisted(() => ({
  currency: 'usd' as Currency,
  currencies: [] as Array<{ key: string; symbol: string; name: string }>,
  setFiatCurrency: vi.fn((currency?: Currency) => {
    walletStoreState.currency = (currency ?? 'dai') as Currency;
    settingsStorageStub.set('currency', walletStoreState.currency);
  }),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    api: walletApiStub,
    storage: storageStub,
    settingsStorage: settingsStorageStub,
    WALLET_CONSTS: walletConstsStub,
    WALLET_TYPES: walletTypesStub,
    connection: connectionStub,
  });
});
vi.mock('@wallet/core', () => ({
  api: walletApiStub,
}));
vi.mock('@/utils/walletCore', () => ({
  loadWalletCore: vi.fn(async () => ({
    api: walletApiStub,
    connection: connectionStub,
    WALLET_CONSTS: walletConstsStub,
    WALLET_TYPES: walletTypesStub,
  })),
}));
vi.mock('@/lang', () => {
  const getLocale = () => 'en';
  const getSupportedLocale = (value: string) => value;
  const setDayJsLocale = vi.fn().mockResolvedValue(undefined);
  const setI18nLocale = vi.fn().mockResolvedValue(undefined);
  const i18n = {
    global: {
      t: vi.fn((key: string) => key),
      locale: {
        value: 'en',
      },
    },
  };
  return {
    __esModule: true,
    default: i18n,
    getLocale,
    getSupportedLocale,
    setDayJsLocale,
    setI18nLocale,
  };
});
vi.mock('@/utils', () => ({
  __esModule: true,
  updateDocumentTitle: vi.fn(),
  updateFpNumberLocale: vi.fn(),
}));
vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreState,
}));

let createPiniaInstance: (() => Pinia) | null = null;
let setActivePiniaInstance: ((pinia: Pinia) => void) | null = null;

beforeAll(async () => {
  const pinia = await import('pinia');
  createPiniaInstance = pinia.createPinia;
  setActivePiniaInstance = pinia.setActivePinia;
});

import selectLanguageDialogSource from '@/components/App/Settings/Language/SelectLanguageDialog.vue?raw';
import selectCurrencyDialogSource from '@/components/App/Settings/Currency/SelectCurrencyDialog.vue?raw';
import SelectLanguageDialog from '@/components/App/Settings/Language/SelectLanguageDialog.vue';
import SelectCurrencyDialog from '@/components/App/Settings/Currency/SelectCurrencyDialog.vue';
import { useSettingsStore } from '@/stores/settings';

import type { Currency } from '@/lib/soraneo-wallet/src/types/currency';

vi.mock('@/utils/staticAssets', () => ({ resolveStaticAssetUrl: (value: string) => value }));

const makeSettingsStore = () => {
  if (!createPiniaInstance || !setActivePiniaInstance) {
    throw new Error('Pinia was not initialized');
  }
  setActivePiniaInstance(createPiniaInstance());
  walletStoreState.currency = 'usd' as Currency;
  walletStoreState.currencies = [
    { key: 'usd', symbol: '$', name: 'US Dollar' },
    { key: 'eur', symbol: 'EUR', name: 'Euro' },
  ];

  return {
    store: useSettingsStore(),
    walletStore: walletStoreState,
  };
};

describe('settings dialogs (BVT)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    walletStoreState.currency = 'usd' as Currency;
    walletStoreState.currencies = [];
  });

  it('selects a language and persists via settings store', async () => {
    const { store } = makeSettingsStore();
    store.setSelectLanguageDialogVisibility(true);

    const wrapper = shallowMount(SelectLanguageDialog, {
      global: {
        stubs: {
          DialogBase: defineComponent({
            name: 'DialogBase',
            template: '<div><slot /><slot name="title" /></div>',
          }),
          SScrollbar: defineComponent({
            name: 'SScrollbar',
            template: '<div><slot /></div>',
          }),
          SRadioGroup: defineComponent({
            name: 'SRadioGroup',
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<div><slot /></div>',
          }),
          SRadio: defineComponent({
            name: 'SRadio',
            props: ['label'],
            emits: ['update:modelValue'],
            template: '<div class="radio" @click="$emit(\'update:modelValue\', label)"><slot /></div>',
          }),
        },
      },
    });

    expect(store.selectLanguageDialogVisibility).toBe(true);

    const vm = wrapper.vm as {
      selectedLang: string;
      entries: Array<{ key: string; value: string; name: string }>;
    };
    expect(vm.entries[0]).toMatchObject({
      key: 'en',
      value: 'English',
      name: 'English (UK)',
    });

    await store.setLanguage('ru' as any);
    await flushPromises();

    expect(store.language).toBe('ru');
    expect(store.selectLanguageDialogVisibility).toBe(true);
  });

  it('uses the production dialog class hook and vertical list styling for language selection', () => {
    expect(selectLanguageDialogSource).toContain('custom-class="select-language-dialog"');
    expect(selectLanguageDialogSource).toContain('.select-language-list {');
    expect(selectLanguageDialogSource).toContain('flex-direction: column;');
    expect(selectLanguageDialogSource).toContain('overflow-x: hidden;');
  });

  it('uses the shared search focus helper for currency selection instead of raw autofocus', () => {
    expect(selectCurrencyDialogSource).toContain(
      'const { search, query, handleClearSearch, focusSearchInput } = useSearchInput();'
    );
    expect(selectCurrencyDialogSource).toContain('ref="search"');
    expect(selectCurrencyDialogSource).toContain('void focusSearchInput()');
    expect(selectCurrencyDialogSource).not.toContain('autofocus');
  });

  it('filters and selects a currency', async () => {
    const { store, walletStore } = makeSettingsStore();
    store.setSelectCurrencyDialogVisibility(true);

    const wrapper = shallowMount(SelectCurrencyDialog, {
      global: {
        stubs: {
          DialogBase: defineComponent({
            name: 'DialogBase',
            template: '<div><slot /><slot name="title" /></div>',
          }),
          SScrollbar: defineComponent({
            name: 'SScrollbar',
            template: '<div><slot /></div>',
          }),
          SRadioGroup: defineComponent({
            name: 'SRadioGroup',
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<div><slot /></div>',
          }),
          SRadio: defineComponent({
            name: 'SRadio',
            props: ['label'],
            emits: ['update:modelValue'],
            template: '<div class="radio" @click="$emit(\'update:modelValue\', label)"><slot /></div>',
          }),
          SearchInput: defineComponent({
            name: 'SearchInputStub',
            template: '<input class="search-input-stub" />',
          }),
        },
      },
    });

    const vm = wrapper.vm as { selectedCurrency: string; filteredCurrencies: Array<unknown> };
    expect(vm.filteredCurrencies).toHaveLength(2);

    vm.selectedCurrency = 'eur';
    await flushPromises();

    expect(walletStore.currency).toBe('eur');
    expect(settingsStorageStub.set).toHaveBeenCalledWith('currency', 'eur');
  });
});
