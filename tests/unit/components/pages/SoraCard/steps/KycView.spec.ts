import { flushPromises, mount } from '@vue/test-utils';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { setLegacyStoreOverride } from '@/utils/legacy-store';

import KycView from '@/components/pages/SoraCard/steps/KycView.vue';
import { CardUIViews } from '@/types/card';

type CameraPermission = PermissionState | '' | null;
type HandlerMap = Record<string, (...args: unknown[]) => void>;

declare global {
  interface Navigator {
    mediaDevices: {
      enumerateDevices: () => Promise<MediaDeviceInfo[]>;
      getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
    };
    permissions: {
      query: (descriptor: PermissionDescriptor) => Promise<{ state: PermissionState }>;
    };
  }
  interface Window {
    Paywings?: {
      WebKyc: {
        create: (args: unknown) => { on: (event: string, handler: (...args: unknown[]) => void) => any };
      };
    };
  }
}

const storeState = vi.hoisted(() => ({
  wallet: {
    settings: { soraNetwork: 'test' as string | null },
    account: { source: 'fearless-wallet' },
  },
  soraCard: {
    referenceNumber: null as string | null,
  },
}));

const storeCommit = vi.hoisted(() => ({
  soraCard: {
    setReferenceNumber: vi.fn((value: string | null) => {
      storeState.soraCard.referenceNumber = value;
    }),
  },
}));

vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    state: storeState,
    getters: { soraCard: {} },
    commit: storeCommit,
  },
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: { value: 'en' },
  }),
}));

let walletModule: any;
let walletUtil: any;
let utilsCardModule: any;
let utilsModule: any;
let notificationModule: any;

const scriptLoaderLoadSpy = vi.fn();
const scriptLoaderUnloadSpy = vi.fn();
let checkDevicesAvailabilitySpy: ReturnType<typeof vi.spyOn>;
let checkCameraPermissionSpy: ReturnType<typeof vi.spyOn>;
let soraCardSpy: ReturnType<typeof vi.spyOn>;
let getUpdatedJwtPairSpy: ReturnType<typeof vi.spyOn>;
let waitForSoraNetworkSpy: ReturnType<typeof vi.spyOn>;
let useNotificationSpy: ReturnType<typeof vi.spyOn>;

const showAppNotificationSpy = vi.fn();

const enumerateDevicesMock = vi.fn(async () => [{ kind: 'videoinput' } as MediaDeviceInfo]);
const getUserMediaMock = vi.fn(async () => ({}) as MediaStream);
const permissionsQueryMock = vi.fn(async () => ({ state: 'prompt' as PermissionState }));

let paywingsHandlers: HandlerMap;
let originalScriptLoaderLoad: any;
let originalScriptLoaderUnload: any;

const createPaywingsChain = () => ({
  on(event: string, handler: (...args: unknown[]) => void) {
    paywingsHandlers[event] = handler;
    return this;
  },
});

const withWindow = () =>
  globalThis as typeof globalThis & {
    window?: Record<string, any>;
    Paywings?: unknown;
  };

const installPaywingsMock = () => {
  const scope = withWindow();
  const paywingsMock = {
    WebKyc: {
      create: vi.fn(() => createPaywingsChain()),
    },
  };

  scope.Paywings = paywingsMock as typeof scope.Paywings;
  scope.window = scope.window ?? ({} as typeof scope.window);
  scope.window.Paywings = paywingsMock;
};

const uninstallPaywingsMock = () => {
  const scope = withWindow();
  if ('Paywings' in scope) {
    delete (scope as Record<string, unknown>).Paywings;
  }
  if (scope.window && 'Paywings' in scope.window) {
    delete scope.window.Paywings;
  }
};

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  const scriptLoader = {
    load: vi.fn(),
    unload: vi.fn(),
  };
  return createWalletMock({
    WALLET_CONSTS: {
      AppWallet: {
        FearlessWallet: 'fearless-wallet',
      },
    },
    ScriptLoader: scriptLoader,
  });
});

const walletModulePromise = import('@wallet');

vi.mock('@wallet/src/util', () => ({
  checkDevicesAvailability: vi.fn(),
  checkCameraPermission: vi.fn(),
}));

beforeAll(async () => {
  walletModule = await walletModulePromise;
  walletUtil = await import('@wallet/src/util');
  utilsCardModule = await import('@/utils/card');
  utilsModule = await import('@/utils');
  notificationModule = await import('@/composables/useNotification');

  originalScriptLoaderLoad = walletModule.ScriptLoader.load;
  originalScriptLoaderUnload = walletModule.ScriptLoader.unload;
  checkDevicesAvailabilitySpy = walletUtil.checkDevicesAvailability as ReturnType<typeof vi.fn>;
  checkCameraPermissionSpy = walletUtil.checkCameraPermission as ReturnType<typeof vi.fn>;

  (global.navigator as unknown as Navigator).mediaDevices = {
    enumerateDevices: enumerateDevicesMock,
    getUserMedia: getUserMediaMock,
  };
  (global.navigator as unknown as Navigator).permissions = {
    query: permissionsQueryMock,
  };
});

beforeEach(() => {
  setLegacyStoreOverride({
    state: storeState,
    getters: { soraCard: {} },
    commit: storeCommit,
    dispatch: {},
  } as any);
  paywingsHandlers = {};
  localStorage.clear();

  scriptLoaderLoadSpy.mockReset().mockResolvedValue(undefined as never);
  scriptLoaderUnloadSpy.mockReset().mockResolvedValue(undefined as never);
  walletModule.ScriptLoader.load = scriptLoaderLoadSpy;
  walletModule.ScriptLoader.unload = scriptLoaderUnloadSpy;
  checkDevicesAvailabilitySpy.mockReset().mockResolvedValue(true);
  checkCameraPermissionSpy.mockReset().mockResolvedValue('prompt');
  soraCardSpy = vi.spyOn(utilsCardModule, 'soraCard').mockImplementation(() => ({
    kycService: {
      sdkURL: 'https://kyc.test/script.js',
      username: 'user',
      pass: 'pass',
      env: 'test',
      unifiedApiKey: 'api-key',
    },
    soraProxy: {
      referenceNumberEndpoint: 'https://proxy.example/reference-number',
    },
  }));
  getUpdatedJwtPairSpy = vi.spyOn(utilsCardModule, 'getUpdatedJwtPair').mockResolvedValue(null);
  waitForSoraNetworkSpy = vi.spyOn(utilsModule, 'waitForSoraNetworkFromEnv').mockResolvedValue('test');
  useNotificationSpy = vi.spyOn(notificationModule, 'useNotification').mockReturnValue({
    showAppNotification: showAppNotificationSpy,
  });
  showAppNotificationSpy.mockReset();

  storeState.soraCard.referenceNumber = null;
  storeCommit.soraCard.setReferenceNumber.mockClear();

  enumerateDevicesMock.mockClear();
  getUserMediaMock.mockClear();
  permissionsQueryMock.mockReset().mockResolvedValue({ state: 'prompt' as PermissionState });

  installPaywingsMock();

  global.fetch = vi.fn(async () => ({
    json: async () => ({ ReferenceNumber: 'ref-123' }),
  })) as unknown as typeof fetch;
});

afterEach(() => {
  uninstallPaywingsMock();
  (global.fetch as unknown) = undefined;
  walletModule.ScriptLoader.load = originalScriptLoaderLoad;
  walletModule.ScriptLoader.unload = originalScriptLoaderUnload;
  soraCardSpy.mockRestore();
  getUpdatedJwtPairSpy.mockRestore();
  waitForSoraNetworkSpy.mockRestore();
  useNotificationSpy.mockRestore();
});

describe('KycView.vue', () => {
  it('computes camera button text based on permission state', async () => {
    permissionsQueryMock.mockResolvedValueOnce({ state: 'denied' });

    const wrapper = mount(KycView, {
      global: {
        stubs: {
          's-button': { template: '<button><slot /></button>' },
          's-scrollbar': { template: '<div><slot /></div>' },
        },
        directives: {
          loading: () => undefined,
        },
      },
    });

    await flushPromises();

    const instance = wrapper.vm as unknown as { btnCameraText: string };
    expect(instance.btnCameraText).toBe('browserPermission.btnGoToSettings');

    permissionsQueryMock.mockResolvedValueOnce({ state: 'granted' });
    const wrapperGranted = mount(KycView, {
      global: {
        stubs: {
          's-button': { template: '<button><slot /></button>' },
          's-scrollbar': { template: '<div><slot /></div>' },
        },
        directives: {
          loading: () => undefined,
        },
      },
    });

    await flushPromises();

    const instanceGranted = wrapperGranted.vm as unknown as { btnCameraText: string };
    expect(instanceGranted.btnCameraText).toBe('continueText');
  });

  it('requests camera access and emits success after KYC completes', async () => {
    const originalQuerySelector = document.querySelector.bind(document);
    const querySelectorSpy = vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
      if (selector === 'link[data-soracard-css="https://kyc-test.soracard.com/web/v2/webkyc.css"]') {
        return { sheet: {} } as unknown as Element;
      }

      return originalQuerySelector(selector);
    });

    const wrapper = mount(KycView, {
      global: {
        stubs: {
          's-button': { template: '<button><slot /></button>' },
          's-scrollbar': { template: '<div><slot /></div>' },
        },
        directives: {
          loading: () => undefined,
        },
      },
    });
    const instance = wrapper.vm as unknown as {
      requestCameraAccess: () => Promise<void>;
    };

    localStorage.setItem('PW-refresh-token', 'refresh-token');

    await instance.requestCameraAccess();

    const loadPromise = scriptLoaderLoadSpy.mock.results.at(-1)?.value;
    if (loadPromise) {
      await loadPromise;
    }

    await flushPromises();

    for (let attempt = 0; attempt < 10 && typeof paywingsHandlers['Success'] !== 'function'; attempt += 1) {
      await flushPromises();
    }

    expect(typeof paywingsHandlers['Success']).toBe('function');

    await paywingsHandlers['Success']?.({});
    await flushPromises();

    expect(checkDevicesAvailabilitySpy).toHaveBeenCalledTimes(1);
    expect(getUserMediaMock).toHaveBeenCalledWith({ video: true });
    expect(scriptLoaderLoadSpy).toHaveBeenCalledWith('https://kyc.test/script.js');
    expect(showAppNotificationSpy).not.toHaveBeenCalled();
    expect(getUpdatedJwtPairSpy).toHaveBeenCalledTimes(1);

    const emits = wrapper.emitted('confirm');
    expect(emits).toBeTruthy();
    expect(emits?.[0]?.[0]).toBe(CardUIViews.KycResult);

    querySelectorSpy.mockRestore();
    wrapper.unmount();
  });

  it('does not refresh JWT pair when refresh token is missing', async () => {
    const wrapper = mount(KycView, {
      global: {
        stubs: {
          's-button': { template: '<button><slot /></button>' },
          's-scrollbar': { template: '<div><slot /></div>' },
        },
        directives: {
          loading: () => undefined,
        },
      },
    });

    const instance = wrapper.vm as unknown as {
      requestCameraAccess: () => Promise<void>;
    };

    await instance.requestCameraAccess();

    const loadPromise = scriptLoaderLoadSpy.mock.results.at(-1)?.value;
    if (loadPromise) {
      await loadPromise;
    }

    await flushPromises();

    expect(getUpdatedJwtPairSpy).not.toHaveBeenCalled();

    wrapper.unmount();
  });
});
