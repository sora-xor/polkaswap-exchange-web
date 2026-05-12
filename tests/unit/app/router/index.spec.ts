import { afterEach, describe, expect, it, vi } from 'vitest';

const PAGE_NAMES = {
  Wallet: 'wallet',
  Swap: 'swap',
  Bridge: 'bridge',
} as const;

const routeMocks = vi.hoisted(() => ({
  routes: [{ name: 'route-sentinel', path: '/sentinel' }],
}));

const routerMocks = vi.hoisted(() => {
  const currentRoute = { value: { name: 'swap' as string | undefined } };
  const push = vi.fn();
  const beforeEach = vi.fn();
  const router = { currentRoute, push, beforeEach };

  return {
    currentRoute,
    push,
    beforeEach,
    router,
    createRouter: vi.fn(() => router),
    createWebHashHistory: vi.fn(() => 'hash-history'),
  };
});

const guardMocks = vi.hoisted(() => {
  const guard = vi.fn();

  return {
    guard,
    createBeforeEachGuard: vi.fn(() => guard),
  };
});

const adapterMocks = vi.hoisted(() => ({
  setRouterLoading: vi.fn(),
  syncRoute: vi.fn(),
}));

const walletStoreMocks = vi.hoisted(() => {
  const walletStore = {
    isLoggedIn: false,
    prepareWalletEntryNavigation: vi.fn(),
  };

  return {
    walletStore,
    useWalletStore: vi.fn(() => walletStore),
  };
});

const bridgeStoreMocks = vi.hoisted(() => {
  const bridgeStore = {
    resetHistoryPage: vi.fn(),
  };

  return {
    bridgeStore,
    useBridgeStore: vi.fn(() => bridgeStore),
  };
});

const referralMocks = vi.hoisted(() => ({
  persistReferralAddress: vi.fn(),
}));

const addressMocks = vi.hoisted(() => ({
  isValidWalletAddress: vi.fn(() => true),
}));

const utilityMocks = vi.hoisted(() => ({
  registerDocumentTitleResolver: vi.fn(),
  updateDocumentTitle: vi.fn(),
}));

vi.mock('vue-router', () => ({
  createRouter: routerMocks.createRouter,
  createWebHashHistory: routerMocks.createWebHashHistory,
}));

vi.mock('@/app/router/routes', () => ({
  routes: routeMocks.routes,
}));

vi.mock('@/app/router/guards/navigation', () => ({
  createBeforeEachGuard: guardMocks.createBeforeEachGuard,
}));

vi.mock('@/adapters/router/navigation', () => ({
  setRouterLoading: adapterMocks.setRouterLoading,
  syncRoute: adapterMocks.syncRoute,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: walletStoreMocks.useWalletStore,
}));

vi.mock('@/stores/bridge', () => ({
  useBridgeStore: bridgeStoreMocks.useBridgeStore,
}));

vi.mock('@/adapters/wallet/referrals', () => ({
  persistReferralAddress: referralMocks.persistReferralAddress,
}));

vi.mock('@/adapters/wallet/addresses', () => ({
  isValidWalletAddress: addressMocks.isValidWalletAddress,
}));

vi.mock('@/utils', () => ({
  registerDocumentTitleResolver: utilityMocks.registerDocumentTitleResolver,
  updateDocumentTitle: utilityMocks.updateDocumentTitle,
}));

vi.mock('@/consts', () => ({
  PageNames: PAGE_NAMES,
}));

const loadRouterModule = async () => {
  vi.resetModules();
  return await import('@/app/router/index');
};

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();

  routerMocks.currentRoute.value = { name: PAGE_NAMES.Swap };
  walletStoreMocks.walletStore.isLoggedIn = false;
});

describe('app router singleton', () => {
  it('creates the router, registers the title resolver, and installs the navigation guard', async () => {
    const routerModule = await loadRouterModule();

    expect(routerModule.default).toBe(routerMocks.router);
    expect(routerMocks.createWebHashHistory).toHaveBeenCalledTimes(1);
    expect(routerMocks.createRouter).toHaveBeenCalledWith({
      history: 'hash-history',
      routes: routeMocks.routes,
    });
    expect(guardMocks.createBeforeEachGuard).toHaveBeenCalledWith({
      setRoute: adapterMocks.syncRoute,
      walletStore: walletStoreMocks.walletStore,
      resetBridgeHistoryPage: expect.any(Function),
      persistReferral: referralMocks.persistReferralAddress,
      validateAddress: addressMocks.isValidWalletAddress,
      updateDocumentTitle: utilityMocks.updateDocumentTitle,
    });
    expect(bridgeStoreMocks.useBridgeStore).not.toHaveBeenCalled();
    expect(routerMocks.beforeEach).toHaveBeenCalledWith(guardMocks.guard);
    expect(utilityMocks.registerDocumentTitleResolver).toHaveBeenCalledTimes(1);

    const resolveCurrentRoute = utilityMocks.registerDocumentTitleResolver.mock.calls[0]?.[0] as
      | (() => unknown)
      | undefined;

    expect(resolveCurrentRoute?.()).toBe(routerMocks.currentRoute.value);
  });

  it('loads the bridge store only when the guard asks to reset bridge history', async () => {
    await loadRouterModule();

    const services = guardMocks.createBeforeEachGuard.mock.calls[0]?.[0] as
      | { resetBridgeHistoryPage?: () => Promise<void> }
      | undefined;

    await services?.resetBridgeHistoryPage?.();

    expect(bridgeStoreMocks.useBridgeStore).toHaveBeenCalledTimes(1);
    expect(bridgeStoreMocks.bridgeStore.resetHistoryPage).toHaveBeenCalledTimes(1);
  });

  it('returns early when navigating to the current wallet route but still prepares wallet entry', async () => {
    routerMocks.currentRoute.value = { name: PAGE_NAMES.Wallet };
    const { goTo } = await loadRouterModule();

    await goTo(PAGE_NAMES.Wallet);

    expect(walletStoreMocks.walletStore.prepareWalletEntryNavigation).toHaveBeenCalledTimes(1);
    expect(routerMocks.push).not.toHaveBeenCalled();
    expect(adapterMocks.setRouterLoading).not.toHaveBeenCalled();
  });

  it('pushes new routes while toggling router loading', async () => {
    routerMocks.push.mockResolvedValue(undefined);
    const { goTo } = await loadRouterModule();

    await goTo(PAGE_NAMES.Wallet);

    expect(walletStoreMocks.walletStore.prepareWalletEntryNavigation).toHaveBeenCalledTimes(1);
    expect(adapterMocks.setRouterLoading).toHaveBeenNthCalledWith(1, true);
    expect(routerMocks.push).toHaveBeenCalledWith({ name: PAGE_NAMES.Wallet });
    expect(adapterMocks.setRouterLoading).toHaveBeenNthCalledWith(2, false);
  });

  it('clears the loading flag even when navigation fails', async () => {
    const failure = new Error('navigation failed');
    routerMocks.push.mockRejectedValueOnce(failure);
    const { goTo } = await loadRouterModule();

    await expect(goTo(PAGE_NAMES.Bridge)).rejects.toThrow('navigation failed');

    expect(walletStoreMocks.walletStore.prepareWalletEntryNavigation).not.toHaveBeenCalled();
    expect(adapterMocks.setRouterLoading).toHaveBeenNthCalledWith(1, true);
    expect(adapterMocks.setRouterLoading).toHaveBeenNthCalledWith(2, false);
  });
});
