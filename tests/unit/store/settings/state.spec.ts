import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.doMock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
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
    WALLET_CONSTS: {
      IndexerType: { SUBQUERY: 'subquery', SUBSQUID: 'subsquid' },
      SoraNetwork: { Test: 'Test' },
    },
  });
});

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
    apiStub: { swap: { isALT: false } },
  };
});

const { apiStub, connectionStub } = walletMocks;

vi.doMock('@/lib/soraneo-wallet/src/api', () => ({
  api: apiStub,
  connection: connectionStub,
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
