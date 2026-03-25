import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PageNames } from '@/consts';

vi.mock('@sora-substrate/sdk', async () => {
  const actual = await vi.importActual<typeof import('@sora-substrate/sdk')>('@sora-substrate/sdk');
  const buckets = new Map<string, Record<string, string>>();

  class StorageStub {
    private namespace: string;

    constructor(namespace = 'default') {
      this.namespace = namespace;
      if (!buckets.has(namespace)) {
        buckets.set(namespace, {});
      }
    }

    get = vi.fn((key: string) => buckets.get(this.namespace)?.[key] ?? null);
    set = vi.fn((key: string, value: string) => {
      const bucket = buckets.get(this.namespace);
      if (bucket) bucket[key] = value;
    });
    remove = vi.fn((key: string) => {
      const bucket = buckets.get(this.namespace);
      if (bucket && key in bucket) delete bucket[key];
    });
  }

  buckets.set('default', { filters: JSON.stringify({ option: null, verifiedOnly: false, zeroBalance: false }) });
  buckets.set('wallet', { filters: JSON.stringify({ option: null, verifiedOnly: false, zeroBalance: false }) });
  buckets.set('dexSettings', {});
  buckets.set('runtime', {});

  return {
    __esModule: true,
    ...actual,
    Storage: StorageStub,
  };
});

const pushMock = vi.fn();
const routeMock = { name: PageNames.ExploreTokens } as { name: string };

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => ({
    push: pushMock,
  }),
}));

const storageMock = vi.hoisted(() => {
  const createStub = (overrides: Record<string, string | null> = {}) => ({
    get: vi.fn((key: string) => (key in overrides ? overrides[key] : null)),
    set: vi.fn(),
    remove: vi.fn(),
  });

  const filtersPayload = JSON.stringify({ option: null, verifiedOnly: false, zeroBalance: false });

  return {
    wallet: createStub({ filters: filtersPayload }),
    settings: createStub({ filters: filtersPayload }),
    runtime: createStub(),
    layouts: createStub(),
  };
});

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    storage: storageMock.wallet,
    settingsStorage: storageMock.settings,
  });
});

vi.mock('@/lib/soraneo-wallet/src/util/storage', () => ({
  __esModule: true,
  storage: storageMock.wallet,
  settingsStorage: storageMock.settings,
  runtimeStorage: storageMock.runtime,
}));

vi.mock('@/utils/storage', () => ({
  __esModule: true,
  default: storageMock.wallet,
  storage: storageMock.wallet,
  settingsStorage: storageMock.settings,
  runtimeStorage: storageMock.runtime,
  layoutsStorage: storageMock.layouts,
  set: storageMock.wallet.set,
  get: storageMock.wallet.get,
  calculateStorageUsagePercentage: vi.fn(() => 0),
  clearLocalStorage: vi.fn(),
}));

const translationMock = vi.hoisted(() => ({
  t: vi.fn((key: string) => key),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => translationMock,
}));

const settingsStoreMock = vi.hoisted(() => ({
  screenBreakpointClass: 'Desktop',
  menuCollapsed: false,
}));

const walletStoreMock = vi.hoisted(() => ({
  isLoggedIn: true,
}));

vi.mock('@/stores/settings', () => ({
  __esModule: true,
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/stores/wallet', () => ({
  __esModule: true,
  useWalletStore: () => walletStoreMock,
}));

let ExploreContainer: typeof import('@/views/Explore/Container.vue').default;

const mountComponent = async (routeName = PageNames.ExploreTokens, attrs: Record<string, unknown> = {}) => {
  routeMock.name = routeName;

  if (!ExploreContainer) {
    ({ default: ExploreContainer } = await import('@/views/Explore/Container.vue'));
  }

  const wrapper = mount(ExploreContainer, {
    props: {
      parentLoading: false,
    },
    attrs,
    global: {
      stubs: {
        ResponsiveTabs: {
          props: ['tabs', 'modelValue'],
          emits: ['update:modelValue'],
          template:
            '<button class="tabs-stub" @click="$emit(\'update:modelValue\', tabs[1]?.name || tabs[0]?.name)">{{ tabs.length }} tabs</button>',
        },
        SearchInput: {
          props: ['modelValue'],
          emits: ['update:modelValue', 'clear'],
          template:
            '<input class="search-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        's-switch': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template:
            '<input class="switch-stub" type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
        },
        'router-view': {
          emits: ['forwarded'],
          template: '<button class="router-view-stub" @click="$emit(\'forwarded\')">route</button>',
        },
      },
      directives: {
        loading: () => undefined,
      },
    },
  });

  await flushPromises();
  return wrapper;
};

describe('ExploreContainer', () => {
  beforeEach(() => {
    pushMock.mockClear();
    storageMock.wallet.get.mockReset();
    storageMock.wallet.set.mockReset();
    storageMock.wallet.get.mockReturnValue(JSON.stringify(false));
    settingsStoreMock.screenBreakpointClass = 'Desktop';
    settingsStoreMock.menuCollapsed = false;
    walletStoreMock.isLoggedIn = true;
  });

  it('saves account-item switcher preference to storage', async () => {
    const wrapper = await mountComponent(PageNames.ExploreFarming);

    (wrapper.vm as any).isAccountItemsOnly = true;

    expect(storageMock.wallet.set).toHaveBeenCalledWith('exploreAccountItems', true);
  });

  it('navigates to selected tab', async () => {
    const wrapper = await mountComponent(PageNames.ExploreTokens);
    await flushPromises();

    await wrapper.find('.tabs-stub').trigger('click');

    expect(pushMock).toHaveBeenCalledWith({ name: PageNames.ExploreFarming });
  });

  it('forwards route-view listeners through attrs', async () => {
    const onForwarded = vi.fn();
    const wrapper = await mountComponent(PageNames.ExploreTokens, { onForwarded });

    await wrapper.get('.router-view-stub').trigger('click');

    expect(onForwarded).toHaveBeenCalledTimes(1);
  });
});
