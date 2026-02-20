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

vi.mock('@wallet/internal', () => ({
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

vi.mock('@/store', () => ({
  __esModule: true,
  default: {},
}));

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

    expect(app.use).toHaveBeenCalledWith(walletPlugin, expect.objectContaining({ store: expect.any(Object) }));
    expect(app.component).toHaveBeenCalledWith('DialogBase', dialogBaseComponent);
    expect(app.component).toHaveBeenCalledWith('dialog-base', dialogBaseComponent);
  });

  it('uses the provided store in plugin options', async () => {
    const app: any = {
      use: vi.fn(),
      component: vi.fn(),
    };
    const explicitStore = { commit: { wallet: {} } };

    const { install } = await import('@/plugins/wallet');

    await install(app, { store: explicitStore, pinia: {} as any });

    expect(app.use).toHaveBeenCalledWith(walletPlugin, expect.objectContaining({ store: explicitStore }));
  });
});
