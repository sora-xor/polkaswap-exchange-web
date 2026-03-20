import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import BarChart from '@/components/pages/Stats/BarChart.vue';

const fetchDataMock = vi.hoisted(() => vi.fn(async () => []));
const nodeIsConnectedState = vi.hoisted(() => ({ value: false }));

const passthroughComponent = defineComponent({
  template: '<div><slot name="filters"></slot><slot /></div>',
});
const chartSkeletonStub = defineComponent({
  props: ['loading', 'isEmpty', 'isError'],
  template:
    '<div class="chart-skeleton-stub" :data-loading="String(loading)" :data-empty="String(isEmpty)" :data-error="String(isError)"><slot /></div>',
});

vi.mock('@/router', () => ({
  lazyComponent: (name: string) => (name.includes('ChartSkeleton') ? chartSkeletonStub : passthroughComponent),
}));

vi.mock('@wallet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@wallet')>();

  return {
    ...actual,
    components: {
      ...actual.components,
      FormattedAmount: defineComponent({
        template: '<div><slot name="prefix"></slot><slot /></div>',
      }),
    },
  };
});

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

vi.mock('@/indexer/queries/network/volume', () => ({
  fetchData: fetchDataMock,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    get nodeIsConnected() {
      return nodeIsConnectedState.value;
    },
  }),
}));

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

vi.mock('pinia', () => ({
  storeToRefs: () => ({
    exchangeRate: { value: 1 },
    currencySymbol: { value: '$' },
  }),
}));

describe('BarChart', () => {
  it('keeps chart loading visible when node is disconnected and data is unresolved', async () => {
    nodeIsConnectedState.value = false;
    fetchDataMock.mockResolvedValueOnce([]);
    fetchDataMock.mockResolvedValueOnce([]);

    const wrapper = mount(BarChart, {
      global: {
        stubs: {
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
});
