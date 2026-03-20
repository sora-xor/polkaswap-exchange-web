import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import TvlChart from '@/components/pages/Stats/TvlChart.vue';

const fetchDataMock = vi.hoisted(() => vi.fn(async () => []));
const nodeIsConnectedState = vi.hoisted(() => ({ value: false }));

const passthroughComponent = defineComponent({
  template: '<div><slot name="filters"></slot><slot></slot></div>',
});
const priceChangeStub = defineComponent({
  template: '<div class="price-change-stub"></div>',
});
const chartSkeletonStub = defineComponent({
  props: ['loading', 'isEmpty', 'isError'],
  template:
    '<div class="chart-skeleton-stub" :data-loading="String(loading)" :data-empty="String(isEmpty)" :data-error="String(isError)"><slot /></div>',
});

vi.mock('@/router', () => ({
  lazyComponent: (name: string) =>
    name.includes('PriceChange')
      ? priceChangeStub
      : name.includes('ChartSkeleton')
        ? chartSkeletonStub
        : passthroughComponent,
}));

vi.mock('@wallet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@wallet')>();

  return {
    ...actual,
    components: {
      ...actual.components,
      FormattedAmount: defineComponent({
        template: '<div><slot name="prefix"></slot><slot></slot></div>',
      }),
    },
  };
});

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

vi.mock('@/indexer/queries/network/tvl', () => ({
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

describe('TvlChart', () => {
  it('keeps chart skeleton loading when node is disconnected and data is unresolved', async () => {
    nodeIsConnectedState.value = false;
    fetchDataMock.mockResolvedValueOnce([]);

    const wrapper = mount(TvlChart, {
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

  it('stops chart skeleton loading when node is connected even with empty dataset', async () => {
    nodeIsConnectedState.value = true;
    fetchDataMock.mockResolvedValueOnce([]);

    const wrapper = mount(TvlChart, {
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
    expect(skeleton.attributes('data-loading')).toBe('false');
  });

  it('renders without runtime errors when translation consts are available', async () => {
    nodeIsConnectedState.value = false;
    fetchDataMock.mockResolvedValueOnce([]);

    const wrapper = mount(TvlChart, {
      global: {
        stubs: {
          'v-chart': true,
        },
      },
    });

    await nextTick();

    expect(wrapper.exists()).toBe(true);
    expect(fetchDataMock).toHaveBeenCalled();
    expect(wrapper.find('.price-change-stub').exists()).toBe(true);
  });
});
