import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useWalletStoreMock,
  installWalletPluginsMock,
  addGDriveWalletLocallyMock,
  addSoraWalletLocallyMock,
  addWcSubWalletLocallyMock,
  initializeWalletsMock,
  getWalletPiniaStoreMock,
  resolveGlobalPiniaMock,
  registerGlobalPiniaMock,
  sharedPinia,
  apiMock,
  connectionMock,
  delayMock,
  syncWalletCurrentRouteMock,
} = vi.hoisted(() => ({
  useWalletStoreMock: vi.fn(),
  installWalletPluginsMock: vi.fn(),
  addGDriveWalletLocallyMock: vi.fn(),
  addSoraWalletLocallyMock: vi.fn(),
  addWcSubWalletLocallyMock: vi.fn(),
  initializeWalletsMock: vi.fn(),
  getWalletPiniaStoreMock: vi.fn(),
  resolveGlobalPiniaMock: vi.fn(),
  registerGlobalPiniaMock: vi.fn(),
  sharedPinia: { id: 'shared-pinia' },
  apiMock: {
    initKeyring: vi.fn(async () => undefined),
    restoreActiveAccount: vi.fn(async () => undefined),
    initialize: vi.fn(async () => undefined),
  },
  connectionMock: {
    loading: false,
    api: {},
    endpoint: 'wss://sora.test',
    open: vi.fn(async () => undefined),
  },
  delayMock: vi.fn(async () => undefined),
  syncWalletCurrentRouteMock: vi.fn(),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: useWalletStoreMock,
}));

vi.mock('@/platform/wallet/navigation', () => ({
  syncWalletCurrentRoute: syncWalletCurrentRouteMock,
}));

vi.mock('@/plugins/pinia', () => ({
  registerGlobalPinia: registerGlobalPiniaMock,
  resolveGlobalPinia: resolveGlobalPiniaMock,
}));

vi.mock('@/lib/soraneo-wallet/src/core', () => ({
  SUBQUERY_TYPES: {},
  SUBSQUID_TYPES: {},
  AlertsApiService: {},
  INDEXER_TYPES: {},
  WC: {},
  accountUtils: {},
  addWcSubWalletLocally: addWcSubWalletLocallyMock,
  api: apiMock,
  beforeTransactionSign: vi.fn(),
  connection: connectionMock,
  delay: delayMock,
  en: {},
  formatAccountAddress: vi.fn((value: string) => value),
  getAssetsSubset: vi.fn(),
  getCurrentIndexer: vi.fn(),
  getExplorerLinks: vi.fn(),
  groupRewardsByAssetsList: vi.fn(),
  historyElementsFilter: vi.fn(),
  initializeWallets: initializeWalletsMock,
  runtimeStorage: {},
  settingsStorage: {},
  storage: {},
  validateAddress: vi.fn(),
  vuex: {},
  WALLET_CONSTS: {
    AppWallet: {
      FearlessWallet: 'fearless',
    },
    TranslationConsts: {
      Polkaswap: 'Polkaswap',
    },
  },
  WALLET_TYPES: {},
}));

vi.mock('@/lib/soraneo-wallet/src/plugins', () => ({
  default: installWalletPluginsMock,
}));

vi.mock('@/lib/soraneo-wallet/src/services/google/wallet', () => ({
  addGDriveWalletLocally: addGDriveWalletLocallyMock,
}));

vi.mock('@/lib/soraneo-wallet/src/services/sorawallet', () => ({
  addSoraWalletLocally: addSoraWalletLocallyMock,
}));

vi.mock('@/lib/soraneo-wallet/src/SoraWallet.vue', () => ({
  default: {
    name: 'SoraWalletStub',
    template: '<div class="sora-wallet-stub" />',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/util/scriptLoader', () => ({
  ScriptLoader: class ScriptLoaderMock {},
}));

const loadWalletIndex = async () => {
  vi.resetModules();
  vi.doUnmock('@/lib/soraneo-wallet/src/bootstrap');
  return await import('@/lib/soraneo-wallet/src/index');
};

const loadWalletBootstrap = async () => {
  vi.resetModules();
  vi.doUnmock('@/lib/soraneo-wallet/src/bootstrap');
  return await import('@/lib/soraneo-wallet/src/bootstrap');
};

describe('wallet entry bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWalletPiniaStoreMock.mockReturnValue(null);
    useWalletStoreMock.mockImplementation(() => getWalletPiniaStoreMock());
    resolveGlobalPiniaMock.mockReturnValue(sharedPinia);
    registerGlobalPiniaMock.mockImplementation((pinia) => pinia);
    apiMock.initKeyring.mockResolvedValue(undefined);
    apiMock.restoreActiveAccount.mockResolvedValue(undefined);
    apiMock.initialize.mockResolvedValue(undefined);
    connectionMock.loading = false;
    connectionMock.api = {};
    connectionMock.open.mockResolvedValue(undefined);
    delayMock.mockResolvedValue(undefined);
  });

  it('uses the Pinia wallet store when bootstrapping', async () => {
    const walletStore = {
      setPermissions: vi.fn(),
      getWhitelist: vi.fn(),
      getNftBlacklist: vi.fn(),
    };
    getWalletPiniaStoreMock.mockReturnValue(walletStore as any);

    const { waitForCore } = await loadWalletBootstrap();
    const permissions = { camera: true };

    await waitForCore({ permissions } as never);

    expect(walletStore.setPermissions).toHaveBeenCalledWith(permissions);
    expect(walletStore.getWhitelist).toHaveBeenCalledTimes(1);
    expect(walletStore.getNftBlacklist).toHaveBeenCalledTimes(1);
  });

  it('marks the wallet as loaded through the Pinia wallet store after init finishes', async () => {
    const walletStore = {
      getWhitelist: vi.fn(),
      getNftBlacklist: vi.fn(),
      checkWalletAvailability: vi.fn(),
      updateAvailableWallets: vi.fn(),
      activateInternalSubscriptions: vi.fn(),
      selectIndexer: vi.fn(),
      setIsMstAvailable: vi.fn(),
      activateNetworkSubscriptions: vi.fn(),
      initMultisigAddress: vi.fn(),
      setWalletLoaded: vi.fn(),
      isDesktop: false,
      accountSource: '',
    };
    getWalletPiniaStoreMock.mockReturnValue(walletStore as any);

    const { initWallet } = await loadWalletBootstrap();

    await initWallet();

    expect(walletStore.setWalletLoaded).toHaveBeenCalledWith(true);
  });

  it('marks the wallet shell as loaded before websocket readiness settles', async () => {
    let releaseDelay: (() => void) | null = null;
    const walletStore = {
      getWhitelist: vi.fn(),
      getNftBlacklist: vi.fn(),
      checkWalletAvailability: vi.fn(),
      updateAvailableWallets: vi.fn(),
      activateInternalSubscriptions: vi.fn(),
      selectIndexer: vi.fn(),
      setIsMstAvailable: vi.fn(),
      activateNetworkSubscriptions: vi.fn(),
      initMultisigAddress: vi.fn(),
      setWalletLoaded: vi.fn(),
      isDesktop: false,
      accountSource: '',
    };
    getWalletPiniaStoreMock.mockReturnValue(walletStore as any);
    connectionMock.loading = true;
    connectionMock.api = null;
    delayMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseDelay = () => {
            connectionMock.loading = false;
            connectionMock.api = {};
            resolve();
          };
        })
    );

    const { initWallet } = await loadWalletBootstrap();
    const pending = initWallet();

    for (let attempt = 0; attempt < 20; attempt++) {
      if (walletStore.setWalletLoaded.mock.calls.length) break;
      await Promise.resolve();
    }

    expect(walletStore.setWalletLoaded).toHaveBeenCalledWith(true);
    expect(addWcSubWalletLocallyMock).not.toHaveBeenCalled();

    releaseDelay?.();
    await pending;

    expect(addGDriveWalletLocallyMock).toHaveBeenCalledTimes(1);
    expect(addWcSubWalletLocallyMock).toHaveBeenCalledTimes(1);
  });

  it('waits for whitelist bootstrap before activating network subscriptions', async () => {
    let releaseWhitelist: (() => void) | null = null;
    let releaseBlacklist: (() => void) | null = null;

    const walletStore = {
      getWhitelist: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            releaseWhitelist = resolve;
          })
      ),
      getNftBlacklist: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            releaseBlacklist = resolve;
          })
      ),
      checkWalletAvailability: vi.fn(),
      updateAvailableWallets: vi.fn(),
      activateInternalSubscriptions: vi.fn(),
      selectIndexer: vi.fn(),
      setIsMstAvailable: vi.fn(),
      activateNetworkSubscriptions: vi.fn(async () => undefined),
      initMultisigAddress: vi.fn(),
      setWalletLoaded: vi.fn(),
      isDesktop: false,
      accountSource: '',
    };
    getWalletPiniaStoreMock.mockReturnValue(walletStore as any);

    const { initWallet } = await loadWalletBootstrap();
    const pending = initWallet();

    for (let attempt = 0; attempt < 20; attempt++) {
      if (walletStore.setWalletLoaded.mock.calls.length) break;
      await Promise.resolve();
    }

    expect(walletStore.setWalletLoaded).toHaveBeenCalledWith(true);
    expect(walletStore.activateNetworkSubscriptions).not.toHaveBeenCalled();

    releaseWhitelist?.();
    await Promise.resolve();
    expect(walletStore.activateNetworkSubscriptions).not.toHaveBeenCalled();

    releaseBlacklist?.();
    await pending;

    expect(walletStore.activateNetworkSubscriptions).toHaveBeenCalledTimes(1);
  });

  it('registers the wallet root component during plugin install', async () => {
    const app = {
      use: vi.fn(),
      component: vi.fn(),
      config: {
        globalProperties: {},
      },
    } as any;

    const walletRuntime = await loadWalletIndex();

    walletRuntime.default.install(app, {} as never);

    expect(installWalletPluginsMock).toHaveBeenCalledWith(app);
    expect(app.component).toHaveBeenCalledWith('SoraWallet', expect.any(Object));
  });

  it('does not expose the deleted shared wallet component registry', async () => {
    const walletRuntime = await loadWalletIndex();

    expect('components' in walletRuntime).toBe(false);
  });

  it('re-exports the wallet composable registry', async () => {
    const walletRuntime = await loadWalletIndex();

    expect(walletRuntime.composables.useLoading).toBeTypeOf('function');
    expect(walletRuntime.composables.useTransaction).toBeTypeOf('function');
    expect(walletRuntime.composables.useWalletTranslation).toBeTypeOf('function');
  });

  it('allows plugin install when Pinia wallet state is available', async () => {
    const walletStore = {
      setPermissions: vi.fn(),
      getWhitelist: vi.fn(),
      getNftBlacklist: vi.fn(),
    };
    const app = {
      use: vi.fn(),
      component: vi.fn(),
      config: {
        globalProperties: {},
      },
    } as any;
    getWalletPiniaStoreMock.mockReturnValue(walletStore as any);

    const walletRuntime = await loadWalletIndex();

    walletRuntime.default.install(app, {} as never);
    await walletRuntime.waitForCore({ permissions: { camera: true } } as never);

    expect(walletStore.setPermissions).toHaveBeenCalledWith({ camera: true });
    expect(walletStore.getWhitelist).toHaveBeenCalledTimes(1);
    expect(walletStore.getNftBlacklist).toHaveBeenCalledTimes(1);
    expect(installWalletPluginsMock).toHaveBeenCalledWith(app);
  });
});
