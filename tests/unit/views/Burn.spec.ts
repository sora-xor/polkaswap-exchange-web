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

const settingsStoreMock = vi.hoisted(() => ({
  blockNumber: 25_100_000,
  soraNetwork: 'Prod',
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

describe('Burn.vue', () => {
  const intervalSpy = vi.spyOn(global, 'setInterval').mockImplementation((handler: TimerHandler) => {
    if (typeof handler === 'function') handler();
    return 1 as unknown as number;
  });
  const clearIntervalSpy = vi.spyOn(global, 'clearInterval').mockImplementation(() => {});
  beforeEach(async () => {
    settingsStoreMock.blockNumber = 25_100_000;
    settingsStoreMock.soraNetwork = 'Prod';
    loadingRef.value = false;
    fetchBurnDataMock.mockResolvedValue([]);
    waitForNetworkMock.mockResolvedValue('prod');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders only SOLSWAP campaign and opens its burn dialog', async () => {
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
    const burnLogo = wrapper.find('img.campaign-logo[alt="SOLSWAP logo"]');

    expect(vm.campaigns).toHaveLength(1);
    expect(vm.campaigns[0].id).toBe('solswap');
    expect(vm.campaigns[0].link).toBe('https://t.me/solswap_io');
    expect(burnLogo.exists()).toBe(true);
    expect(wrapper.findAll('img.campaign-logo')).toHaveLength(1);

    vm.handleBurnClick('solswap');

    expect(vm.burnDialogVisible).toBe(true);
    expect(vm.selectedReceivedAsset.symbol).toBe('SS');
    expect(vm.selectedRate).toBe('0.01');
    expect(vm.selectedMax).toBe(100_000_000);
    expect(vm.selectedMin).toBe(1);
  });

  it('marks campaigns as ended when block height exceeds range', async () => {
    settingsStoreMock.blockNumber = 61_000_000;

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

    expect(vm.ended.solswap).toBe(true);
    expect(vm.timeLeftFormatted.solswap).toBe('0D 0H 0M');

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
    const amount = new FPNumber(2);

    fetchBurnDataMock.mockResolvedValue([
      { blockHeight: 25_100_000, amount, address: 'alice' },
      { blockHeight: 25_100_000, amount, address: 'bob' },
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

    expect(vm.totalXorBurned.solswap.gte(amount.add(amount))).toBe(true);
    expect(vm.accountXorBurned.solswap.gte(amount)).toBe(true);
  });

  it('renders burn amounts without trailing decimal zeros', async () => {
    const wrapper = mount(BurnView, {
      global: {
        stubs: {
          BurnDialog: { template: '<div />' },
          ExternalLink: { template: '<a><slot /></a>' },
          InfoLine: {
            props: ['label', 'value', 'assetSymbol'],
            template:
              '<div class="info-line-stub"><span class="label">{{ label }}</span><span class="value">{{ value }}</span><span class="asset">{{ assetSymbol }}</span></div>',
          },
          's-button': { template: '<button><slot /></button>' },
          's-form': { template: '<form><slot /></form>' },
          's-row': { template: '<div><slot /></div>' },
          's-col': { template: '<div><slot /></div>' },
          's-card': { template: '<div><slot /></div>' },
        },
      },
    });

    await flushPromises();

    const text = wrapper.text();

    expect(text).toContain('0.01');
    expect(text).toContain('100 SOLSWAP per 1 XOR burned');
    expect(text).toContain('burn XOR to reserve SOLSWAP (SS)');
    expect(text).not.toContain('Time left');
    expect(text).not.toContain('Reserve KARMA');
    expect(text).not.toContain('Reserve KEN');
    expect(text).not.toContain('0.0 XOR');
  });
});
