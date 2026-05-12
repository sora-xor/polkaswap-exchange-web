import { flushPromises, shallowMount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BreakpointClass } from '@/consts/layout';

const legacyStoreHolder = vi.hoisted(() => ({
  current: null as any,
}));

const createStoreMocks = () => {
  const state = reactive({
    settings: {
      screenBreakpointClass: BreakpointClass.Mobile,
      appConnection: {
        nodeList: ['wss://node.example'],
        setDefaultNodes: vi.fn(),
        setNetworkChainGenesisHash: vi.fn(),
      },
      userDisclaimerApprove: false,
      disclaimerVisibility: true,
      browserNotifPopupVisibility: false,
      browserNotifPopupBlockedVisibility: false,
      isThemePreference: false,
      isOrientationWarningVisible: false,
      disclaimerVisibility: false,
      userDisclaimerApprove: true,
      selectNodeDialogVisibility: false,
      selectIndexerDialogVisibility: false,
    },
    web3: {
      soraAccountDialogVisibility: false,
      selectProviderDialogVisibility: false,
      selectNetworkDialogVisibility: false,
      selectSubNodeDialogVisibility: false,
      subAccountDialogVisibility: false,
    },
    wallet: {
      settings: {
        isMSTAvailable: false,
        isWalletLoaded: true,
      },
      account: {
        address: 'cnRXua6zs8TaE87BQFL6uWVbT2g6GXsUjwk6PTvL6UHcHDCvo',
        isLoggedIn: true,
      },
      transactions: {
        isSignTxDialogVisible: false,
        pendingMstTransactions: [],
      },
    },
    referrals: {
      storageReferrer: '',
      referrer: '',
    },
    router: {
      loading: false,
    },
  });

  const commit = {
    wallet: {
      settings: {
        setSoraNetwork: vi.fn(),
        setIndexerEndpoint: vi.fn(),
      },
      transactions: {
        setSignTxDialogVisibility: vi.fn(),
      },
    },
    settings: {
      setFaucetUrl: vi.fn(),
      setFeatureFlags: vi.fn(),
      setScreenBreakpointClass: vi.fn(),
      setDisclaimerDialogVisibility: vi.fn((flag: boolean) => {
        state.settings.disclaimerVisibility = flag;
      }),
      setSelectNodeDialogVisibility: vi.fn((flag: boolean) => {
        state.settings.selectNodeDialogVisibility = flag;
      }),
      setSelectIndexerDialogVisibility: vi.fn((flag: boolean) => {
        state.settings.selectIndexerDialogVisibility = flag;
      }),
      showOrientationWarning: vi.fn(() => {
        state.settings.isOrientationWarningVisible = true;
      }),
      hideOrientationWarning: vi.fn(() => {
        state.settings.isOrientationWarningVisible = false;
      }),
      setDisclaimerDialogVisibility: vi.fn((flag: boolean) => {
        state.settings.disclaimerVisibility = flag;
      }),
      toggleDisclaimerDialogVisibility: vi.fn(),
      setBrowserNotifsPopupEnabled: vi.fn((flag: boolean) => {
        state.settings.browserNotifPopupVisibility = flag;
      }),
      setBrowserNotifsPopupBlocked: vi.fn((flag: boolean) => {
        state.settings.browserNotifPopupBlockedVisibility = flag;
      }),
    },
    referrals: {
      unsubscribeFromInvitedUsers: vi.fn(),
      resetStorageReferrer: vi.fn(),
    },
    web3: {
      setEvmNetworksApp: vi.fn(),
      setSubNetworkApps: vi.fn(),
      setEthBridgeSettings: vi.fn(),
      setSoraAccountDialogVisibility: vi.fn((flag: boolean) => {
        state.web3.soraAccountDialogVisibility = flag;
      }),
      setSelectProviderDialogVisibility: vi.fn((flag: boolean) => {
        state.web3.selectProviderDialogVisibility = flag;
      }),
      setSelectNetworkDialogVisibility: vi.fn((flag: boolean) => {
        state.web3.selectNetworkDialogVisibility = flag;
      }),
      setSelectSubNodeDialogVisibility: vi.fn((flag: boolean) => {
        state.web3.selectSubNodeDialogVisibility = flag;
      }),
      setSubAccountDialogVisibility: vi.fn((flag: boolean) => {
        state.web3.subAccountDialogVisibility = flag;
      }),
    },
  };

  const dispatch = {
    settings: {
      setLanguage: vi.fn().mockResolvedValue(undefined),
      fetchAdsArray: vi.fn().mockResolvedValue(undefined),
    },
    referrals: {
      getReferrer: vi.fn().mockResolvedValue(undefined),
    },
  };

  return {
    state,
    commit,
    dispatch,
    originalCommit: vi.fn(),
  };
};

vi.mock('lodash/debounce', () => ({
  default: (fn: (...args: Array<unknown>) => unknown) => {
    const debounced = ((...args: Array<unknown>) => fn(...args)) as ((...args: Array<unknown>) => unknown) & {
      cancel: ReturnType<typeof vi.fn>;
      flush: ReturnType<typeof vi.fn>;
    };
    debounced.cancel = vi.fn();
    debounced.flush = vi.fn();
    return debounced;
  },
}));

vi.mock('vue-router', () => {
  const { reactive } = require('vue') as typeof import('vue');

  const routeState = reactive({
    name: 'Swap',
    fullPath: '/swap',
  });

  return {
    useRoute: () => routeState,
    __mocks: {
      routeState,
    },
  };
});

vi.mock('@/router', () => {
  const { defineComponent, h } = require('vue') as typeof import('vue');
  const goTo = vi.fn();
  const lazyComponent = vi.fn(() =>
    defineComponent({
      name: 'LazyComponentStub',
      setup(_, { slots }) {
        return () => h('div', { class: 'lazy-component-stub' }, slots.default?.());
      },
    })
  );

  return {
    __esModule: true,
    default: {
      options: {
        history: {
          type: 'hash',
        },
      },
    },
    goTo,
    lazyComponent,
  };
});

vi.mock('@/app/shell/AppShellLayout.vue', () => ({
  default: {
    name: 'AppShellLayoutStub',
    template: '<div class="app-shell-layout-stub"></div>',
  },
}));

vi.mock('@/app/shell/AppShellOverlays.vue', () => ({
  default: {
    name: 'AppShellOverlaysStub',
    template: '<div class="app-shell-overlays-stub"></div>',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/NotificationProvider.vue', () => ({
  default: {
    name: 'NotificationProviderStub',
    template: '<div class="notification-provider-stub"><slot /></div>',
  },
}));

vi.mock('@/app/router', () => ({
  __esModule: true,
  default: {
    options: {
      history: {
        type: 'hash',
      },
    },
  },
  goTo: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {},
  connection: {
    close: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/soraneo-wallet/src/services/alerts', () => ({
  __esModule: true,
  default: {
    baseRoute: '',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/bootstrap', () => ({
  initWallet: vi.fn().mockResolvedValue(undefined),
  waitForCore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/api', () => {
  const get = vi.fn().mockResolvedValue({
    data: {
      NETWORK_TYPE: 'Prod',
      POLKASWAP_INDEXER_ENDPOINT: 'https://indexer.example',
    },
  });

  return {
    __esModule: true,
    default: {
      get,
    },
    updateBaseUrl: vi.fn(),
    getFullBaseUrl: vi.fn(() => 'http://localhost/#/'),
    __mocks: {
      get,
    },
  };
});

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => {
    const root = legacyStoreHolder.current;

    return {
      get disclaimerVisibility() {
        return root.state.settings.disclaimerVisibility;
      },
      get userDisclaimerApprove() {
        return root.state.settings.userDisclaimerApprove;
      },
      get screenBreakpointClass() {
        return root.state.settings.screenBreakpointClass;
      },
      get appConnection() {
        return root.state.settings.appConnection;
      },
      get browserNotifPopupVisibility() {
        return root.state.settings.browserNotifPopupVisibility;
      },
      get browserNotifPopupBlockedVisibility() {
        return root.state.settings.browserNotifPopupBlockedVisibility;
      },
      get isThemePreference() {
        return root.state.settings.isThemePreference;
      },
      get isOrientationWarningVisible() {
        return root.state.settings.isOrientationWarningVisible;
      },
      get selectNodeDialogVisibility() {
        return root.state.settings.selectNodeDialogVisibility;
      },
      get selectIndexerDialogVisibility() {
        return root.state.settings.selectIndexerDialogVisibility;
      },
      get isTMA() {
        return false;
      },
      get nodeIsConnected() {
        return true;
      },
      get libraryTheme() {
        return 'light';
      },
      get libraryDesignSystem() {
        return { theme: 'light' };
      },
      get isWalletLoaded() {
        return true;
      },
      get isMSTAvailable() {
        return false;
      },
      setFaucetUrl: root.commit.settings.setFaucetUrl,
      setFeatureFlags: root.commit.settings.setFeatureFlags,
      setScreenBreakpointClass: root.commit.settings.setScreenBreakpointClass,
      setDisclaimerDialogVisibility: root.commit.settings.setDisclaimerDialogVisibility,
      showOrientationWarning: root.commit.settings.showOrientationWarning,
      hideOrientationWarning: root.commit.settings.hideOrientationWarning,
      setSelectNodeDialogVisibility: root.commit.settings.setSelectNodeDialogVisibility,
      setSelectIndexerDialogVisibility: root.commit.settings.setSelectIndexerDialogVisibility,
      setDisclaimerDialogVisibility: root.commit.settings.setDisclaimerDialogVisibility,
      setBrowserNotifsPopupEnabled: root.commit.settings.setBrowserNotifsPopupEnabled,
      setBrowserNotifsPopupBlocked: root.commit.settings.setBrowserNotifsPopupBlocked,
      setLanguage: root.dispatch.settings.setLanguage,
      fetchAdsArray: root.dispatch.settings.fetchAdsArray,
    };
  },
}));

vi.mock('@/stores/wallet', () => {
  const setApiKeys = vi.fn().mockResolvedValue(undefined);
  const subscribeOnExchangeRatesApi = vi.fn().mockResolvedValue(undefined);
  const resetNetworkSubscriptions = vi.fn().mockResolvedValue(undefined);
  const resetInternalSubscriptions = vi.fn().mockResolvedValue(undefined);
  const activateNetworkSubscriptions = vi.fn().mockResolvedValue(undefined);
  const notifyOnDeposit = vi.fn().mockResolvedValue(undefined);

  return {
    useWalletStore: () => {
      const root = legacyStoreHolder.current;

      return {
        get address() {
          return root.state.wallet.account.address;
        },
        get assetsToNotifyQueue() {
          return root.state.wallet.account.assetsToNotifyQueue;
        },
        get pendingMstTransactions() {
          return root.state.wallet.transactions.pendingMstTransactions;
        },
        get firstReadyTransaction() {
          return null;
        },
        get isLoggedIn() {
          return Boolean(root.state.wallet.account.isLoggedIn);
        },
        get account() {
          return {
            address: root.state.wallet.account.address,
          };
        },
        get isSignTxDialogVisible() {
          return root.state.wallet.transactions.isSignTxDialogVisible;
        },
        setSoraNetwork: root.commit.wallet.settings.setSoraNetwork,
        setIndexerEndpoint: root.commit.wallet.settings.setIndexerEndpoint,
        setSignTxDialogVisibility: root.commit.wallet.transactions.setSignTxDialogVisibility,
        setApiKeys,
        subscribeOnExchangeRatesApi,
        resetNetworkSubscriptions,
        resetInternalSubscriptions,
        activateNetworkSubscriptions,
        notifyOnDeposit,
      };
    },
    __mocks: {
      setApiKeys,
      subscribeOnExchangeRatesApi,
      resetNetworkSubscriptions,
      resetInternalSubscriptions,
      activateNetworkSubscriptions,
      notifyOnDeposit,
    },
  };
});

vi.mock('@/stores/referrals', () => ({
  useReferralsStore: () => {
    const root = legacyStoreHolder.current;

    return {
      get referrer() {
        return root.state.referrals.referrer;
      },
      get storageReferrer() {
        return root.state.referrals.storageReferrer;
      },
      getReferrer: root.dispatch.referrals.getReferrer,
      resetStorageReferrer: root.commit.referrals.resetStorageReferrer,
      unsubscribeFromInvitedUsers: root.commit.referrals.unsubscribeFromInvitedUsers,
    };
  },
}));

vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => {
    const root = legacyStoreHolder.current;

    return {
      get soraAccountDialogVisibility() {
        return root.state.web3.soraAccountDialogVisibility;
      },
      get selectProviderDialogVisibility() {
        return root.state.web3.selectProviderDialogVisibility;
      },
      get selectNetworkDialogVisibility() {
        return root.state.web3.selectNetworkDialogVisibility;
      },
      get selectSubNodeDialogVisibility() {
        return root.state.web3.selectSubNodeDialogVisibility;
      },
      get subAccountDialogVisibility() {
        return root.state.web3.subAccountDialogVisibility;
      },
      setEvmNetworksApp: root.commit.web3.setEvmNetworksApp,
      setSubNetworkApps: root.commit.web3.setSubNetworkApps,
      setEthBridgeSettings: root.commit.web3.setEthBridgeSettings,
      setSoraAccountDialogVisibility: root.commit.web3.setSoraAccountDialogVisibility,
      setSelectProviderDialogVisibility: root.commit.web3.setSelectProviderDialogVisibility,
      setSelectNetworkDialogVisibility: root.commit.web3.setSelectNetworkDialogVisibility,
      setSelectSubNodeDialogVisibility: root.commit.web3.setSelectSubNodeDialogVisibility,
      setSubAccountDialogVisibility: root.commit.web3.setSubAccountDialogVisibility,
    };
  },
}));

vi.mock('@/stores/router', () => ({
  useRouterStore: () => {
    const root = legacyStoreHolder.current;
    return {
      get isLoading() {
        return root.state.router.loading;
      },
    };
  },
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useLoading', () => {
  const { ref } = require('vue') as typeof import('vue');
  return {
    useLoading: () => ({
      loading: ref(false),
      withLoading: async (task: () => Promise<unknown> | unknown) => task(),
      withApi: async (task: () => Promise<unknown> | unknown) => task(),
    }),
  };
});

vi.mock('@/composables/useTransaction', () => {
  const { ref } = require('vue') as typeof import('vue');
  return {
    useTransaction: () => ({
      loading: ref(false),
      withLoading: async (task: () => Promise<unknown> | unknown) => task(),
      withApi: async (task: () => Promise<unknown> | unknown) => task(),
      handleChangeTransaction: vi.fn(),
    }),
  };
});

vi.mock('@/composables/useNodeNotifications', () => ({
  useNodeNotifications: () => ({
    handleNodeError: vi.fn(),
    handleNodeDisconnect: vi.fn(),
    handleNodeConnect: vi.fn(),
  }),
}));

vi.mock('@/utils/device', () => ({
  getMobileCssClasses: () => [],
}));

vi.mock('@/utils/ipfs', () => ({
  toDwebLink: (value: string) => value,
}));

vi.mock('@/utils/storage', () => ({
  settingsStorage: {
    get: vi.fn(() => null),
    set: vi.fn(),
    remove: vi.fn(),
  },
  calculateStorageUsagePercentage: () => 0,
  clearLocalStorage: vi.fn(),
}));

vi.mock('@/utils/staticAssets', () => ({
  getEnvConfigCandidates: () => ['env.test.json'],
  resolveStaticAssetUrl: (candidate: string) => candidate,
}));

vi.mock('@/utils/switchTheme', () => ({
  detectSystemTheme: vi.fn(),
  removeThemeListeners: vi.fn(),
}));

vi.mock('@/services/realtime', () => {
  const dataPlaneClient = {
    start: vi.fn().mockResolvedValue(true),
    stop: vi.fn().mockResolvedValue(undefined),
    setVisibility: vi.fn().mockResolvedValue(undefined),
    onMetrics: vi.fn(() => () => undefined),
    onStatus: vi.fn(() => () => undefined),
  };

  return {
    getDataPlaneClient: () => dataPlaneClient,
    normalizeRealtimeProfile: (profile: unknown) => profile ?? 'balanced',
    __mocks: {
      dataPlaneClient,
    },
  };
});

vi.mock('@/utils/telegram', () => ({
  tmaSdkService: {
    init: vi.fn(),
    destroy: vi.fn(),
  },
}));

import AppShell from '@/app/shell/AppShell.vue';

const mountApp = async () => {
  const wrapper = shallowMount(AppShell, {
    global: {
      stubs: {
        's-design-system-provider': {
          template: '<div class="design-system-provider-stub"><slot /></div>',
        },
        's-scrollbar': {
          template: '<div class="scrollbar-stub"><slot /></div>',
        },
        'router-view': {
          template: '<div class="router-view-stub"></div>',
        },
      },
    },
  });

  await flushPromises();
  return wrapper;
};

type StoreMocks = {
  state: {
    settings: {
      screenBreakpointClass: BreakpointClass;
      selectNodeDialogVisibility: boolean;
      selectIndexerDialogVisibility: boolean;
      isOrientationWarningVisible: boolean;
      disclaimerVisibility: boolean;
      userDisclaimerApprove: boolean;
      browserNotifPopupVisibility: boolean;
      browserNotifPopupBlockedVisibility: boolean;
      disclaimerVisibility: boolean;
      userDisclaimerApprove: boolean;
    };
    web3: {
      soraAccountDialogVisibility: boolean;
      selectProviderDialogVisibility: boolean;
      selectNetworkDialogVisibility: boolean;
      selectSubNodeDialogVisibility: boolean;
      subAccountDialogVisibility: boolean;
    };
  };
  commit: {
    settings: {
      setDisclaimerDialogVisibility: ReturnType<typeof vi.fn> | undefined;
      setSelectNodeDialogVisibility: ReturnType<typeof vi.fn> | undefined;
      setSelectIndexerDialogVisibility: ReturnType<typeof vi.fn> | undefined;
      setDisclaimerDialogVisibility: ReturnType<typeof vi.fn> | undefined;
    };
    web3: {
      setSoraAccountDialogVisibility: ReturnType<typeof vi.fn> | undefined;
      setSelectProviderDialogVisibility: ReturnType<typeof vi.fn> | undefined;
      setSelectNetworkDialogVisibility: ReturnType<typeof vi.fn> | undefined;
      setSelectSubNodeDialogVisibility: ReturnType<typeof vi.fn> | undefined;
      setSubAccountDialogVisibility: ReturnType<typeof vi.fn> | undefined;
    };
  };
  originalCommit: ReturnType<typeof vi.fn>;
};

type RouterMocks = {
  routeState: {
    fullPath: string;
    name: string;
  };
};

type ApiMocks = {
  get: ReturnType<typeof vi.fn>;
};

type RealtimeMocks = {
  dataPlaneClient: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    setVisibility: ReturnType<typeof vi.fn>;
    onMetrics: ReturnType<typeof vi.fn>;
    onStatus: ReturnType<typeof vi.fn>;
  };
};

let storeMocks: StoreMocks;
let routerMocks: RouterMocks;
let apiMocks: ApiMocks;
let realtimeMocks: RealtimeMocks;

beforeEach(async () => {
  storeMocks = createStoreMocks() as StoreMocks;
  legacyStoreHolder.current = storeMocks;
  routerMocks = (await import('vue-router')).__mocks;
  apiMocks = (await import('@/api')).__mocks;
  realtimeMocks = (await import('@/services/realtime')).__mocks;

  routerMocks.routeState.fullPath = '/bridge';
  routerMocks.routeState.name = 'Bridge';

  apiMocks.get.mockReset().mockResolvedValue({
    data: {
      NETWORK_TYPE: 'Prod',
      POLKASWAP_INDEXER_ENDPOINT: 'https://indexer.example',
    },
  });
  realtimeMocks.dataPlaneClient.start.mockReset().mockResolvedValue(true);
  realtimeMocks.dataPlaneClient.stop.mockReset().mockResolvedValue(undefined);
  realtimeMocks.dataPlaneClient.setVisibility.mockReset().mockResolvedValue(undefined);
  realtimeMocks.dataPlaneClient.onMetrics.mockReset().mockImplementation(() => () => undefined);
  realtimeMocks.dataPlaneClient.onStatus.mockReset().mockImplementation(() => () => undefined);

  storeMocks.state.settings.screenBreakpointClass = BreakpointClass.Mobile;
  storeMocks.state.settings.selectNodeDialogVisibility = false;
  storeMocks.state.settings.selectIndexerDialogVisibility = false;
  storeMocks.state.settings.isOrientationWarningVisible = false;
  storeMocks.state.settings.disclaimerVisibility = false;
  storeMocks.state.settings.userDisclaimerApprove = true;
  storeMocks.state.settings.browserNotifPopupVisibility = false;
  storeMocks.state.settings.browserNotifPopupBlockedVisibility = false;
  storeMocks.state.settings.disclaimerVisibility = true;
  storeMocks.state.settings.userDisclaimerApprove = false;
  storeMocks.state.web3.soraAccountDialogVisibility = false;
  storeMocks.state.web3.selectProviderDialogVisibility = false;
  storeMocks.state.web3.selectNetworkDialogVisibility = false;
  storeMocks.state.web3.selectSubNodeDialogVisibility = false;
  storeMocks.state.web3.subAccountDialogVisibility = false;

  storeMocks.originalCommit.mockReset();
  storeMocks.commit.web3.setSoraAccountDialogVisibility?.mockReset();
  storeMocks.commit.web3.setSelectProviderDialogVisibility?.mockReset();
  storeMocks.commit.web3.setSelectNetworkDialogVisibility?.mockReset();
  storeMocks.commit.web3.setSelectSubNodeDialogVisibility?.mockReset();
  storeMocks.commit.web3.setSubAccountDialogVisibility?.mockReset();
  storeMocks.commit.settings.setDisclaimerDialogVisibility?.mockReset();
  (storeMocks.commit.settings.setSelectNodeDialogVisibility as ReturnType<typeof vi.fn>).mockReset();
  (storeMocks.commit.settings.setSelectIndexerDialogVisibility as ReturnType<typeof vi.fn>).mockReset();
  (storeMocks.commit.settings.setDisclaimerDialogVisibility as ReturnType<typeof vi.fn>).mockReset();

  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  });
});

describe('App.vue dialog teardown wiring', () => {
  it('closes route-scoped dialogs on hash route changes', async () => {
    storeMocks.state.web3.soraAccountDialogVisibility = true;
    storeMocks.state.web3.selectProviderDialogVisibility = true;
    storeMocks.state.web3.selectNetworkDialogVisibility = true;
    storeMocks.state.web3.selectSubNodeDialogVisibility = true;
    storeMocks.state.web3.subAccountDialogVisibility = true;
    storeMocks.state.settings.selectNodeDialogVisibility = true;
    storeMocks.state.settings.selectIndexerDialogVisibility = true;

    const wrapper = await mountApp();

    storeMocks.commit.web3.setSoraAccountDialogVisibility?.mockClear();
    storeMocks.commit.web3.setSelectProviderDialogVisibility?.mockClear();
    storeMocks.commit.web3.setSelectNetworkDialogVisibility?.mockClear();
    storeMocks.commit.web3.setSelectSubNodeDialogVisibility?.mockClear();
    storeMocks.commit.web3.setSubAccountDialogVisibility?.mockClear();
    (storeMocks.commit.settings.setSelectNodeDialogVisibility as ReturnType<typeof vi.fn>).mockClear();
    (storeMocks.commit.settings.setSelectIndexerDialogVisibility as ReturnType<typeof vi.fn>).mockClear();

    routerMocks.routeState.fullPath = '/swap';
    routerMocks.routeState.name = 'Swap';
    await nextTick();

    expect(storeMocks.commit.web3.setSoraAccountDialogVisibility).toHaveBeenCalledWith(false);
    expect(storeMocks.commit.web3.setSelectProviderDialogVisibility).toHaveBeenCalledWith(false);
    expect(storeMocks.commit.web3.setSelectNetworkDialogVisibility).toHaveBeenCalledWith(false);
    expect(storeMocks.commit.web3.setSelectSubNodeDialogVisibility).toHaveBeenCalledWith(false);
    expect(storeMocks.commit.web3.setSubAccountDialogVisibility).toHaveBeenCalledWith(false);
    expect(storeMocks.commit.settings.setSelectNodeDialogVisibility).toHaveBeenCalledWith(false);
    expect(storeMocks.commit.settings.setSelectIndexerDialogVisibility).toHaveBeenCalledWith(false);

    wrapper.unmount();
  });

  it('skips web3 route-scoped teardown when the facade setters are unavailable', async () => {
    storeMocks.state.web3.soraAccountDialogVisibility = true;
    storeMocks.state.web3.selectProviderDialogVisibility = true;
    storeMocks.state.web3.selectNetworkDialogVisibility = true;
    storeMocks.state.web3.selectSubNodeDialogVisibility = true;
    storeMocks.state.web3.subAccountDialogVisibility = true;

    const originalSetSoraAccountDialogVisibility = storeMocks.commit.web3.setSoraAccountDialogVisibility;
    const originalSetSelectProviderDialogVisibility = storeMocks.commit.web3.setSelectProviderDialogVisibility;
    const originalSetSelectNetworkDialogVisibility = storeMocks.commit.web3.setSelectNetworkDialogVisibility;
    const originalSetSelectSubNodeDialogVisibility = storeMocks.commit.web3.setSelectSubNodeDialogVisibility;
    const originalSetSubAccountDialogVisibility = storeMocks.commit.web3.setSubAccountDialogVisibility;

    storeMocks.commit.web3.setSoraAccountDialogVisibility = undefined;
    storeMocks.commit.web3.setSelectProviderDialogVisibility = undefined;
    storeMocks.commit.web3.setSelectNetworkDialogVisibility = undefined;
    storeMocks.commit.web3.setSelectSubNodeDialogVisibility = undefined;
    storeMocks.commit.web3.setSubAccountDialogVisibility = undefined;

    try {
      const wrapper = await mountApp();

      storeMocks.originalCommit.mockClear();

      routerMocks.routeState.fullPath = '/swap';
      routerMocks.routeState.name = 'Swap';
      await nextTick();

      expect(storeMocks.originalCommit).not.toHaveBeenCalled();

      wrapper.unmount();
    } finally {
      storeMocks.commit.web3.setSoraAccountDialogVisibility = originalSetSoraAccountDialogVisibility;
      storeMocks.commit.web3.setSelectProviderDialogVisibility = originalSetSelectProviderDialogVisibility;
      storeMocks.commit.web3.setSelectNetworkDialogVisibility = originalSetSelectNetworkDialogVisibility;
      storeMocks.commit.web3.setSelectSubNodeDialogVisibility = originalSetSelectSubNodeDialogVisibility;
      storeMocks.commit.web3.setSubAccountDialogVisibility = originalSetSubAccountDialogVisibility;
    }
  });

  it('does not close route-scoped dialogs when fullPath is unchanged', async () => {
    storeMocks.state.web3.soraAccountDialogVisibility = true;
    storeMocks.state.web3.selectProviderDialogVisibility = true;
    storeMocks.state.web3.selectNetworkDialogVisibility = true;
    storeMocks.state.web3.selectSubNodeDialogVisibility = true;
    storeMocks.state.web3.subAccountDialogVisibility = true;
    storeMocks.state.settings.selectNodeDialogVisibility = true;
    storeMocks.state.settings.selectIndexerDialogVisibility = true;

    const wrapper = await mountApp();

    storeMocks.commit.web3.setSoraAccountDialogVisibility?.mockClear();
    storeMocks.commit.web3.setSelectProviderDialogVisibility?.mockClear();
    storeMocks.commit.web3.setSelectNetworkDialogVisibility?.mockClear();
    storeMocks.commit.web3.setSelectSubNodeDialogVisibility?.mockClear();
    storeMocks.commit.web3.setSubAccountDialogVisibility?.mockClear();
    (storeMocks.commit.settings.setSelectNodeDialogVisibility as ReturnType<typeof vi.fn>).mockClear();
    (storeMocks.commit.settings.setSelectIndexerDialogVisibility as ReturnType<typeof vi.fn>).mockClear();

    routerMocks.routeState.name = 'Wallet';
    await nextTick();

    expect(storeMocks.commit.web3.setSoraAccountDialogVisibility).not.toHaveBeenCalled();
    expect(storeMocks.commit.web3.setSelectProviderDialogVisibility).not.toHaveBeenCalled();
    expect(storeMocks.commit.web3.setSelectNetworkDialogVisibility).not.toHaveBeenCalled();
    expect(storeMocks.commit.web3.setSelectSubNodeDialogVisibility).not.toHaveBeenCalled();
    expect(storeMocks.commit.web3.setSubAccountDialogVisibility).not.toHaveBeenCalled();
    expect(storeMocks.commit.settings.setSelectNodeDialogVisibility).not.toHaveBeenCalled();
    expect(storeMocks.commit.settings.setSelectIndexerDialogVisibility).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('closes breakpoint-scoped footer dialogs when breakpoint changes', async () => {
    storeMocks.state.settings.selectNodeDialogVisibility = true;
    storeMocks.state.settings.selectIndexerDialogVisibility = true;

    const wrapper = await mountApp();

    (storeMocks.commit.settings.setSelectNodeDialogVisibility as ReturnType<typeof vi.fn>).mockClear();
    (storeMocks.commit.settings.setSelectIndexerDialogVisibility as ReturnType<typeof vi.fn>).mockClear();

    storeMocks.state.settings.screenBreakpointClass = BreakpointClass.Desktop;
    await nextTick();

    expect(storeMocks.commit.settings.setSelectNodeDialogVisibility).toHaveBeenCalledWith(false);
    expect(storeMocks.commit.settings.setSelectIndexerDialogVisibility).toHaveBeenCalledWith(false);

    wrapper.unmount();
  });

  it('does not close breakpoint-scoped footer dialogs when breakpoint class is unchanged', async () => {
    storeMocks.state.settings.selectNodeDialogVisibility = true;
    storeMocks.state.settings.selectIndexerDialogVisibility = true;

    const wrapper = await mountApp();

    (storeMocks.commit.settings.setSelectNodeDialogVisibility as ReturnType<typeof vi.fn>).mockClear();
    (storeMocks.commit.settings.setSelectIndexerDialogVisibility as ReturnType<typeof vi.fn>).mockClear();

    storeMocks.state.settings.screenBreakpointClass = BreakpointClass.Mobile;
    await nextTick();

    expect(storeMocks.commit.settings.setSelectNodeDialogVisibility).not.toHaveBeenCalled();
    expect(storeMocks.commit.settings.setSelectIndexerDialogVisibility).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('skips settings dialog teardown when the facade setters are unavailable', async () => {
    storeMocks.state.settings.selectNodeDialogVisibility = true;
    storeMocks.state.settings.selectIndexerDialogVisibility = true;

    const originalSetNodeDialogVisibility = storeMocks.commit.settings.setSelectNodeDialogVisibility;
    const originalSetIndexerDialogVisibility = storeMocks.commit.settings.setSelectIndexerDialogVisibility;
    storeMocks.commit.settings.setSelectNodeDialogVisibility = undefined;
    storeMocks.commit.settings.setSelectIndexerDialogVisibility = undefined;

    try {
      const wrapper = await mountApp();

      storeMocks.originalCommit.mockClear();

      routerMocks.routeState.fullPath = '/swap';
      routerMocks.routeState.name = 'Swap';
      await nextTick();

      expect(storeMocks.originalCommit).not.toHaveBeenCalled();

      wrapper.unmount();
    } finally {
      storeMocks.commit.settings.setSelectNodeDialogVisibility = originalSetNodeDialogVisibility;
      storeMocks.commit.settings.setSelectIndexerDialogVisibility = originalSetIndexerDialogVisibility;
    }
  });

  it('does not sync visibility to worker when wsWorkerDataPlane flag is disabled', async () => {
    const wrapper = await mountApp();

    realtimeMocks.dataPlaneClient.setVisibility.mockClear();

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await nextTick();

    expect(realtimeMocks.dataPlaneClient.setVisibility).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('syncs visibility when wsWorkerDataPlane flag is enabled', async () => {
    apiMocks.get.mockResolvedValueOnce({
      data: {
        NETWORK_TYPE: 'Prod',
        POLKASWAP_INDEXER_ENDPOINT: 'https://indexer.example',
        FEATURE_FLAGS: {
          wsWorkerDataPlane: true,
        },
      },
    });

    const wrapper = await mountApp();

    expect(realtimeMocks.dataPlaneClient.start).toHaveBeenCalledTimes(1);
    realtimeMocks.dataPlaneClient.setVisibility.mockClear();

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await nextTick();

    expect(realtimeMocks.dataPlaneClient.setVisibility).toHaveBeenCalledWith(false);

    wrapper.unmount();
  });
});
