import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia } from 'pinia';

vi.mock(
  'base-64',
  () => ({
    __esModule: true,
    default: {
      encode: vi.fn(),
      decode: vi.fn(),
    },
  }),
  { virtual: true }
);

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

const dialogBaseComponent = { name: 'DialogBaseMock' };
const installWalletPlugins = vi.fn();
const WALLET_PLUGIN_TEST_TIMEOUT_MS = 20_000;

vi.mock('@/lib/soraneo-wallet/src/components/DialogBase.vue', () => ({
  __esModule: true,
  default: dialogBaseComponent,
}));

vi.mock('@/lib/soraneo-wallet/src/plugins', () => ({
  __esModule: true,
  default: installWalletPlugins,
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

describe('wallet plugin', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('registers dialog-base globally', async () => {
    const componentRegistry = new Map<string, unknown>();
    const app: any = {
      use: vi.fn(),
      component: vi.fn((name: string, value?: unknown) => {
        if (value) {
          componentRegistry.set(name, value);
        }
        return componentRegistry.get(name);
      }),
    };

    const { install } = await import('@/plugins/wallet');

    install(app, { pinia: createPinia() });

    expect(installWalletPlugins).toHaveBeenCalledWith(app);
    expect(app.use).not.toHaveBeenCalled();
    expect(app.component).toHaveBeenCalledWith('DialogBase', dialogBaseComponent);
    expect(app.component).toHaveBeenCalledWith('dialog-base', dialogBaseComponent);
  }, WALLET_PLUGIN_TEST_TIMEOUT_MS);

  it('ignores legacy store options and still registers wallet components', async () => {
    const app: any = {
      use: vi.fn(),
      component: vi.fn(() => undefined),
    };
    const compatStore = {
      state: { wallet: {} },
      getters: {},
      commit: vi.fn(),
      dispatch: vi.fn(),
    };

    const { install } = await import('@/plugins/wallet');

    install(app, { store: compatStore, pinia: createPinia() } as any);

    expect(installWalletPlugins).toHaveBeenCalledWith(app);
    expect(app.use).not.toHaveBeenCalled();
    expect(app.component).toHaveBeenCalledWith('DialogBase', dialogBaseComponent);
  }, WALLET_PLUGIN_TEST_TIMEOUT_MS);
});
