import { flushPromises, shallowMount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BreakpointClass } from '@/consts/layout';

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

vi.mock('@wallet', () => {
  const { defineComponent, h } = require('vue') as typeof import('vue');
  const WalletStub = defineComponent({
    name: 'WalletComponentStub',
    setup(_, { slots }) {
      return () => h('div', { class: 'wallet-component-stub' }, slots.default?.());
    },
  });

  return {
    api: {},
    connection: {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    },
    components: {
      NotificationEnablingPage: WalletStub,
      ConfirmDialog: WalletStub,
    },
    settingsStorage: {
      get: vi.fn(() => true),
    },
    WALLET_CONSTS: {
      TranslationConsts: {
        Polkaswap: 'Polkaswap',
      },
      SoraNetwork: {
        Prod: 'Prod',
      },
      IndexerType: {
        SUBQUERY: 'subquery',
        SUBSQUID: 'subsquid',
      },
    },
    AlertsApiService: {
      baseRoute: '',
    },
    initWallet: vi.fn().mockResolvedValue(undefined),
    waitForCore: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/api', () => {
  const get = vi.fn().mockResolvedValue({
    data: {
      NETWORK_TYPE: 'Prod',
      SUBQUERY_ENDPOINT: 'https://indexer.example',
    },
  });

  return {
    __esModule: true,
    default: {
      get,
    },
    updateBaseUrl: vi.fn(),
    getFullBaseUrl: vi.fn(() => 'http://localhost/#/'),
  };
});

vi.mock('@/store', () => {
  const { reactive } = require('vue') as typeof import('vue');

  const state = reactive({
    settings: {
      screenBreakpointClass: BreakpointClass.Mobile,
      appConnection: {
        nodeList: ['wss://node.example'],
        setDefaultNodes: vi.fn(),
        setNetworkChainGenesisHash: vi.fn(),
      },
      browserNotifPopupVisibility: false,
      browserNotifPopupBlockedVisibility: false,
      isThemePreference: false,
      isOrientationWarningVisible: false,
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

  const originalCommit = vi.fn();

  return {
    __esModule: true,
    default: {
      state,
      getters: {
        get libraryTheme() {
          return 'light';
        },
        get libraryDesignSystem() {
          return 'default';
        },
        settings: {
          get nodeIsConnected() {
            return true;
          },
        },
        wallet: {
          transactions: {
            get firstReadyTx() {
              return null;
            },
          },
          account: {
            get isLoggedIn() {
              return Boolean(state.wallet.account.isLoggedIn);
            },
            get account() {
              return {
                address: state.wallet.account.address,
              };
            },
          },
        },
      },
      commit,
      dispatch,
      original: {
        commit: originalCommit,
      },
    },
    __mocks: {
      state,
      commit,
      dispatch,
      originalCommit,
    },
  };
});

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    disclaimerVisibility: false,
  }),
}));

vi.mock('@/stores/wallet', () => {
  const walletStore = {
    setApiKeys: vi.fn().mockResolvedValue(undefined),
    subscribeOnExchangeRatesApi: vi.fn().mockResolvedValue(undefined),
    resetNetworkSubscriptions: vi.fn().mockResolvedValue(undefined),
    resetInternalSubscriptions: vi.fn().mockResolvedValue(undefined),
    activateNetworkSubscriptions: vi.fn().mockResolvedValue(undefined),
    notifyOnDeposit: vi.fn().mockResolvedValue(undefined),
  };

  return {
    useWalletStore: () => walletStore,
    __mocks: walletStore,
  };
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

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

vi.mock('@/utils', () => ({
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

vi.mock('@/utils/telegram', () => ({
  tmaSdkService: {
    init: vi.fn(),
    destroy: vi.fn(),
  },
}));

import App from '@/App.vue';

const mountApp = async () => {
  const wrapper = shallowMount(App, {
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
      browserNotifPopupVisibility: boolean;
      browserNotifPopupBlockedVisibility: boolean;
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
      setSelectNodeDialogVisibility: ReturnType<typeof vi.fn> | undefined;
      setSelectIndexerDialogVisibility: ReturnType<typeof vi.fn> | undefined;
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

let storeMocks: StoreMocks;
let routerMocks: RouterMocks;

beforeEach(async () => {
  storeMocks = (await import('@/store')).__mocks;
  routerMocks = (await import('vue-router')).__mocks;

  routerMocks.routeState.fullPath = '/bridge';
  routerMocks.routeState.name = 'Bridge';

  storeMocks.state.settings.screenBreakpointClass = BreakpointClass.Mobile;
  storeMocks.state.settings.selectNodeDialogVisibility = false;
  storeMocks.state.settings.selectIndexerDialogVisibility = false;
  storeMocks.state.settings.isOrientationWarningVisible = false;
  storeMocks.state.settings.browserNotifPopupVisibility = false;
  storeMocks.state.settings.browserNotifPopupBlockedVisibility = false;
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
  (storeMocks.commit.settings.setSelectNodeDialogVisibility as ReturnType<typeof vi.fn>).mockReset();
  (storeMocks.commit.settings.setSelectIndexerDialogVisibility as ReturnType<typeof vi.fn>).mockReset();
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

  it('falls back to legacy commit names when web3 route teardown mutations are unavailable', async () => {
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

      expect(storeMocks.originalCommit).toHaveBeenCalledWith('web3/setSoraAccountDialogVisibility', false);
      expect(storeMocks.originalCommit).toHaveBeenCalledWith('web3/setSelectProviderDialogVisibility', false);
      expect(storeMocks.originalCommit).toHaveBeenCalledWith('web3/setSelectNetworkDialogVisibility', false);
      expect(storeMocks.originalCommit).toHaveBeenCalledWith('web3/setSelectSubNodeDialogVisibility', false);
      expect(storeMocks.originalCommit).toHaveBeenCalledWith('web3/setSubAccountDialogVisibility', false);

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

  it('falls back to legacy commit names when settings mutations are unavailable', async () => {
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

      expect(storeMocks.originalCommit).toHaveBeenCalledWith('settings/setSelectNodeDialogVisibility', false);
      expect(storeMocks.originalCommit).toHaveBeenCalledWith('settings/setSelectIndexerDialogVisibility', false);

      wrapper.unmount();
    } finally {
      storeMocks.commit.settings.setSelectNodeDialogVisibility = originalSetNodeDialogVisibility;
      storeMocks.commit.settings.setSelectIndexerDialogVisibility = originalSetIndexerDialogVisibility;
    }
  });
});
