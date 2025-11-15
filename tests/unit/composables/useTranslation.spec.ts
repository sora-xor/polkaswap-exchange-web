import { createPinia, setActivePinia } from 'pinia';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, nextTick, reactive, ref } from 'vue';

import { useSettingsStore } from '@/stores/settings';

const walletCoreStub = {
  api: {},
  connection: {},
  WALLET_CONSTS: {
    TranslationConsts: {},
    IndexerType: {},
    SoraNetwork: {},
  },
  WALLET_TYPES: {
    IndexerState: {},
    FilterOptions: {},
  },
} as const;

vi.mock('@/utils/walletCore', () => ({
  loadWalletCore: async () => walletCoreStub,
}));

const i18nStub = {
  global: {
    locale: ref('en'),
  },
};

vi.mock('@/lang', () => ({
  __esModule: true,
  default: i18nStub,
}));

vi.mock('@wallet/src/composables/useTranslation', () => {
  return {
    useTranslation: () => {
      const i18nInstance = (globalThis as Record<string, any>).__TEST_I18N__;
      const dayjsLocale = computed(() => {
        const locale = i18nInstance?.global.locale.value ?? 'en';
        return locale === 'hy' ? 'hy-am' : locale;
      });

      return {
        dayjsLocale,
        t: (key: string) => key,
        tc: (key: string) => key,
        te: () => true,
      };
    },
    translationUtils: {
      TranslationConsts: {},
      t: (key: string) => key,
      tc: (key: string) => key,
      te: () => true,
      formatDate: (value?: number | string) => String(value ?? ''),
      getDayjsLocale: () => {
        const i18nInstance = (globalThis as Record<string, any>).__TEST_I18N__;
        const locale = i18nInstance?.global.locale.value ?? 'en';
        return locale === 'hy' ? 'hy-am' : locale;
      },
    },
  };
});
const storeState = reactive({
  settings: {
    language: 'en',
  },
});

vi.mock('@/store', () => ({
  default: {
    state: storeState,
  },
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    setLanguageState(lang: any) {
      storeState.settings.language = lang;
    },
  }),
}));

const { localStorageMock } = vi.hoisted(() => {
  const storage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  vi.stubGlobal('localStorage', storage);

  return { localStorageMock: storage };
});

let useTranslation: (typeof import('@/composables/useTranslation'))['useTranslation'];
let i18n: typeof import('@/lang').default;
let settingsStore: ReturnType<typeof useSettingsStore>;

beforeAll(async () => {
  setActivePinia(createPinia());
  settingsStore = useSettingsStore();
  settingsStore.setLanguageState('en' as any);
  ({ useTranslation } =
    await vi.importActual<typeof import('@/composables/useTranslation')>('@/composables/useTranslation'));
  i18n = i18nStub as typeof import('@/lang').default;
  (globalThis as Record<string, any>).__TEST_I18N__ = i18n;
});

describe('useTranslation', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    settingsStore = useSettingsStore();
    settingsStore.setLanguageState('en' as any);
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  afterEach(() => {
    if (i18n) {
      i18n.global.locale.value = 'en';
    }
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    delete (globalThis as Record<string, any>).__TEST_I18N__;
  });

  it('provides english ordinal suffixes', () => {
    const translation = useTranslation();

    expect(translation.tOrdinal(1)).toBe('1st');
    expect(translation.tOrdinal(2)).toBe('2nd');
    expect(translation.tOrdinal(3)).toBe('3rd');
    expect(translation.tOrdinal(4)).toBe('4th');
    expect(translation.tOrdinal(0)).toBe('0');
    expect(translation.tOrdinal('11')).toBe('11th');
  });

  it('returns value unchanged for unsupported locales', async () => {
    const translation = useTranslation();

    settingsStore.setLanguageState('ru' as any);
    await nextTick();

    expect(translation.tOrdinal(1)).toBe('1');
    expect(translation.tOrdinal('2')).toBe('2');
  });

  it('normalizes dayjs locale names', async () => {
    const translation = useTranslation();

    i18n.global.locale.value = 'hy';
    await nextTick();

    expect(translation.dayjsLocale.value).toBe('hy-am');
  });
});
