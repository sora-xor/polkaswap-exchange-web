import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import BurnView from '@/views/Burn.vue';
import { FPNumber } from '@sora-substrate/sdk';

const connectWalletMock = vi.fn();
const waitForNetworkMock = vi.fn().mockResolvedValue('prod');
const fetchBurnDataMock = vi.fn().mockResolvedValue([]);

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    vuex: {
      WalletModules: [],
    },
  });
});

const loadingRef = ref(false);

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => {
    const run = async <T>(handler: () => T | Promise<T>) => await handler();
    return {
      loading: loadingRef,
      withLoading: run,
      withApi: run,
      withChainApi: run,
      withParentLoading: run,
    };
  },
}));

vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => ({
    soraAddress: ref('alice'),
    isLoggedIn: ref(true),
    connectSoraWallet: connectWalletMock,
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    getFPNumber: (value: string | number) => new FPNumber(value),
    getFiatAmountByString: vi.fn(),
  }),
}));

vi.mock('@/router', () => ({
  lazyComponent: () => ({
    name: 'LazyLoaded',
    template: '<div />',
  }),
}));

vi.mock('@/indexer/queries/burnXor', () => ({
  fetchData: (...args: unknown[]) => fetchBurnDataMock(...(args as Parameters<typeof fetchBurnDataMock>)),
}));

vi.mock('@/utils', () => ({
  waitForSoraNetworkFromEnv: () => waitForNetworkMock(),
}));

vi.mock('@/components/pages/Burn/BurnDialog.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: {
    name: 'BurnDialogStub',
    template: '<div />',
  },
}));

vi.mock('@/store', () => {
  const store = {
    state: {
      wallet: {
        settings: {
          blockNumber: 15_739_737,
          soraNetwork: 'Prod',
        },
        account: {
          fiatPriceObject: {},
        },
      },
      settings: {
        isWalletLoaded: true,
      },
    },
    getters: {
      wallet: {
        account: {
          isLoggedIn: true,
        },
      },
    },
    commit: {
      web3: {
        setSoraAccountDialogVisibility: vi.fn(),
      },
    },
    dispatch: {
      wallet: {
        account: {
          logout: vi.fn(),
        },
      },
    },
  };

  return { default: store };
});

describe('Burn.vue', () => {
  const intervalSpy = vi.spyOn(global, 'setInterval').mockImplementation((handler: TimerHandler) => {
    if (typeof handler === 'function') handler();
    return 1 as unknown as number;
  });
  const clearIntervalSpy = vi.spyOn(global, 'clearInterval').mockImplementation(() => {});

  let store: any;

  beforeEach(async () => {
    store = (await import('@/store')).default;
    store.state.wallet.settings.blockNumber = 15_739_737;
    store.state.wallet.settings.soraNetwork = 'Prod';
    store.state.wallet.account.fiatPriceObject = {};
    loadingRef.value = false;
    fetchBurnDataMock.mockResolvedValue([]);
    waitForNetworkMock.mockResolvedValue('prod');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('opens burn dialog with selected campaign data', async () => {
    const wrapper = mount(BurnView, {
      global: {
        stubs: {
          BurnDialog: { template: '<div />' },
          's-button': { template: '<button><slot /></button>' },
          's-form': { template: '<form><slot /></form>' },
          's-row': { template: '<div><slot /></div>' },
          's-col': { template: '<div><slot /></div>' },
          's-card': { template: '<div><slot /></div>' },
          's-input': { template: '<input />' },
          's-icon': { template: '<i />' },
          's-button-group': { template: '<div><slot /></div>' },
        },
      },
    });

    await flushPromises();

    const vm = wrapper.vm as unknown as Record<string, any>;

    vm.handleBurnClick('kensetsu');

    expect(vm.burnDialogVisible).toBe(true);
    expect(vm.selectedRate).toBe(1_000_000);
    expect(vm.selectedMax).toBe(10_000);
    expect(vm.selectedMin).toBe(1);
  });

  it('marks campaigns as ended when block height exceeds range', async () => {
    store.state.wallet.settings.blockNumber = 20_000_000;

    const wrapper = mount(BurnView, {
      global: {
        stubs: {
          BurnDialog: { template: '<div />' },
          's-button': { template: '<button><slot /></button>' },
          's-form': { template: '<form><slot /></form>' },
          's-row': { template: '<div><slot /></div>' },
          's-col': { template: '<div><slot /></div>' },
          's-card': { template: '<div><slot /></div>' },
          's-input': { template: '<input />' },
          's-icon': { template: '<i />' },
        },
      },
    });

    await flushPromises();

    const vm = wrapper.vm as unknown as Record<string, any>;

    expect(vm.ended.chameleon).toBe(true);
    expect(vm.ended.kensetsu).toBe(true);
    expect(vm.timeLeftFormatted.chameleon).toBe('0D 0H 0M');
    expect(vm.timeLeftFormatted.kensetsu).toBe('0D 0H 0M');

    wrapper.unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('sets loading after burn confirmation', async () => {
    const wrapper = mount(BurnView, {
      global: {
        stubs: {
          BurnDialog: { template: '<div />' },
          's-button': { template: '<button><slot /></button>' },
          's-form': { template: '<form><slot /></form>' },
          's-row': { template: '<div><slot /></div>' },
          's-col': { template: '<div><slot /></div>' },
          's-card': { template: '<div><slot /></div>' },
        },
      },
    });

    await flushPromises();

    const vm = wrapper.vm as unknown as Record<string, any>;

    expect(loadingRef.value).toBe(false);
    vm.handleBurnConfirm(true);
    expect(loadingRef.value).toBe(true);
  });

  it('aggregates burned amounts for qualifying accounts', async () => {
    const amount = new FPNumber(100_000_000);

    fetchBurnDataMock.mockResolvedValue([
      { blockHeight: 15_750_000, amount, address: 'alice' },
      { blockHeight: 15_750_000, amount, address: 'bob' },
    ]);

    const wrapper = mount(BurnView, {
      global: {
        stubs: {
          BurnDialog: { template: '<div />' },
          's-button': { template: '<button><slot /></button>' },
          's-form': { template: '<form><slot /></form>' },
          's-row': { template: '<div><slot /></div>' },
          's-col': { template: '<div><slot /></div>' },
          's-card': { template: '<div><slot /></div>' },
        },
      },
    });

    await flushPromises();

    const vm = wrapper.vm as unknown as Record<string, any>;

    expect(vm.totalXorBurned.chameleon.gte(amount)).toBe(true);
    expect(vm.accountXorBurned.chameleon.gte(amount)).toBe(true);
  });
});
