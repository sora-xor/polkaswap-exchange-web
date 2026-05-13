import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TvlChart from '@/components/pages/Stats/TvlChart.vue';
import tvlChartSource from '@/components/pages/Stats/TvlChart.vue?raw';

const fetchDataMock = vi.hoisted(() => vi.fn(async () => []));
const settingsStoreMock = vi.hoisted(() => ({ state: undefined as any }));

vi.mock('@/components/shared/Widget/Base.vue', () => ({
  default: {
    template: '<div><slot name="filters"></slot><slot></slot></div>',
  },
}));

vi.mock('@/components/shared/Chart/ChartSkeleton.vue', () => ({
  default: {
    props: ['loading', 'isEmpty', 'isError'],
    template:
      '<div class="chart-skeleton-stub" :data-loading="String(loading)" :data-empty="String(isEmpty)" :data-error="String(isError)"><slot /></div>',
  },
}));

vi.mock('@/components/shared/PriceChange.vue', () => ({
  default: {
    template: '<div class="price-change-stub"></div>',
  },
}));

vi.mock('@/components/shared/Stats/StatsFilter.vue', () => ({
  default: {
    template: '<div><slot /></div>',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmount.vue', () => ({
  default: defineComponent({
    template: '<div><slot name="prefix"></slot><slot></slot></div>',
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    TranslationConsts: {
      TVL: 'TVL',
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

vi.mock('@/composables/useChartSpec', () => ({
  useChartSpec: () => ({
    gridSpec: () => ({}),
    xAxisSpec: () => ({}),
    yAxisSpec: () => ({}),
    tooltipSpec: () => ({}),
    lineSeriesSpec: () => ({}),
  }),
}));

vi.mock('@/lib/echarts/component', () => ({
  default: defineComponent({
    name: 'VChartStub',
    template: '<div class="v-chart-stub"></div>',
  }),
}));

vi.mock('@/indexer/queries/network/tvl', () => ({
  fetchData: fetchDataMock,
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

vi.mock('pinia', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pinia')>();

  return {
    ...actual,
    storeToRefs: () => ({
      exchangeRate: { value: 1 },
      currencySymbol: { value: '$' },
    }),
  };
});

describe('TvlChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStoreMock.state = reactive({
      nodeIsConnected: false,
      indexerEndpoint: '',
    });
  });

  it('keeps chart skeleton loading when node is disconnected and data is unresolved', async () => {
    fetchDataMock.mockResolvedValueOnce([]);

    const wrapper = mount(TvlChart, {
      global: {
        stubs: {
          VChart: true,
          'v-chart': true,
        },
      },
    });

    await nextTick();
    await nextTick();

    const skeleton = wrapper.find('.chart-skeleton-stub');
    expect(skeleton.exists()).toBe(true);
    expect(skeleton.attributes('data-loading')).toBe('true');
  });

  it('stops chart skeleton loading when node is connected even with empty dataset', async () => {
    settingsStoreMock.state.nodeIsConnected = true;
    fetchDataMock.mockResolvedValueOnce([]);

    const wrapper = mount(TvlChart, {
      global: {
        stubs: {
          VChart: true,
          'v-chart': true,
        },
      },
    });

    await nextTick();
    await nextTick();

    const skeleton = wrapper.find('.chart-skeleton-stub');
    expect(skeleton.exists()).toBe(true);
    expect(skeleton.attributes('data-loading')).toBe('false');
  });

  it('renders without runtime errors when translation consts are available', async () => {
    fetchDataMock.mockResolvedValueOnce([]);

    const wrapper = mount(TvlChart, {
      global: {
        stubs: {
          VChart: true,
          'v-chart': true,
        },
      },
    });

    await nextTick();

    expect(wrapper.exists()).toBe(true);
    expect(fetchDataMock).toHaveBeenCalled();
    expect(wrapper.find('.price-change-stub').exists()).toBe(true);
  });

  it('refreshes unresolved TVL data when the indexer endpoint becomes available', async () => {
    fetchDataMock.mockResolvedValue([]);

    mount(TvlChart, {
      global: {
        stubs: {
          VChart: true,
          'v-chart': true,
        },
      },
    });

    await nextTick();
    await nextTick();
    expect(fetchDataMock).toHaveBeenCalledTimes(1);

    settingsStoreMock.state.indexerEndpoint = 'http://localhost:4350/graphql';
    await nextTick();
    await nextTick();

    expect(fetchDataMock).toHaveBeenCalledTimes(2);
  });

  it('uses direct shared imports instead of the central lazy registry', () => {
    expect(tvlChartSource).not.toContain('lazyComponent(');
    expect(tvlChartSource).not.toContain('Components.');
    expect(tvlChartSource).not.toContain("from '@/router'");
    expect(tvlChartSource).toContain("from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue'");
    expect(tvlChartSource).toContain("import BaseWidget from '@/components/shared/Widget/Base.vue';");
    expect(tvlChartSource).toContain("import ChartSkeleton from '@/components/shared/Chart/ChartSkeleton.vue';");
    expect(tvlChartSource).toContain("import PriceChange from '@/components/shared/PriceChange.vue';");
    expect(tvlChartSource).toContain("import StatsFilter from '@/components/shared/Stats/StatsFilter.vue';");
  });
});
