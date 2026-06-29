import { FPNumber } from '@sora-substrate/math';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, nextTick, reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BarChart from '@/features/misc/components/stats/BarChart.vue';
import barChartSource from '@/features/misc/components/stats/BarChart.vue?raw';

const fetchDataMock = vi.hoisted(() => vi.fn(async () => []));
const settingsStoreMock = vi.hoisted(() => ({ state: undefined as any }));

vi.mock('@/components/shared/Widget/Base.vue', () => ({
  default: {
    template: '<div><slot name="filters"></slot><slot /></div>',
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
    template: '<div><slot /></div>',
  },
}));

vi.mock('@/components/shared/Stats/StatsFilter.vue', () => ({
  default: {
    template: '<div><slot /></div>',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmount.vue', () => ({
  default: defineComponent({
    template: '<div><slot name="prefix"></slot><slot /></div>',
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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
    barSeriesSpec: () => ({}),
  }),
}));

vi.mock('@/lib/echarts/component', () => ({
  default: defineComponent({
    name: 'VChartStub',
    props: ['option'],
    template: '<div class="v-chart-stub"></div>',
  }),
}));

vi.mock('@/indexer/queries/network/volume', () => ({
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

describe('BarChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStoreMock.state = reactive({
      nodeIsConnected: false,
      indexerEndpoint: '',
    });
  });

  it('keeps chart loading visible when node is disconnected and data is unresolved', async () => {
    fetchDataMock.mockResolvedValueOnce([]);
    fetchDataMock.mockResolvedValueOnce([]);

    const wrapper = mount(BarChart, {
      global: {
        stubs: {
          VChart: true,
          'v-chart': true,
        },
      },
    });

    await flushPromises();
    await nextTick();

    const skeleton = wrapper.find('.chart-skeleton-stub');
    expect(skeleton.exists()).toBe(true);
    expect(skeleton.attributes('data-loading')).toBe('true');
  });

  it('refreshes unresolved chart data when the indexer endpoint becomes available', async () => {
    fetchDataMock.mockResolvedValue([]);

    mount(BarChart, {
      global: {
        stubs: {
          VChart: true,
          'v-chart': true,
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
  });

  it('passes normalized chart points to ECharts in chronological order', async () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.UTC(2026, 4, 15);
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(now);
    const newerTimestamp = now - 60 * 60 * 1000;
    const olderTimestamp = now - dayMs;

    try {
      fetchDataMock
        .mockResolvedValueOnce([
          { timestamp: newerTimestamp, value: new FPNumber(3) },
          { timestamp: olderTimestamp, value: new FPNumber(1) },
        ])
        .mockResolvedValueOnce([]);

      const wrapper = mount(BarChart, {
        props: {
          fees: true,
        },
      });

      await flushPromises();
      await nextTick();

      const option = wrapper.findComponent({ name: 'VChartStub' }).props('option') as {
        dataset: { source: Array<[number, number]> };
      };
      const source = option.dataset.source;
      const timestamps = source.map(([timestamp]) => timestamp);

      expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
      expect(source.find(([timestamp]) => timestamp === olderTimestamp)).toEqual([olderTimestamp, 1]);
      expect(source.findIndex(([timestamp]) => timestamp === olderTimestamp)).toBeLessThan(
        source.findIndex(([timestamp]) => timestamp === newerTimestamp)
      );
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('uses direct shared imports instead of the central lazy registry', () => {
    expect(barChartSource).not.toContain('lazyComponent(');
    expect(barChartSource).not.toContain('Components.');
    expect(barChartSource).not.toContain("from '@/router'");
    expect(barChartSource).toContain("from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue'");
    expect(barChartSource).toContain("import BaseWidget from '@/components/shared/Widget/Base.vue';");
    expect(barChartSource).toContain("import ChartSkeleton from '@/components/shared/Chart/ChartSkeleton.vue';");
    expect(barChartSource).toContain("import PriceChange from '@/components/shared/PriceChange.vue';");
    expect(barChartSource).toContain("import StatsFilter from '@/components/shared/Stats/StatsFilter.vue';");
  });
});
