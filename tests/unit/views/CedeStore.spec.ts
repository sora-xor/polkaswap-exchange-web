import { flushPromises, mount } from '@vue/test-utils';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Theme } from '@/consts/theme';

vi.mock('@sora-substrate/sdk', async () => {
  const actual = await vi.importActual<typeof import('@sora-substrate/sdk')>('@sora-substrate/sdk');
  const storageState = new Map<string, Record<string, string>>();

  class StorageStub {
    private namespace: string;

    constructor(namespace = 'default') {
      this.namespace = namespace;
      if (!storageState.has(this.namespace)) {
        storageState.set(this.namespace, {});
      }
    }

    get = vi.fn((key: string) => storageState.get(this.namespace)?.[key] ?? null);
    set = vi.fn((key: string, value: string) => {
      const bucket = storageState.get(this.namespace);
      if (bucket) {
        bucket[key] = value;
      }
    });
    remove = vi.fn((key: string) => {
      const bucket = storageState.get(this.namespace);
      if (bucket && key in bucket) {
        delete bucket[key];
      }
    });
  }

  const defaultFilters = JSON.stringify({ option: null, verifiedOnly: false, zeroBalance: false });

  storageState.set('default', { filters: defaultFilters });
  storageState.set('wallet', { filters: defaultFilters });
  storageState.set('dexSettings', {});
  storageState.set('runtime', {});

  return {
    ...actual,
    Storage: StorageStub,
  };
});

const renderSendWidgetMock = vi.fn();

vi.mock('@cedelabs/widgets-universal', () => ({
  renderSendWidget: renderSendWidgetMock,
}));

const walletStorageStub = vi.hoisted(() => ({
  get: vi.fn((key: string) =>
    key === 'filters' ? JSON.stringify({ option: null, verifiedOnly: false, zeroBalance: false }) : null
  ),
  set: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    storage: walletStorageStub,
    settingsStorage: walletStorageStub,
  });
});

vi.mock('@/lib/soraneo-wallet/src/util/storage', () => ({
  __esModule: true,
  storage: walletStorageStub,
  runtimeStorage: walletStorageStub,
  settingsStorage: walletStorageStub,
}));

vi.mock('@/stores/wallet', () => ({
  __esModule: true,
  useWalletStore: () => ({
    address: 'cn123',
  }),
}));

vi.mock('@/stores/settings', () => ({
  __esModule: true,
  useSettingsStore: () => ({
    libraryTheme: Theme.LIGHT,
  }),
}));

vi.mock('@/utils/storage', () => ({
  __esModule: true,
  default: walletStorageStub,
  storage: walletStorageStub,
  settingsStorage: walletStorageStub,
  runtimeStorage: walletStorageStub,
  layoutsStorage: walletStorageStub,
  calculateStorageUsagePercentage: vi.fn(() => 0),
  clearLocalStorage: vi.fn(),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    TranslationConsts: {
      CedeStore: 'Cede Store',
    },
  }),
}));

let CedeStoreView: typeof import('@/views/CedeStore.vue').default;
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

const mountComponent = async () => {
  if (!CedeStoreView) {
    ({ default: CedeStoreView } = await import('@/views/CedeStore.vue'));
  }

  return mount(CedeStoreView, {
    props: {
      parentLoading: false,
    },
    global: {
      stubs: {
        'generic-page-header': {
          template: '<header class="generic-header"><slot name="title" /></header>',
        },
      },
      directives: {
        loading: () => undefined,
      },
    },
  });
};

describe('CedeStore view', () => {
  beforeEach(() => {
    renderSendWidgetMock.mockClear();
  });

  it('renders header title using translation const', async () => {
    const wrapper = await mountComponent();

    expect(wrapper.find('.generic-header').text()).toBe('Cede Store');
  });

  it('initializes Cede widget with wallet address and theme defaults', async () => {
    await mountComponent();
    await flushPromises();

    expect(renderSendWidgetMock).toHaveBeenCalledWith('#cede-widget', {
      config: {
        tokenSymbol: 'XOR',
        network: 'sora',
        address: 'cn123',
        lockNetwork: true,
      },
      theme: expect.objectContaining({
        mode: Theme.LIGHT,
        logoTheme: Theme.LIGHT,
      }),
    });
  });
});

afterAll(() => {
  warnSpy.mockRestore();
});
