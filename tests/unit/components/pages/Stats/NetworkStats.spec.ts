import { FPNumber } from '@sora-substrate/math';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import NetworkStats from '@/features/misc/components/stats/NetworkStats.vue';
import networkStatsSource from '@/features/misc/components/stats/NetworkStats.vue?raw';

const fetchDataMock = vi.hoisted(() => vi.fn(async () => []));
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
  fetchData: fetchDataMock,
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
    fetchActiveAccountsMock.mockResolvedValue(FPNumber.ZERO);
    settingsStoreMock.state = reactive({
      nodeIsConnected: false,
      indexerEndpoint: '',
    });
  });

  it('keeps filters disabled while stats data is unresolved and node is disconnected', async () => {
    fetchDataMock.mockResolvedValueOnce([]);
    fetchDataMock.mockResolvedValueOnce([]);

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
    fetchDataMock.mockResolvedValue([]);

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

    settingsStoreMock.state.indexerEndpoint = 'http://localhost:4350/graphql';
    await nextTick();
    await nextTick();

    expect(fetchDataMock).toHaveBeenCalledTimes(4);
    expect(fetchActiveAccountsMock).toHaveBeenCalledTimes(4);
  });

  it('renders the active account metric returned for the selected period', async () => {
    fetchDataMock.mockResolvedValue([]);
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

    await nextTick();
    await Promise.resolve();
    await Promise.resolve();
    await nextTick();

    expect(wrapper.text()).toContain('activeAccountsText');
    expect(wrapper.find('[data-value="12"]').exists()).toBe(true);
  });

  it('keeps snapshot metrics visible when the active account endpoint fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchDataMock
      .mockResolvedValueOnce([
        {
          timestamp: 1_700_000_000,
          accounts: new FPNumber(5),
          activeAccounts: FPNumber.ZERO,
          transactions: new FPNumber(7),
          bridgeIncomingTransactions: FPNumber.ZERO,
          bridgeOutgoingTransactions: FPNumber.ZERO,
        },
      ])
      .mockResolvedValueOnce([]);
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

    await nextTick();
    await Promise.resolve();
    await Promise.resolve();
    await nextTick();

    expect(wrapper.find('[data-value="5"]').exists()).toBe(true);
    expect(wrapper.find('[data-value="7"]').exists()).toBe(true);
    expect(wrapper.find('[data-value="0"]').exists()).toBe(true);
    expect(consoleError).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
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
    expect(networkStatsSource).toContain('fetchActiveAccountsOrZero');
    expect(networkStatsSource).toContain("prop: 'activeAccounts' as const");
  });
});
