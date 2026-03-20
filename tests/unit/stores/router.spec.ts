import { createPinia, setActivePinia } from 'pinia';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { PageNames } from '@/consts';
import { RouteNames as WalletRouteNames } from '@wallet/src/consts';
import { setAppStoreOverride } from '@/utils/app-store';

vi.mock('@/store', () => {
  const navigateMock = vi.fn();
  const gettersMock = {
    wallet: {
      account: {
        isLoggedIn: false,
      },
    },
  };

  return {
    __esModule: true,
    default: {
      commit: {
        wallet: {
          router: {
            navigate: navigateMock,
          },
        },
      },
      getters: gettersMock,
    },
    navigateMock,
    gettersMock,
  };
});

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

import store, { gettersMock, navigateMock } from '@/store';
import { useRouterStore } from '@/stores/router';

describe('router store', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    navigateMock.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    gettersMock.wallet.account.isLoggedIn = false;
    const legacyStore = (await import('@/store')).default;
    setAppStoreOverride(legacyStore as any);
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

  it('navigates while syncing legacy store', () => {
    const routerStore = useRouterStore();

    routerStore.navigate({ name: PageNames.Bridge, params: { foo: 'bar' } });

    expect(routerStore.current).toBe(PageNames.Bridge);
    expect(routerStore.currentParams).toEqual({ foo: 'bar' });
    expect(store.commit.wallet.router.navigate).toHaveBeenCalledWith({
      name: PageNames.Bridge,
      params: { foo: 'bar' },
    });
  });

  it('back navigates to previous wallet route when logged in', () => {
    const routerStore = useRouterStore();
    routerStore.setRoute({ current: WalletRouteNames.CreateToken, prev: WalletRouteNames.Wallet });
    gettersMock.wallet.account.isLoggedIn = true;
    navigateMock.mockClear();

    routerStore.back();

    expect(routerStore.current).toBe(WalletRouteNames.Wallet);
    expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ name: WalletRouteNames.Wallet }));
  });

  it('checkCurrentRoute redirects to connection when logged out', () => {
    const routerStore = useRouterStore();
    routerStore.setRoute({ current: WalletRouteNames.Wallet });
    gettersMock.wallet.account.isLoggedIn = false;
    navigateMock.mockClear();

    routerStore.checkCurrentRoute();

    expect(routerStore.current).toBe(WalletRouteNames.WalletConnection);
    expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ name: WalletRouteNames.WalletConnection }));
  });

  it('checkCurrentRoute redirects to wallet when logged in from connection', () => {
    const routerStore = useRouterStore();
    routerStore.setRoute({ current: WalletRouteNames.WalletConnection });
    gettersMock.wallet.account.isLoggedIn = true;
    navigateMock.mockClear();

    routerStore.checkCurrentRoute();

    expect(routerStore.current).toBe(WalletRouteNames.Wallet);
    expect(navigateMock).toHaveBeenCalledWith(expect.objectContaining({ name: WalletRouteNames.Wallet }));
  });
});
