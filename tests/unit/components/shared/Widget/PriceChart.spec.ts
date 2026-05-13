import { flushPromises, mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import type { VueWrapper } from '@vue/test-utils';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { SnapshotItem } from '@/types/chart';

const chartHarness = vi.hoisted(() => ({
  chartSources: [] as unknown[][],
  skeletonEmptyStates: [] as boolean[],
  dispatchAction: vi.fn(),
}));
const settingsHarness = vi.hoisted(() => ({
  store: {} as any,
}));

const mockTheme = {
  color: {
    theme: {
      accent: '#accent',
      accentHover: '#accent-hover',
    },
    base: {
      content: {
        primary: '#primary',
        secondary: '#secondary',
        tertiary: '#tertiary',
      },
      border: {
        secondary: '#border',
      },
      onAccent: '#on-accent',
    },
    utility: {
      body: '#utility',
    },
    status: {
      success: '#success',
      error: '#error',
      warning: '#warning',
      info: '#info',
    },
  },
  border: {
    radius: {
      mini: '4px',
    },
  },
  shadow: {
    dialog: 'none',
  },
} as const;

vi.mock('@/lib/echarts/component', async () => {
  const { defineComponent, h, watch } = await import('vue');

  return {
    default: defineComponent({
      name: 'VChart',
      props: {
        option: {
          type: Object,
          default: () => ({}),
        },
      },
      setup(props, { expose }) {
        expose({ dispatchAction: chartHarness.dispatchAction });
        watch(
          () => props.option,
          (option) => {
            chartHarness.chartSources.push(((option as any).dataset?.source ?? []) as unknown[]);
          },
          { immediate: true, deep: true }
        );

        return () => h('div', { class: 'v-chart-stub' });
      },
    }),
  };
});

vi.mock('@/components/shared/Widget/Base.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      name: 'BaseWidget',
      setup(_, { slots }) {
        return () => h('section', [slots.title?.(), slots.filters?.(), slots.types?.(), slots.default?.()]);
      },
    }),
  };
});

vi.mock('@/components/shared/Chart/ChartSkeleton.vue', async () => {
  const { defineComponent, h, watch } = await import('vue');

  return {
    default: defineComponent({
      name: 'ChartSkeleton',
      props: {
        loading: {
          type: Boolean,
          default: false,
        },
        isEmpty: {
          type: Boolean,
          default: false,
        },
        isError: {
          type: Boolean,
          default: false,
        },
      },
      emits: ['retry'],
      setup(props, { slots }) {
        watch(
          () => props.isEmpty,
          (isEmpty) => {
            chartHarness.skeletonEmptyStates.push(isEmpty);
          },
          { immediate: true }
        );

        return () => h('div', { class: 'chart-skeleton-stub' }, slots.default?.());
      },
    }),
  };
});

vi.mock('@/components/shared/Button/SvgIconButton/SvgIconButton.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      name: 'SvgIconButton',
      setup() {
        return () => h('button');
      },
    }),
  };
});

vi.mock('@/components/shared/Stats/StatsFilter.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      name: 'StatsFilter',
      setup() {
        return () => h('select');
      },
    }),
  };
});

vi.mock('@/components/shared/TokensRow.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      name: 'TokensRow',
      setup() {
        return () => h('div');
      },
    }),
  };
});

vi.mock('@/components/shared/PriceChange.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      name: 'PriceChange',
      setup() {
        return () => h('span');
      },
    }),
  };
});

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmount.vue', async () => {
  const { defineComponent, h } = await import('vue');

  return {
    default: defineComponent({
      name: 'FormattedAmount',
      setup() {
        return () => h('span');
      },
    }),
  };
});

vi.mock('@/composables/useLoading', async () => {
  const { ref } = await import('vue');

  return {
    useLoading: () => ({
      loading: ref(false),
      withApi: async (callback: () => Promise<void> | void) => {
        await callback();
      },
    }),
  };
});

vi.mock('@/composables/useThemePalette', async () => {
  const { computed } = await import('vue');

  return {
    useThemePalette: () => ({
      theme: computed(() => mockTheme),
    }),
    createThemePalette: () => mockTheme,
  };
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    formatDate: (value: number, format?: string) => `formatted-${value}-${format ?? ''}`,
  }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsHarness.store,
}));

import PriceChartWidget from '@/components/shared/Widget/PriceChart.vue';

const flushChartDebounce = async () => {
  await vi.advanceTimersByTimeAsync(600);
  await flushPromises();
  await nextTick();
  await flushPromises();
};

const asset = (address: string, symbol: string): AccountAsset =>
  ({
    address,
    symbol,
    decimals: 18,
  }) as AccountAsset;

const snapshot = (timestamp: number, price: [number, number, number, number]): SnapshotItem => ({
  timestamp,
  price,
  volume: 10,
});

describe('PriceChartWidget', () => {
  let wrappers: VueWrapper[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_300_000);
    settingsHarness.store = reactive({
      currency: null,
      currencies: [],
      exchangeRate: 1,
      currencySymbol: 'USD',
      indexerType: 'polkaswap',
      indexers: {
        polkaswap: {
          endpoint: 'ready',
        },
      },
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      measureText: () => ({ width: 24 }),
    } as unknown as CanvasRenderingContext2D);
    chartHarness.chartSources = [];
    chartHarness.skeletonEmptyStates = [];
    chartHarness.dispatchAction.mockClear();
    wrappers = [];
  });

  afterEach(() => {
    wrappers.forEach((wrapper) => wrapper.unmount());
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('loads pair chart data when swap availability resolves after mount', async () => {
    const requestMethod = vi.fn(async (entityId: string) => ({
      pageInfo: {
        hasNextPage: false,
        endCursor: undefined,
      },
      edges: [
        {
          cursor: `${entityId}-cursor`,
          node:
            entityId === 'base'
              ? snapshot(1_700_000_000_000, [2, 4, 1, 5])
              : snapshot(1_700_000_000_000, [1, 2, 1, 2]),
        },
      ],
    }));
    const requestSubscription = vi.fn(() => () => undefined);

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('base', 'BASE'),
        quoteAsset: asset('quote', 'QUOTE'),
        isAvailable: false,
        requestMethod,
        requestSubscription,
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();

    expect(requestMethod).not.toHaveBeenCalled();
    expect(chartHarness.skeletonEmptyStates.at(-1)).toBe(true);

    await wrapper.setProps({ isAvailable: true });
    await flushChartDebounce();

    expect(requestMethod).toHaveBeenCalledTimes(2);
    expect(requestSubscription).toHaveBeenCalledTimes(1);
    expect(chartHarness.skeletonEmptyStates.at(-1)).toBe(false);
    expect(chartHarness.chartSources.at(-1)).toContainEqual([1_700_000_000_000, 2, 2, 1, 2.5, 10]);
  });

  it('reloads chart data when the indexer endpoint becomes available after mount', async () => {
    settingsHarness.store.indexers.polkaswap.endpoint = '';
    const requestMethod = vi.fn(async (entityId: string) => {
      if (!settingsHarness.store.indexers.polkaswap.endpoint) return null;

      return {
        pageInfo: {
          hasNextPage: false,
          endCursor: undefined,
        },
        edges: [
          {
            cursor: `${entityId}-cursor`,
            node:
              entityId === 'base'
                ? snapshot(1_700_000_000_000, [3, 6, 2, 8])
                : snapshot(1_700_000_000_000, [1, 2, 1, 4]),
          },
        ],
      };
    });

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('base', 'BASE'),
        quoteAsset: asset('quote', 'QUOTE'),
        isAvailable: true,
        requestMethod,
        requestSubscription: vi.fn(() => () => undefined),
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();

    expect(requestMethod).toHaveBeenCalledTimes(2);
    expect(chartHarness.skeletonEmptyStates.at(-1)).toBe(true);

    settingsHarness.store.indexers.polkaswap.endpoint = 'ready';
    await nextTick();
    await flushChartDebounce();

    expect(requestMethod).toHaveBeenCalledTimes(4);
    expect(chartHarness.skeletonEmptyStates.at(-1)).toBe(false);
    expect(chartHarness.chartSources.at(-1)).toContainEqual([1_700_000_000_000, 3, 3, 2, 2, 10]);
  });
});
