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

vi.mock('@/store', () => import('@stubs/store'));
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

let createPiniaInstance: (() => Pinia) | null = null;
let setActivePiniaInstance: ((pinia: Pinia) => void) | null = null;

beforeAll(async () => {
  const pinia = await import('pinia');
  createPiniaInstance = pinia.createPinia;
  setActivePiniaInstance = pinia.setActivePinia;
});

import SelectLanguageDialog from '@/components/App/Settings/Language/SelectLanguageDialog.vue';
import SelectCurrencyDialog from '@/components/App/Settings/Currency/SelectCurrencyDialog.vue';
import { useSettingsStore } from '@/stores/settings';
import rootStore from '@/store';

import type { Currency } from '@wallet/lib/types/currency';

vi.mock('@/utils/staticAssets', () => ({ resolveStaticAssetUrl: (value: string) => value }));

const makeSettingsStore = () => {
  if (!createPiniaInstance || !setActivePiniaInstance) {
    throw new Error('Pinia was not initialized');
  }
  setActivePiniaInstance(createPiniaInstance());
  const store = useSettingsStore();
  rootStore.commit.wallet.settings.setFiatCurrency = vi.fn((currency: Currency) => {
    rootStore.state.wallet.settings.currency = currency;
  });
  return store;
};

describe('settings dialogs (BVT)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects a language and persists via settings store', async () => {
    const store = makeSettingsStore();
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

    vm.selectedLang = 'ru';
    await flushPromises();

    expect(store.language).toBe('ru');
    expect(store.selectLanguageDialogVisibility).toBe(true);
  });

  it('filters and selects a currency', async () => {
    const store = makeSettingsStore();
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

    expect(rootStore.commit.wallet.settings.setFiatCurrency).toHaveBeenCalledWith('eur');
    expect(rootStore.state.wallet.settings.currency).toBe('eur');
  });
});
