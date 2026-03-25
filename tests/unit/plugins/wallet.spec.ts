import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

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
const walletPlugin = vi.fn();

vi.mock('@/shims/wallet', () => ({
  __esModule: true,
  default: walletPlugin,
  components: {
    DialogBase: dialogBaseComponent,
  },
}));

vi.mock('@wallet', async () => {
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

    await install(app, { pinia: {} as any });

    expect(app.use).toHaveBeenCalledWith(walletPlugin, expect.any(Object));
    expect(app.use.mock.calls[0]?.[1]?.store).toBeUndefined();
    expect(app.component).toHaveBeenCalledWith('DialogBase', dialogBaseComponent);
    expect(app.component).toHaveBeenCalledWith('dialog-base', dialogBaseComponent);
  });

  it('does not forward legacy store options into the wallet plugin', async () => {
    const app: any = {
      use: vi.fn(),
      component: vi.fn(),
    };
    const compatStore = {
      state: { wallet: {} },
      getters: {},
      commit: vi.fn(),
      dispatch: vi.fn(),
    };

    const { install } = await import('@/plugins/wallet');

    await install(app, { store: compatStore, pinia: {} as any } as any);
    expect(app.use.mock.calls[0]?.[1]?.store).toBeUndefined();
  });
});
