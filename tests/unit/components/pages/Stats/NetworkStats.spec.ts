import { FPNumber } from '@sora-substrate/math';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, nextTick, reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import NetworkStats from '@/features/misc/components/stats/NetworkStats.vue';
import { SoraNetwork } from '@/lib/soraneo-wallet/src/consts';
import networkStatsSource from '@/features/misc/components/stats/NetworkStats.vue?raw';

const fetchDataMock = vi.hoisted(() => vi.fn());
const archiveOnly = vi.hoisted(() => ({ value: false }));
const fetchActiveAccountsMock = vi.hoisted(() => vi.fn());
const settingsStoreMock = vi.hoisted(() => ({ state: undefined as any }));

vi.mock('@/components/shared/Widget/Base.vue', () => ({
  default: {
    template: '<div><slot name="filters"></slot><slot /></div>',
  },
}));

vi.mock('@/components/shared/Stats/StatsFilter.vue', () => ({
  default: {
    props: ['disabled'],
    template: '<div class="stats-filter-stub" :data-disabled="String(disabled)"></div>',
  },
}));

vi.mock('@/components/shared/PriceChange.vue', () => ({
  default: {
    props: ['value'],
    template: '<div class="price-change-stub">{{ value }}</div>',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmount.vue', () => ({
  default: defineComponent({
    template:
      '<div class="formatted-amount-stub" :data-value="value" :data-integer-only="String(integerOnly)">{{ value }}</div>',
    props: ['value', 'integerOnly'],
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    tc: (key: string) => key,
    TranslationConsts: {
      Sora: 'SORA',
      Ethereum: 'Ethereum',
    },
  }),
}));

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => ({
    loading: { value: false },
    withLoading: async (handler: () => Promise<void>) => await handler(),
    withParentLoading: async (handler: () => Promise<void>) => await handler(),
  }),
}));

vi.mock('@/indexer/queries/network/stats', () => ({
  readNetworkPeriodCounts: async (...args: unknown[]) => {
    const counts = await fetchDataMock(...args);
    return {
      counts,
      archivedDays: counts?.archivedDays ?? [],
      retainedTransactionsComplete: !archiveOnly.value && counts?.transactions != null,
    };
  },
  fetchActiveAccounts: fetchActiveAccountsMock,
}));

vi.mock('@/stores/settings', async () => {
  const { reactive } = await import('vue');

  settingsStoreMock.state ??= reactive({
    nodeIsConnected: false,
    indexerEndpoint: '',
  });

  return {
    useSettingsStore: () => ({
      get soraNetwork() {
        return settingsStoreMock.state.soraNetwork;
      },
      get nodeIsConnected() {
        return settingsStoreMock.state.nodeIsConnected;
      },
      get indexerType() {
        return 'POLKASWAP';
      },
      get indexers() {
        return {
          POLKASWAP: {
            endpoint: settingsStoreMock.state.indexerEndpoint,
          },
        };
      },
    }),
  };
});

vi.mock('@/consts/snapshots', () => ({
  SECONDS_IN_TYPE: {
    day: 24 * 60 * 60,
  },
  NETWORK_STATS_FILTERS: [
    {
      label: '1D',
      type: 'day',
      count: 1,
    },
  ],
}));

describe('NetworkStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    archiveOnly.value = false;
    fetchActiveAccountsMock.mockResolvedValue(FPNumber.ZERO);
    settingsStoreMock.state = reactive({
      nodeIsConnected: false,
      indexerEndpoint: '',
    });
  });

  it('offers the fixed mainnet CSV without exposing it as testnet history', async () => {
    settingsStoreMock.state.soraNetwork = SoraNetwork.Prod;
    const wrapper = mount(NetworkStats, {
      global: { stubs: { 's-card': true, 's-tooltip': true, 's-icon': true } },
    });
    await flushPromises();
    const link = wrapper.get('[data-testid="verified-days-download"]');
    expect(link.attributes('href')).toContain('polkaswap-verified-days-2026-11-10');
    expect(link.attributes('download')).toBe('polkaswap-verified-days-2026-11-10.csv');
    settingsStoreMock.state.soraNetwork = SoraNetwork.Test;
    await nextTick();
    expect(wrapper.find('[data-testid="verified-days-download"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows unavailable for account creation while preserving transaction statistics', async () => {
    fetchDataMock.mockResolvedValue({
      accounts: null,
      transactions: new FPNumber(22),
      bridgeIncomingTransactions: new FPNumber(3),
      bridgeOutgoingTransactions: new FPNumber(4),
    });
    const wrapper = mount(NetworkStats, {
      global: { stubs: { 's-card': { template: '<div><slot /></div>' }, 's-tooltip': true, 's-icon': true } },
    });
    await flushPromises();
    expect(wrapper.findAll('[data-testid="network-metric-unavailable"]')).toHaveLength(1);
    expect(wrapper.findAll('.formatted-amount-stub').some((row) => row.attributes('data-value') === '22')).toBe(true);
    wrapper.unmount();
  });

  it('shows archived transaction and bridge totals without turning partial retained signers into an active count', async () => {
    archiveOnly.value = true;
    fetchDataMock.mockResolvedValue({
      accounts: null,
      transactions: new FPNumber(144),
      bridgeIncomingTransactions: new FPNumber(6),
      bridgeOutgoingTransactions: new FPNumber(3),
    });
    fetchActiveAccountsMock.mockResolvedValue(new FPNumber(5));
    const wrapper = mount(NetworkStats, {
      global: {
        stubs: {
          's-card': { template: '<div><slot /></div>' },
          's-tooltip': true,
          's-icon': true,
        },
      },
    });
    await flushPromises();
    expect(wrapper.findAll('.formatted-amount-stub').map((e) => e.attributes('data-value'))).toEqual(['144', '6', '3']);
    expect(wrapper.findAll('[data-testid="network-metric-unavailable"]')).toHaveLength(2);
    wrapper.unmount();
  });

  it('shows only the available archive dates beside an incomplete period, including real zeros', async () => {
    fetchDataMock.mockResolvedValue({
      accounts: null,
      transactions: null,
      bridgeIncomingTransactions: null,
      bridgeOutgoingTransactions: null,
      archivedDays: [
        { date: '2026-07-20', transactions: '82', bridgeIncomingTransactions: '5', bridgeOutgoingTransactions: '0' },
      ],
    });
    const wrapper = mount(NetworkStats, {
      global: {
        stubs: {
          's-card': { template: '<div><slot /></div>' },
          's-tooltip': true,
          's-icon': true,
        },
      },
    });
    await flushPromises();
    expect(wrapper.find('[data-testid="archive-days"] tbody').text()).toContain('2026-07-20');
    expect(wrapper.findAll('tbody td').map((e) => e.text())).toEqual(['82', '5', '0']);
    expect(wrapper.findAll('[data-testid="network-metric-unavailable"]')).toHaveLength(5);
    wrapper.unmount();
  });

  it('keeps filters disabled while stats data is unresolved and node is disconnected', async () => {
    fetchActiveAccountsMock.mockResolvedValue(null);
    fetchDataMock.mockResolvedValue(null);

    const wrapper = mount(NetworkStats, {
      global: {
        stubs: {
          's-card': true,
          's-tooltip': true,
          's-icon': true,
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    });

    await nextTick();
    await nextTick();

    const filter = wrapper.find('.stats-filter-stub');
    expect(filter.exists()).toBe(true);
    expect(filter.attributes('data-disabled')).toBe('true');
    expect(wrapper.find('.app-loading-overlay').exists()).toBe(true);
    expect(wrapper.find('.app-loading-overlay').classes()).toContain('el-loading-mask');
    expect(wrapper.find('.app-loading-overlay__spinner').exists()).toBe(true);
    expect(wrapper.find('.app-loading-overlay__spinner').classes()).toContain('el-loading-spinner');
  });

  it('refreshes unresolved stats when the indexer endpoint becomes available', async () => {
    fetchDataMock.mockResolvedValue(null);

    mount(NetworkStats, {
      global: {
        stubs: {
          's-card': true,
          's-tooltip': true,
          's-icon': true,
        },
      },
    });

    await nextTick();
    await nextTick();
    expect(fetchDataMock).toHaveBeenCalledTimes(2);

    settingsStoreMock.state.indexerEndpoint = 'https://indexer.example/graphql';
    await nextTick();
    await nextTick();

    expect(fetchDataMock).toHaveBeenCalledTimes(4);
    expect(fetchActiveAccountsMock).toHaveBeenCalledTimes(4);
  });

  it('withholds an observed account count when transaction history lacks coverage', async () => {
    fetchDataMock.mockResolvedValue(null);
    fetchActiveAccountsMock.mockResolvedValueOnce(new FPNumber(12)).mockResolvedValueOnce(new FPNumber(8));

    const wrapper = mount(NetworkStats, {
      global: {
        stubs: {
          's-card': {
            template: '<section><slot name="header"></slot><slot /></section>',
          },
          's-tooltip': {
            template: '<span><slot /></span>',
          },
          's-icon': true,
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain('activeAccountsText');
    expect(wrapper.find('[data-value="12"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="network-metric-unavailable"]')).toHaveLength(5);
  });

  it.each([0, 12])('shows a certified period with %d active accounts', async (active) => {
    fetchDataMock.mockResolvedValue({
      transactions: new FPNumber(20),
      accounts: null,
      bridgeIncomingTransactions: FPNumber.ZERO,
      bridgeOutgoingTransactions: FPNumber.ZERO,
    });
    fetchActiveAccountsMock.mockResolvedValue(new FPNumber(active));
    const wrapper = mount(NetworkStats, {
      global: {
        stubs: {
          's-card': { template: '<div><slot /></div>' },
          's-tooltip': true,
          's-icon': true,
        },
      },
    });
    await flushPromises();
    const card = wrapper.findAll('.stats-column')[1];
    expect(card.find('.formatted-amount-stub').attributes('data-value')).toBe(String(active));
    expect(card.find('[data-testid="network-metric-unavailable"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps snapshot metrics visible when the active account endpoint fails', async () => {
    fetchDataMock
      .mockResolvedValueOnce({
        accounts: new FPNumber(5),
        activeAccounts: FPNumber.ZERO,
        transactions: new FPNumber(7),
        bridgeIncomingTransactions: FPNumber.ZERO,
        bridgeOutgoingTransactions: FPNumber.ZERO,
      })
      .mockResolvedValueOnce(null);
    fetchActiveAccountsMock.mockRejectedValue(new Error('account activity unavailable'));

    const wrapper = mount(NetworkStats, {
      global: {
        stubs: {
          's-card': {
            template: '<section><slot name="header"></slot><slot /></section>',
          },
          's-tooltip': {
            template: '<span><slot /></span>',
          },
          's-icon': true,
        },
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-value="5"]').exists()).toBe(true);
    expect(wrapper.find('[data-value="7"]').exists()).toBe(true);
    expect(wrapper.find('[data-value="0"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="network-metric-unavailable"]')).toHaveLength(1);
    expect(wrapper.find('.price-change-stub').exists()).toBe(false);
  });

  it('keeps data from the latest endpoint refresh when an older request resolves last', async () => {
    const snapshot = (accounts: number) => ({
      accounts: new FPNumber(accounts),
      activeAccounts: FPNumber.ZERO,
      transactions: FPNumber.ZERO,
      bridgeIncomingTransactions: FPNumber.ZERO,
      bridgeOutgoingTransactions: FPNumber.ZERO,
    });
    let resolveOldRequest!: (value: ReturnType<typeof snapshot>) => void;
    let resolveNewRequest!: (value: ReturnType<typeof snapshot>) => void;
    const oldRequest = new Promise<ReturnType<typeof snapshot>>((resolve) => {
      resolveOldRequest = resolve;
    });
    const newRequest = new Promise<ReturnType<typeof snapshot>>((resolve) => {
      resolveNewRequest = resolve;
    });
    fetchDataMock
      .mockImplementationOnce(() => oldRequest)
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(() => newRequest)
      .mockResolvedValueOnce(null);

    const wrapper = mount(NetworkStats, {
      global: {
        stubs: {
          's-card': {
            template: '<section><slot name="header"></slot><slot /></section>',
          },
          's-tooltip': {
            template: '<span><slot /></span>',
          },
          's-icon': true,
        },
      },
    });
    await nextTick();

    settingsStoreMock.state.indexerEndpoint = 'https://indexer.example/graphql';
    await nextTick();
    expect(fetchDataMock).toHaveBeenCalledTimes(4);

    resolveNewRequest(snapshot(22));
    await flushPromises();
    resolveOldRequest(snapshot(11));
    await flushPromises();

    expect(wrapper.find('[data-value="22"]').exists()).toBe(true);
    expect(wrapper.find('[data-value="11"]').exists()).toBe(false);
  });

  it('binds integer-only rendering for whole-number counters', () => {
    expect(networkStatsSource).toContain(':integer-only="!value.amount.includes(FPNumber.DELIMITERS_CONFIG.decimal)"');
    expect(networkStatsSource).not.toContain('lazyComponent(');
    expect(networkStatsSource).not.toContain('Components.');
    expect(networkStatsSource).not.toContain("from '@/router'");
    expect(networkStatsSource).toContain("from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue'");
    expect(networkStatsSource).toContain("import BaseWidget from '@/components/shared/Widget/Base.vue';");
    expect(networkStatsSource).toContain("import StatsFilter from '@/components/shared/Stats/StatsFilter.vue';");
    expect(networkStatsSource).toContain("import PriceChange from '@/components/shared/PriceChange.vue';");
    expect(networkStatsSource).toContain('fetchActiveAccounts');
    expect(networkStatsSource).toContain("prop: 'activeAccounts' as const");
  });
});
