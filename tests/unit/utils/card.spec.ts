import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { walletConstsMock, walletStorageMock, walletSettingsStorageMock } = vi.hoisted(() => {
  return {
    walletConstsMock: {
      WALLET_CONSTS: {
        SoraNetwork: {
          Test: 'Test',
          Prod: 'Prod',
        },
      },
    },
    walletStorageMock: {
      set: vi.fn(),
      get: vi.fn(),
      remove: vi.fn(),
    },
    walletSettingsStorageMock: {
      set: vi.fn(),
      get: vi.fn(() => null),
      remove: vi.fn(),
    },
  };
});

vi.mock('@wallet', async () => {
  const walletStub = await vi.importActual<typeof import('@tests/stubs/@wallet')>('@tests/stubs/@wallet');
  return {
    ...walletStub,
    WALLET_CONSTS: walletConstsMock.WALLET_CONSTS,
    storage: walletStorageMock,
    settingsStorage: walletSettingsStorageMock,
    default: {
      ...(walletStub as { default?: Record<string, unknown> }).default,
      WALLET_CONSTS: walletConstsMock.WALLET_CONSTS,
      storage: walletStorageMock,
      settingsStorage: walletSettingsStorageMock,
    },
  };
});

vi.mock('@wallet/core', async () => ({
  __esModule: true,
  WALLET_CONSTS: walletConstsMock.WALLET_CONSTS,
  default: {
    WALLET_CONSTS: walletConstsMock.WALLET_CONSTS,
  },
}));

const WALLET_CONSTS = walletConstsMock.WALLET_CONSTS;

vi.mock('@/store', () => import('@stubs/store'));
vi.mock('@/utils/walletCore', () => ({
  loadWalletCore: vi.fn(async () => ({
    WALLET_CONSTS: walletConstsMock.WALLET_CONSTS,
  })),
}));

const { localStorageMock } = vi.hoisted(() => {
  const store = new Map<string, string>();

  const storage = {
    getItem: vi.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    get length() {
      return store.size;
    },
  } as Storage & {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    key: ReturnType<typeof vi.fn>;
  };

  vi.stubGlobal('localStorage', storage);

  return { localStorageMock: storage };
});

import { clearPayWingsKeysFromLocalStorage, clearTokensFromLocalStorage, soraCard } from '@/utils/card';
import { getAllowedSoraCardScriptOrigins, getSoraCardServiceConfig, setSoraCardConfig } from '@/config/soracard';

describe('soraCard configuration', () => {
  const network = WALLET_CONSTS.SoraNetwork.Test;

  beforeEach(() => {
    setSoraCardConfig(null);
  });

  it('returns default auth and KYC services for the selected network', () => {
    const config = soraCard(network);
    expect(config.authService).toMatchObject({
      sdkURL: expect.stringContaining('auth-test.soracard.com'),
      env: network,
    });
    expect(config.kycService).toMatchObject({
      sdkURL: expect.stringContaining('kyc-test.soracard.com'),
      env: network,
    });
  });

  it('allows overriding individual service secrets', () => {
    setSoraCardConfig({
      authService: {
        [network]: {
          apiKey: 'override-key',
        },
      },
    });

    const authService = getSoraCardServiceConfig(network, 'authService');
    expect(authService?.apiKey).toBe('override-key');
  });

  it('filters configured script origins', () => {
    setSoraCardConfig({
      allowedScriptOrigins: ['https://allowed.example.com', '', '   '],
    });

    expect(getAllowedSoraCardScriptOrigins()).toEqual(['https://allowed.example.com']);
  });
});

describe('soraCard token utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('clears stored access tokens from localStorage', () => {
    localStorage.setItem('PW-token', 'token');
    localStorage.setItem('PW-refresh-token', 'refresh');

    clearTokensFromLocalStorage();

    expect(localStorage.getItem('PW-token')).toBeNull();
    expect(localStorage.getItem('PW-refresh-token')).toBeNull();
  });

  it('removes PayWings bookkeeping keys and conditionally clears tokens', () => {
    const keys = ['PW-ProcessID', 'PW-conf', 'PW-retry', 'PW-refresh-token', 'PW-token'];

    keys.forEach((key) => localStorage.setItem(key, 'value'));

    clearPayWingsKeysFromLocalStorage(true);

    keys.forEach((key) => {
      expect(localStorage.getItem(key)).toBeNull();
    });
  });
});
