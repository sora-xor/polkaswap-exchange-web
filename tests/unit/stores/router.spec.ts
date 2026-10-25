import { createPinia, setActivePinia } from 'pinia';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { PageNames, RouteNames as WalletRouteNames } from '@/consts';

const walletStoreMock = vi.hoisted(() => ({
  isLoggedIn: false,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
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

import { useRouterStore } from '@/stores/router';

describe('router store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    walletStoreMock.isLoggedIn = false;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('updates route params and loading flag', () => {
    const routerStore = useRouterStore();

    expect(routerStore.loading).toBe(false);
    expect(routerStore.current).toBeNull();
    expect(routerStore.prev).toBeNull();

    routerStore.setLoading(true);
    routerStore.setRoute({ prev: PageNames.Swap, current: PageNames.Bridge });

    expect(routerStore.loading).toBe(true);
    expect(routerStore.prev).toBe(PageNames.Swap);
    expect(routerStore.current).toBe(PageNames.Bridge);
    expect(routerStore.prevParams).toEqual({});
    expect(routerStore.currentParams).toEqual({});

    routerStore.reset();

    expect(routerStore.loading).toBe(false);
    expect(routerStore.prev).toBeNull();
    expect(routerStore.current).toBeNull();
    expect(routerStore.prevParams).toEqual({});
    expect(routerStore.currentParams).toEqual({});
  });

  it('navigates within native Pinia router state', () => {
    const routerStore = useRouterStore();

    routerStore.navigate({ name: PageNames.Bridge, params: { foo: 'bar' } });

    expect(routerStore.prev).toBeNull();
    expect(routerStore.current).toBe(PageNames.Bridge);
    expect(routerStore.currentParams).toEqual({ foo: 'bar' });
  });

  it('back navigates to previous wallet route when logged in', async () => {
    const routerStore = useRouterStore();
    routerStore.setRoute({ current: WalletRouteNames.CreateToken, prev: WalletRouteNames.Wallet });
    walletStoreMock.isLoggedIn = true;

    await routerStore.back();

    expect(routerStore.current).toBe(WalletRouteNames.Wallet);
    expect(routerStore.prev).toBe(WalletRouteNames.CreateToken);
  });

  it('checkCurrentRoute redirects to connection when logged out', async () => {
    const routerStore = useRouterStore();
    routerStore.setRoute({ current: WalletRouteNames.Wallet });
    walletStoreMock.isLoggedIn = false;

    await routerStore.checkCurrentRoute();

    expect(routerStore.current).toBe(WalletRouteNames.WalletConnection);
    expect(routerStore.prev).toBe(WalletRouteNames.Wallet);
  });

  it('checkCurrentRoute redirects to wallet when logged in from connection', async () => {
    const routerStore = useRouterStore();
    routerStore.setRoute({ current: WalletRouteNames.WalletConnection, prev: WalletRouteNames.Wallet });
    walletStoreMock.isLoggedIn = true;

    await routerStore.checkCurrentRoute();

    expect(routerStore.current).toBe(WalletRouteNames.Wallet);
    expect(routerStore.prev).toBe(WalletRouteNames.WalletConnection);
  });

  it('checkCurrentRoute restores the previous page when logging in from another page', async () => {
    const routerStore = useRouterStore();
    routerStore.setRoute({
      current: WalletRouteNames.WalletConnection,
      prev: PageNames.Pool,
      prevParams: { foo: 'bar' },
    });
    walletStoreMock.isLoggedIn = true;

    await routerStore.checkCurrentRoute();

    expect(routerStore.current).toBe(PageNames.Pool);
    expect(routerStore.currentParams).toEqual({ foo: 'bar' });
    expect(routerStore.prev).toBe(WalletRouteNames.WalletConnection);
  });
});
