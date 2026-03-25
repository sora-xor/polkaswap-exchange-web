import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import AssetOwnerDetails from '@/modules/dashboard/views/AssetOwnerDetails.vue';
import type { OwnedAsset } from '@/modules/dashboard/types';

vi.mock('@/components/shared/Widget/SupplyChart.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: { template: '<div />' },
}));

vi.mock('@/components/shared/Widget/PriceChartWidget.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: { template: '<div />' },
}));
const balanceSubscribe = vi.fn((callback: (value: { transferable: string }) => void) => {
  callback({ transferable: '100' });
  return { unsubscribe: vi.fn() };
});
const supplySubscribe = vi.fn((callback: (value: { toString: () => string }) => void) => {
  callback({ toString: () => '200' });
  return { unsubscribe: vi.fn() };
});

const assetsRef = ref<OwnedAsset[]>([]);
const loggedInRef = ref(true);
const screenBreakpointClassRef = ref('desktop');
const startSubscriptionHandlers: Array<(() => Promise<void> | void) | undefined> = [];
const resetSubscriptionHandlers: Array<(() => Promise<void> | void) | undefined> = [];
const updateSubscriptionsMock = vi.fn(async () => {
  for (const handler of startSubscriptionHandlers) {
    await handler?.();
  }
});
const resetSubscriptionsMock = vi.fn(async () => {
  for (const handler of resetSubscriptionHandlers) {
    await handler?.();
  }
});

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      TokenLogo: { template: '<div />' },
      FormattedAmount: { template: '<div />' },
      TokenAddress: { template: '<div />' },
    },
    SUBQUERY_TYPES: {
      SnapshotTypes: {},
    },
    WALLET_CONSTS: {
      TokenTabs: {
        Token: 'token',
        NonFungibleToken: 'nft',
      },
      IndexerType: {
        SUBQUERY: 'SUBQUERY',
        SUBSQUID: 'SUBSQUID',
      },
    },
    api: {
      assets: {
        getAssetBalanceObservable: vi.fn(() => ({ subscribe: balanceSubscribe })),
      },
      apiRx: {
        query: {
          tokens: {
            totalIssuance: vi.fn(() => ({ subscribe: supplySubscribe })),
          },
        },
      },
    },
  });
});

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => {
    const run = async <T>(handler: () => T | Promise<T>) => await handler();
    return {
      withApi: run,
      withLoading: run,
      withChainApi: run,
      withParentLoading: run,
    };
  },
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    formatCodecNumber: (value: string) => value,
    getFiatAmountByCodecString: () => '10',
  }),
}));

vi.mock('@/modules/dashboard/router', () => ({
  dashboardLazyComponent: () => ({
    template: '<div />',
  }),
}));

vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => ({
    isLoggedIn: loggedInRef,
  }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    get screenBreakpointClass() {
      return screenBreakpointClassRef.value;
    },
  }),
}));

vi.mock('@/stores/dashboard', () => ({
  useDashboardStore: () => ({
    get ownedAssets() {
      return assetsRef.value;
    },
    subscribeOnOwnedAssets: vi.fn(async () => undefined),
    reset: vi.fn(async () => undefined),
  }),
}));

vi.mock('@/composables/useSubscriptions', () => ({
  useSubscriptions: (
    options: {
      startSubscriptions?: Array<(() => Promise<void> | void) | undefined>;
      resetSubscriptions?: Array<(() => Promise<void> | void) | undefined>;
    } = {}
  ) => {
    startSubscriptionHandlers.splice(0, startSubscriptionHandlers.length, ...(options.startSubscriptions ?? []));
    resetSubscriptionHandlers.splice(0, resetSubscriptionHandlers.length, ...(options.resetSubscriptions ?? []));

    return {
      withApi: vi.fn(async (handler: () => unknown) => await handler()),
      updateSubscriptions: updateSubscriptionsMock,
      resetSubscriptions: resetSubscriptionsMock,
    };
  },
}));

vi.mock('@/router', () => {
  const push = vi.fn();
  const back = vi.fn();
  return {
    default: {
      push,
      back,
    },
    lazyComponent: () => ({ template: '<div />' }),
  };
});

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { asset: '0x01' } }),
}));

vi.mock('@/utils', () => ({
  waitUntil: async (handler: () => boolean) => {
    const result = handler();
    if (!result) {
      return Promise.resolve();
    }
  },
}));

const globalStubs = {
  's-row': { template: '<div><slot /></div>' },
  SRow: { template: '<div><slot /></div>' },
  's-col': { template: '<div><slot /></div>' },
  SCol: { template: '<div><slot /></div>' },
  's-card': { template: '<div><slot /></div>' },
  's-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  SButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  's-icon': { template: '<i />' },
  SIcon: { template: '<i />' },
  's-divider': { template: '<hr />' },
  SDivider: { template: '<hr />' },
  's-tooltip': { template: '<span><slot /></span>' },
  STooltip: { template: '<span><slot /></span>' },
  StatsSupplyChart: { template: '<div />' },
};

describe('AssetOwnerDetails.vue', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    const routerModule = await import('@/router');
    routerModule.default.push.mockClear();
    routerModule.default.back.mockClear();
    balanceSubscribe.mockClear();
    supplySubscribe.mockClear();
    assetsRef.value = [
      {
        address: '0x01',
        name: 'Token',
        symbol: 'TKN',
        decimals: 18,
        precision: 18,
        isMintable: true,
        balance: {} as any,
      } as OwnedAsset,
    ];
    loggedInRef.value = true;
    startSubscriptionHandlers.splice(0, startSubscriptionHandlers.length);
    resetSubscriptionHandlers.splice(0, resetSubscriptionHandlers.length);
    updateSubscriptionsMock.mockClear();
    resetSubscriptionsMock.mockClear();
  });

  it('redirects to asset list when user not logged in', async () => {
    loggedInRef.value = false;

    mount(AssetOwnerDetails, {
      props: { parentLoading: false },
      global: { stubs: globalStubs },
    });

    const routerModule = await import('@/router');
    expect(routerModule.default.push).toHaveBeenCalledWith({ name: 'AssetOwner' });
  });

  it('opens send dialog via handler', async () => {
    const wrapper = mount(AssetOwnerDetails, {
      props: { parentLoading: false },
      global: { stubs: globalStubs },
    });

    const exposed = (wrapper.vm as any).$?.exposed!;
    expect(exposed).toBeDefined();
    expect(exposed.showSendDialog.value).toBe(false);

    exposed.openSendDialog();
    expect(exposed.showSendDialog.value).toBe(true);
  });

  it('navigates back when handleBack invoked', async () => {
    const wrapper = mount(AssetOwnerDetails, {
      props: { parentLoading: false },
      global: { stubs: globalStubs },
    });

    const exposed = (wrapper.vm as any).$?.exposed!;
    exposed.handleBack();
    const routerModule = await import('@/router');
    expect(routerModule.default.back).toHaveBeenCalled();
  });

  it('navigates to add liquidity', async () => {
    const wrapper = mount(AssetOwnerDetails, {
      props: { parentLoading: false },
      global: { stubs: globalStubs },
    });

    const exposed = (wrapper.vm as any).$?.exposed!;
    exposed.goToAddLiquidity();
    const routerModule = await import('@/router');
    expect(routerModule.default.push).toHaveBeenCalledWith({
      name: 'AddLiquidity',
      params: { first: 'XOR', second: '0x01' },
    });
  });
});
