import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sora-substrate/sdk', async () => {
  const actual = await vi.importActual<typeof import('@sora-substrate/sdk')>('@sora-substrate/sdk');
  class StorageStub {
    get = vi.fn();
    set = vi.fn();
    remove = vi.fn();
  }

  return {
    ...actual,
    Storage: StorageStub,
  };
});

const copyToClipboardMock = vi.fn();
vi.mock('@/utils', () => ({
  __esModule: true,
  copyToClipboard: copyToClipboardMock,
}));

const clearPayWingsKeysFromLocalStorageMock = vi.fn();
vi.mock('@/utils/card', () => ({
  __esModule: true,
  clearPayWingsKeysFromLocalStorage: clearPayWingsKeysFromLocalStorageMock,
}));

const hiddenValue = '***';

vi.mock('@wallet', () => ({
  __esModule: true,
  components: {
    FormattedAmount: defineComponent({
      name: 'FormattedAmountStub',
      props: {
        value: {
          type: [String, Number],
          default: '',
        },
      },
      template: '<div class="formatted-amount-stub">{{ value }}</div>',
    }),
  },
  WALLET_CONSTS: {
    HiddenValue: hiddenValue,
  },
}));

const storeState = vi.hoisted(() => ({
  soraCard: {
    userInfo: {
      iban: 'DE0011223344',
      availableBalance: 12345,
    },
  },
  wallet: {
    settings: {
      shouldBalanceBeHidden: false,
    },
  },
}));

vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    state: storeState,
  },
}));

const storageStubs = vi.hoisted(() => {
  const make = () => ({
    get: vi.fn(() => null),
    set: vi.fn(),
    remove: vi.fn(),
  });

  const defaultStorage = make();
  defaultStorage.get = vi.fn((key: string) =>
    key === 'filters' ? JSON.stringify({ option: null, verifiedOnly: false, zeroBalance: false }) : null
  );

  return {
    defaultStorage,
    settingsStorage: make(),
    runtimeStorage: make(),
    layoutsStorage: make(),
  };
});

vi.mock('@/utils/storage', () => ({
  __esModule: true,
  default: storageStubs.defaultStorage,
  storage: storageStubs.defaultStorage,
  settingsStorage: storageStubs.settingsStorage,
  runtimeStorage: storageStubs.runtimeStorage,
  layoutsStorage: storageStubs.layoutsStorage,
  calculateStorageUsagePercentage: vi.fn(() => 0),
  clearLocalStorage: vi.fn(),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => (params?.email ? `${key}:${params.email}` : key),
  }),
}));

let Dashboard: typeof import('@/components/pages/SoraCard/Dashboard/Dashboard.vue').default;

const mountDashboard = async () => {
  if (!Dashboard) {
    ({ default: Dashboard } = await import('@/components/pages/SoraCard/Dashboard/Dashboard.vue'));
  }

  const wrapper = mount(Dashboard, {
    global: {
      stubs: {
        's-image': { template: '<div class="s-image-stub"><slot /></div>' },
        's-button': { template: '<button class="s-button-stub" @click="$emit(\'click\')"><slot /></button>' },
        's-icon': { template: '<i class="s-icon-stub"><slot /></i>' },
        's-input': { props: ['value'], template: '<div class="s-input-stub">{{ value }}</div>' },
      },
      directives: {
        loading: () => undefined,
        button: () => undefined,
      },
    },
  });

  await wrapper.vm.$nextTick();
  return wrapper;
};

describe('SoraCard Dashboard', () => {
  beforeEach(() => {
    copyToClipboardMock.mockClear();
    clearPayWingsKeysFromLocalStorageMock.mockClear();
    storeState.wallet.settings.shouldBalanceBeHidden = false;
    storeState.soraCard.userInfo.iban = 'DE0011223344';
  });

  it('obscures IBAN when balance hiding enabled', async () => {
    storeState.wallet.settings.shouldBalanceBeHidden = true;

    const wrapper = (await mountDashboard()) as VueWrapper<any>;

    expect(wrapper.find('.s-input-stub').text()).toBe(hiddenValue);
  });

  it('copies IBAN and logs out when actions triggered', async () => {
    const wrapper = (await mountDashboard()) as VueWrapper<any>;

    await wrapper.find('.sora-card-hub-info-iban-copy').trigger('click');
    expect(copyToClipboardMock).toHaveBeenCalledWith('DE0011223344');

    await wrapper.find('.sora-card-hub-logout').trigger('click');
    expect(clearPayWingsKeysFromLocalStorageMock).toHaveBeenCalledWith(true);
    expect(wrapper.emitted('logout')).toBeTruthy();
  });
});
