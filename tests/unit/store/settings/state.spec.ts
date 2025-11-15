import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.doMock('@wallet', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
  settingsStorage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('@/lang', () => ({
  getLocale: () => 'en',
  getSupportedLocale: () => 'en',
  setDayJsLocale: vi.fn(),
  setI18nLocale: vi.fn(),
}));
vi.mock('@/utils', () => ({
  updateDocumentTitle: vi.fn(),
  updateFpNumberLocale: vi.fn(),
}));
vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    state: {
      wallet: { settings: {} },
    },
    getters: {},
  },
}));

const walletMocks = vi.hoisted(() => {
  const connectionStub = {
    open: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    endpoint: '',
    api: null,
  };

  return {
    connectionStub,
    loadWalletCore: vi.fn(async () => ({
      api: { swap: { isALT: false } },
      connection: connectionStub,
      WALLET_CONSTS: {
        IndexerType: { SUBQUERY: 'subquery', SUBSQUID: 'subsquid' },
        SoraNetwork: { Test: 'Test' },
      },
      WALLET_TYPES: {},
      storage: {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
      },
      settingsStorage: {
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
      },
    })),
  };
});

const { connectionStub } = walletMocks;

vi.doMock('@/utils/walletCore', () => ({
  loadWalletCore: walletMocks.loadWalletCore,
}));

describe('settings store initialisation', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('marks the shared connection instance as raw', async () => {
    const { useSettingsStore } = await import('@/stores/settings');
    const settingsStore = useSettingsStore();

    expect(settingsStore.appConnection.connection).toBe(connectionStub);
  });
});
