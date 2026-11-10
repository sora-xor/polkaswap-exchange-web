import { FPNumber } from '@sora-substrate/math';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, nextTick, reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BarChart from '@/features/misc/components/stats/BarChart.vue';
import type { fetchData } from '@/indexer/queries/network/volume';
import barChartSource from '@/features/misc/components/stats/BarChart.vue?raw';

const fetchDataMock = vi.hoisted(() => vi.fn<typeof fetchData>().mockResolvedValue([]));
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
    yAxisSpec: (option: object) => option,
    tooltipSpec: (option: object) => option,
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
      exchangeRate: { value: settingsStoreMock.state.exchangeRate ?? 1 },
      currencySymbol: { value: settingsStoreMock.state.currencySymbol ?? '$' },
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

  it('settles a completed empty query even when the node is disconnected', async () => {
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
    expect(skeleton.attributes('data-empty')).toBe('true');
    expect(skeleton.attributes('data-loading')).toBe('false');
  });

  it.each([
    { fees: true, tick: '2', tip: '2 XOR' },
    { fees: false, tick: '300', tip: '¥ 300' },
  ])('uses the same unit for ticks and tooltip (fees=$fees)', async ({ fees, tick, tip }) => {
    settingsStoreMock.state.exchangeRate = 150;
    settingsStoreMock.state.currencySymbol = '¥';
    fetchDataMock.mockResolvedValueOnce([{ timestamp: 1000, value: new FPNumber(2) }]).mockResolvedValueOnce([]);
    const wrapper = mount(BarChart, { props: { fees } });
    await flushPromises();
    const chart = wrapper.findComponent({ name: 'VChartStub' }).props('option');
    expect(chart.yAxis.axisLabel.formatter(2).trim()).toBe(tick);
    expect(chart.tooltip.formatter([{ data: [1000, 2] }])).toBe(tip);
    wrapper.unmount();
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
          { timestamp: olderTimestamp, value: new FPNumber(1) },
          { timestamp: newerTimestamp, value: new FPNumber(3) },
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

  it('keeps data from the latest endpoint refresh when an older request resolves last', async () => {
    const timestamp = Date.now() - 60 * 60 * 1000;
    let resolveOldRequest!: (value: Array<{ timestamp: number; value: FPNumber }>) => void;
    let resolveNewRequest!: (value: Array<{ timestamp: number; value: FPNumber }>) => void;
    const oldRequest = new Promise<Array<{ timestamp: number; value: FPNumber }>>((resolve) => {
      resolveOldRequest = resolve;
    });
    const newRequest = new Promise<Array<{ timestamp: number; value: FPNumber }>>((resolve) => {
      resolveNewRequest = resolve;
    });
    fetchDataMock
      .mockImplementationOnce(() => oldRequest)
      .mockResolvedValueOnce([])
      .mockImplementationOnce(() => newRequest)
      .mockResolvedValueOnce([]);

    const wrapper = mount(BarChart, { props: { fees: true } });
    await nextTick();

    settingsStoreMock.state.indexerEndpoint = 'https://indexer.example/graphql';
    await nextTick();
    expect(fetchDataMock).toHaveBeenCalledTimes(4);

    resolveNewRequest([{ timestamp, value: new FPNumber(22) }]);
    await flushPromises();
    resolveOldRequest([{ timestamp, value: new FPNumber(11) }]);
    await flushPromises();

    const option = wrapper.findComponent({ name: 'VChartStub' }).props('option') as {
      dataset: { source: Array<[number, number]> };
    };
    expect(option.dataset.source).toContainEqual([timestamp, 22]);
    expect(option.dataset.source).not.toContainEqual([timestamp, 11]);
  });

  it('renders real observations and unknown gaps before a stalled or failed comparison, without a synthetic total', async () => {
    let failComparison!: (error: Error) => void;
    const comparison = new Promise<never>((_, reject) => {
      failComparison = reject;
    });
    fetchDataMock
      .mockResolvedValueOnce([
        { timestamp: 1000, value: new FPNumber(7) },
        { timestamp: 2000, value: null },
      ])
      .mockImplementationOnce(() => comparison);
    const wrapper = mount(BarChart, { props: { fees: true } });
    await flushPromises();
    expect(wrapper.find('.chart-skeleton-stub').attributes('data-loading')).toBe('false');
    expect(wrapper.find('[data-testid="network-flow-unavailable"]').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'VChartStub' }).props('option').dataset.source).toEqual([
      [1000, 7],
      [2000, null],
    ]);
    failComparison(new Error('comparison unavailable'));
    await flushPromises();
    expect(wrapper.find('.chart-skeleton-stub').attributes('data-error')).toBe('false');
  });

  it('shows a retryable error after a primary connection fails while the node is disconnected', async () => {
    fetchDataMock.mockRejectedValueOnce(new Error('missing primary page')).mockResolvedValueOnce([]);
    const wrapper = mount(BarChart);
    await flushPromises();
    expect(wrapper.find('.chart-skeleton-stub').attributes('data-loading')).toBe('false');
    expect(wrapper.find('.chart-skeleton-stub').attributes('data-error')).toBe('true');
  });

  it('aborts both current and comparison range reads on endpoint change and unmount', async () => {
    fetchDataMock.mockResolvedValue([]);
    const wrapper = mount(BarChart);
    await flushPromises();
    const oldSignal = vi.mocked(fetchDataMock).mock.calls[0][5] as AbortSignal;
    expect(oldSignal.aborted).toBe(false);
    settingsStoreMock.state.indexerEndpoint = 'https://indexer.example/graphql';
    await flushPromises();
    expect(oldSignal.aborted).toBe(true);
    const newSignal = vi.mocked(fetchDataMock).mock.calls[2][5] as AbortSignal;
    expect(vi.mocked(fetchDataMock).mock.calls[3][5]).toBe(newSignal);
    wrapper.unmount();
    expect(newSignal.aborted).toBe(true);
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
