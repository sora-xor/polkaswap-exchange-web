import { flushPromises, mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import type { VueWrapper } from '@vue/test-utils';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { SnapshotItem } from '@/types/chart';

const chartHarness = vi.hoisted(() => ({
  chartSources: [] as unknown[][],
  skeletonEmptyStates: [] as boolean[],
  skeletonErrorStates: [] as boolean[],
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
        watch(
          () => props.isError,
          (isError) => {
            chartHarness.skeletonErrorStates.push(isError);
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
      props: {
        filters: {
          type: Array,
          default: () => [],
        },
        modelValue: {
          type: Object,
          default: null,
        },
      },
      emits: ['update:model-value'],
      setup(props, { emit }) {
        return () =>
          h('select', {
            onChange: () => emit('update:model-value', props.filters[0]),
          });
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

const selectFilterByLabel = async (wrapper: VueWrapper, label: string): Promise<void> => {
  const statsFilter = wrapper.findComponent({ name: 'StatsFilter' });
  const filters = statsFilter.props('filters') as Array<{ label: string }>;
  const filter = filters.find((item) => item.label === label);

  expect(filter).toBeTruthy();

  statsFilter.vm.$emit('update:model-value', filter);
  await flushChartDebounce();
};

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
    chartHarness.skeletonErrorStates = [];
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

  it('renders sparse indexer history without synthetic gap candles', async () => {
    const requestMethod = vi.fn(async () => ({
      pageInfo: {
        hasNextPage: false,
        endCursor: undefined,
      },
      edges: [
        {
          cursor: 'latest',
          node: snapshot(1_700_000_000_000, [1, 2, 1, 3]),
        },
        {
          cursor: 'older',
          node: snapshot(1_699_999_700_000, [4, 5, 4, 6]),
        },
      ],
    }));

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('xor', 'XOR'),
        requestMethod,
        requestSubscription: vi.fn(() => () => undefined),
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();

    expect(requestMethod).toHaveBeenCalledTimes(1);
    expect(chartHarness.chartSources.at(-1)).toEqual([
      [1_699_999_700_000, 4, 5, 4, 6, 10],
      [1_700_000_000_000, 1, 2, 1, 3, 10],
    ]);
  });

  it('drops stale sparse rows outside the selected 5M time window', async () => {
    const latestTimestamp = 1_700_000_000_000;
    const requestMethod = vi.fn(async () => ({
      pageInfo: {
        hasNextPage: false,
        endCursor: undefined,
      },
      edges: [
        {
          cursor: 'latest',
          node: snapshot(latestTimestamp, [5, 5.25, 5, 5.5]),
        },
        {
          cursor: 'recent',
          node: snapshot(latestTimestamp - 20 * 60 * 1000, [5.1, 5.2, 5, 5.4]),
        },
        {
          cursor: 'stale-bad-day',
          node: snapshot(latestTimestamp - 24 * 60 * 60 * 1000, [360, 362, 360, 362]),
        },
        {
          cursor: 'legacy-bad-row',
          node: snapshot(latestTimestamp - 365 * 24 * 60 * 60 * 1000, [458, 588, 458, 588]),
        },
      ],
    }));

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('xor', 'XOR'),
        requestMethod,
        requestSubscription: vi.fn(() => () => undefined),
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();

    expect(requestMethod).toHaveBeenCalledTimes(1);
    expect(chartHarness.chartSources.at(-1)).toEqual([
      [latestTimestamp - 20 * 60 * 1000, 5.1, 5.2, 5, 5.4, 10],
      [latestTimestamp, 5, 5.25, 5, 5.5, 10],
    ]);
  });

  it('renders out-of-order indexer history chronologically without adding candles', async () => {
    const requestMethod = vi.fn(async () => ({
      pageInfo: {
        hasNextPage: false,
        endCursor: undefined,
      },
      edges: [
        {
          cursor: 'middle',
          node: snapshot(1_700_000_300_000, [2, 3, 2, 4]),
        },
        {
          cursor: 'latest',
          node: snapshot(1_700_000_600_000, [1, 2, 1, 3]),
        },
        {
          cursor: 'oldest',
          node: snapshot(1_700_000_000_000, [4, 5, 4, 6]),
        },
      ],
    }));

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('xor', 'XOR'),
        requestMethod,
        requestSubscription: vi.fn(() => () => undefined),
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();

    expect(requestMethod).toHaveBeenCalledTimes(1);
    expect(chartHarness.chartSources.at(-1)).toEqual([
      [1_700_000_000_000, 4, 5, 4, 6, 10],
      [1_700_000_300_000, 2, 3, 2, 4, 10],
      [1_700_000_600_000, 1, 2, 1, 3, 10],
    ]);
  });

  it('drops history rows with non-finite timestamps before rendering chart data', async () => {
    const requestMethod = vi.fn(async () => ({
      pageInfo: {
        hasNextPage: false,
        endCursor: undefined,
      },
      edges: [
        {
          cursor: 'invalid-nan',
          node: snapshot(Number.NaN, [90, 91, 89, 92]),
        },
        {
          cursor: 'invalid-infinity',
          node: snapshot(Number.POSITIVE_INFINITY, [80, 81, 79, 82]),
        },
        {
          cursor: 'valid',
          node: snapshot(1_700_000_000_000, [1, 2, 1, 3]),
        },
      ],
    }));

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('xor', 'XOR'),
        requestMethod,
        requestSubscription: vi.fn(() => () => undefined),
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();

    expect(requestMethod).toHaveBeenCalledTimes(1);
    expect(chartHarness.chartSources.at(-1)).toEqual([[1_700_000_000_000, 1, 2, 1, 3, 10]]);
  });

  it('groups sparse real snapshots without filling empty filter buckets', async () => {
    const fiveMinutes = 5 * 60 * 1000;
    const thirtyMinutes = 6 * fiveMinutes;
    const baseTimestamp = Date.UTC(2026, 0, 1, 9, 0, 0);
    const requestMethod = vi.fn(async () => ({
      pageInfo: {
        hasNextPage: false,
        endCursor: undefined,
      },
      edges: [
        {
          cursor: 'latest',
          node: snapshot(baseTimestamp + 2 * thirtyMinutes, [20, 21, 19, 22]),
        },
        {
          cursor: 'same-bucket-newer',
          node: snapshot(baseTimestamp + fiveMinutes, [12, 11, 8, 14]),
        },
        {
          cursor: 'same-bucket-older',
          node: snapshot(baseTimestamp, [10, 12, 9, 13]),
        },
      ],
    }));

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('xor', 'XOR'),
        requestMethod,
        requestSubscription: vi.fn(() => () => undefined),
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();
    await selectFilterByLabel(wrapper, '30M');

    expect(requestMethod).toHaveBeenCalledTimes(1);
    expect(chartHarness.chartSources.at(-1)).toEqual([
      [baseTimestamp, 10, 11, 8, 14, 20],
      [baseTimestamp + 2 * thirtyMinutes, 20, 21, 19, 22, 10],
    ]);
  });

  it('drops pair candles when the quote side returns zero prices', async () => {
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
              ? snapshot(1_700_000_000_000, [10, 20, 5, 30])
              : snapshot(1_700_000_000_000, [0, 0, 0, 0]),
        },
      ],
    }));

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
    expect(chartHarness.chartSources.at(-1)).toEqual([]);
  });

  it('drops pair candles when base and quote snapshots have different timestamps', async () => {
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
              ? snapshot(1_700_000_000_000, [10, 20, 5, 30])
              : snapshot(1_700_000_300_000, [1, 2, 1, 3]),
        },
      ],
    }));

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
    expect(chartHarness.chartSources.at(-1)).toEqual([]);
  });

  it('truncates an oversized indexer page to the requested filter count', async () => {
    const fiveMinutes = 5 * 60 * 1000;
    const latestTimestamp = 1_700_000_000_000;
    const requestMethod = vi.fn(async () => ({
      pageInfo: {
        hasNextPage: false,
        endCursor: undefined,
      },
      edges: Array.from({ length: 60 }, (_, index) => ({
        cursor: `oversized-${index}`,
        node: snapshot(latestTimestamp - index * fiveMinutes, [index + 1, index + 2, index, index + 3]),
      })),
    }));

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('xor', 'XOR'),
        requestMethod,
        requestSubscription: vi.fn(() => () => undefined),
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();

    const source = chartHarness.chartSources.at(-1);

    expect(requestMethod).toHaveBeenCalledWith('xor', 'DEFAULT', 48, undefined);
    expect(source).toHaveLength(48);
    expect(source?.[0]).toEqual([latestTimestamp - 47 * fiveMinutes, 48, 49, 47, 50, 10]);
    expect(source?.at(-1)).toEqual([latestTimestamp, 1, 2, 0, 3, 10]);
  });

  it('stops paginating when the indexer reports an empty page with a next cursor', async () => {
    const requestMethod = vi.fn(async () => ({
      pageInfo: {
        hasNextPage: true,
        endCursor: 'empty-cursor',
      },
      edges: [],
    }));

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('xor', 'XOR'),
        requestMethod,
        requestSubscription: vi.fn(() => () => undefined),
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();

    expect(requestMethod).toHaveBeenCalledTimes(1);
    expect(chartHarness.skeletonEmptyStates.at(-1)).toBe(true);
    expect(chartHarness.chartSources.at(-1)).toEqual([]);
  });

  it('stops paginating when the indexer reports more pages without a cursor', async () => {
    const requestMethod = vi.fn(async () => ({
      pageInfo: {
        hasNextPage: true,
        endCursor: undefined,
      },
      edges: [
        {
          cursor: 'first-page-only',
          node: snapshot(1_700_000_000_000, [1, 2, 1, 3]),
        },
      ],
    }));

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('xor', 'XOR'),
        requestMethod,
        requestSubscription: vi.fn(() => () => undefined),
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();

    expect(requestMethod).toHaveBeenCalledTimes(1);
    expect(chartHarness.skeletonEmptyStates.at(-1)).toBe(false);
    expect(chartHarness.chartSources.at(-1)).toEqual([[1_700_000_000_000, 1, 2, 1, 3, 10]]);
  });

  it('stops paginating when the indexer repeats a non-advancing cursor', async () => {
    const fiveMinutes = 5 * 60 * 1000;
    const latestTimestamp = 1_700_000_000_000;
    const requestMethod = vi.fn(async (_entityId: string, _type: string, first: number, cursor?: string) => ({
      pageInfo: {
        hasNextPage: true,
        endCursor: 'stuck-cursor',
      },
      edges: Array.from({ length: first }, (_, index) => ({
        cursor: `${cursor ?? 'initial'}-${index}`,
        node: snapshot(latestTimestamp - index * fiveMinutes, [index + 1, index + 2, index, index + 3]),
      })),
    }));

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('xor', 'XOR'),
        requestMethod,
        requestSubscription: vi.fn(() => () => undefined),
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();
    await selectFilterByLabel(wrapper, '30M');

    expect(requestMethod).toHaveBeenCalledTimes(2);
    expect(requestMethod).toHaveBeenNthCalledWith(1, 'xor', 'DEFAULT', 48, undefined);
    expect(requestMethod).toHaveBeenNthCalledWith(2, 'xor', 'DEFAULT', 100, 'stuck-cursor');
  });

  it('marks the chart as errored without retaining fabricated data when the indexer rejects', async () => {
    const requestError = new Error('indexer unavailable');
    const requestMethod = vi.fn(async () => {
      throw requestError;
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('xor', 'XOR'),
        requestMethod,
        requestSubscription: vi.fn(() => () => undefined),
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();

    expect(consoleError).toHaveBeenCalledWith(requestError);
    expect(chartHarness.skeletonErrorStates.at(-1)).toBe(true);
    expect(chartHarness.chartSources.at(-1)).toEqual([]);
  });

  it('ignores stale subscription updates that arrive after the latest candle', async () => {
    const fiveMinutes = 5 * 60 * 1000;
    const latestTimestamp = 1_700_000_000_000;
    let subscriptionCallback: VoidFunction | undefined;
    const requestMethod = vi.fn(async (_entityId: string, _type: string, first: number) => ({
      pageInfo: {
        hasNextPage: false,
        endCursor: undefined,
      },
      edges: [
        {
          cursor: first === 1 ? 'stale-update' : 'initial',
          node:
            first === 1
              ? snapshot(latestTimestamp - fiveMinutes, [90, 91, 89, 92])
              : snapshot(latestTimestamp, [1, 2, 1, 3]),
        },
      ],
    }));
    const requestSubscription = vi.fn((callback: VoidFunction) => {
      subscriptionCallback = callback;
      return () => undefined;
    });

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('xor', 'XOR'),
        requestMethod,
        requestSubscription,
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();
    const initialSource = chartHarness.chartSources.at(-1);

    subscriptionCallback?.();
    await flushPromises();
    await nextTick();

    expect(requestMethod).toHaveBeenCalledWith('xor', 'DEFAULT', 1, undefined);
    expect(chartHarness.chartSources.at(-1)).toEqual(initialSource);
    expect(chartHarness.chartSources.at(-1)).toEqual([[latestTimestamp, 1, 2, 1, 3, 10]]);
  });

  it('ignores all-zero subscription updates instead of appending invalid live candles', async () => {
    const latestTimestamp = 1_700_000_000_000;
    let subscriptionCallback: VoidFunction | undefined;
    const requestMethod = vi.fn(async (_entityId: string, _type: string, first: number) => ({
      pageInfo: {
        hasNextPage: false,
        endCursor: undefined,
      },
      edges: [
        {
          cursor: first === 1 ? 'zero-update' : 'initial',
          node:
            first === 1
              ? snapshot(latestTimestamp + 5 * 60 * 1000, [0, 0, 0, 0])
              : snapshot(latestTimestamp, [1, 2, 1, 3]),
        },
      ],
    }));
    const requestSubscription = vi.fn((callback: VoidFunction) => {
      subscriptionCallback = callback;
      return () => undefined;
    });

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('xor', 'XOR'),
        requestMethod,
        requestSubscription,
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();
    const initialSource = chartHarness.chartSources.at(-1);

    subscriptionCallback?.();
    await flushPromises();
    await nextTick();

    expect(requestMethod).toHaveBeenCalledWith('xor', 'DEFAULT', 1, undefined);
    expect(chartHarness.chartSources.at(-1)).toEqual(initialSource);
    expect(chartHarness.chartSources.at(-1)).toEqual([[latestTimestamp, 1, 2, 1, 3, 10]]);
  });

  it('ignores subscription updates with non-finite timestamps', async () => {
    const latestTimestamp = 1_700_000_000_000;
    let subscriptionCallback: VoidFunction | undefined;
    const requestMethod = vi.fn(async (_entityId: string, _type: string, first: number) => ({
      pageInfo: {
        hasNextPage: false,
        endCursor: undefined,
      },
      edges: [
        {
          cursor: first === 1 ? 'invalid-update' : 'initial',
          node:
            first === 1
              ? snapshot(Number.NaN, [9, 10, 8, 11])
              : snapshot(latestTimestamp, [1, 2, 1, 3]),
        },
      ],
    }));
    const requestSubscription = vi.fn((callback: VoidFunction) => {
      subscriptionCallback = callback;
      return () => undefined;
    });

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('xor', 'XOR'),
        requestMethod,
        requestSubscription,
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();
    const initialSource = chartHarness.chartSources.at(-1);

    subscriptionCallback?.();
    await flushPromises();
    await nextTick();

    expect(requestMethod).toHaveBeenCalledWith('xor', 'DEFAULT', 1, undefined);
    expect(chartHarness.chartSources.at(-1)).toEqual(initialSource);
    expect(chartHarness.chartSources.at(-1)).toEqual([[latestTimestamp, 1, 2, 1, 3, 10]]);
  });

  it('ignores pair subscription updates when one side is missing from the indexer response', async () => {
    const latestTimestamp = 1_700_000_000_000;
    let subscriptionCallback: VoidFunction | undefined;
    const requestMethod = vi.fn(async (entityId: string, _type: string, first: number) => {
      if (first === 1) {
        return {
          pageInfo: {
            hasNextPage: false,
            endCursor: undefined,
          },
          edges:
            entityId === 'base'
              ? [
                  {
                    cursor: 'base-update',
                    node: snapshot(latestTimestamp + 5 * 60 * 1000, [30, 40, 20, 50]),
                  },
                ]
              : [],
        };
      }

      return {
        pageInfo: {
          hasNextPage: false,
          endCursor: undefined,
        },
        edges: [
          {
            cursor: `${entityId}-initial`,
            node:
              entityId === 'base'
                ? snapshot(latestTimestamp, [2, 4, 1, 5])
                : snapshot(latestTimestamp, [1, 2, 1, 2]),
          },
        ],
      };
    });
    const requestSubscription = vi.fn((callback: VoidFunction) => {
      subscriptionCallback = callback;
      return () => undefined;
    });

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('base', 'BASE'),
        quoteAsset: asset('quote', 'QUOTE'),
        isAvailable: true,
        requestMethod,
        requestSubscription,
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();
    const initialSource = chartHarness.chartSources.at(-1);

    subscriptionCallback?.();
    await flushPromises();
    await nextTick();

    expect(requestMethod).toHaveBeenCalledWith('base', 'DEFAULT', 1, undefined);
    expect(requestMethod).toHaveBeenCalledWith('quote', 'DEFAULT', 1, undefined);
    expect(chartHarness.chartSources.at(-1)).toEqual(initialSource);
    expect(chartHarness.chartSources.at(-1)).toEqual([[latestTimestamp, 2, 2, 1, 2.5, 10]]);
  });

  it('ignores pair subscription updates when base and quote timestamps diverge', async () => {
    const latestTimestamp = 1_700_000_000_000;
    let subscriptionCallback: VoidFunction | undefined;
    const requestMethod = vi.fn(async (entityId: string, _type: string, first: number) => {
      if (first === 1) {
        return {
          pageInfo: {
            hasNextPage: false,
            endCursor: undefined,
          },
          edges: [
            {
              cursor: `${entityId}-update`,
              node:
                entityId === 'base'
                  ? snapshot(latestTimestamp + 5 * 60 * 1000, [30, 40, 20, 50])
                  : snapshot(latestTimestamp + 10 * 60 * 1000, [1, 2, 1, 2]),
            },
          ],
        };
      }

      return {
        pageInfo: {
          hasNextPage: false,
          endCursor: undefined,
        },
        edges: [
          {
            cursor: `${entityId}-initial`,
            node:
              entityId === 'base'
                ? snapshot(latestTimestamp, [2, 4, 1, 5])
                : snapshot(latestTimestamp, [1, 2, 1, 2]),
          },
        ],
      };
    });
    const requestSubscription = vi.fn((callback: VoidFunction) => {
      subscriptionCallback = callback;
      return () => undefined;
    });

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('base', 'BASE'),
        quoteAsset: asset('quote', 'QUOTE'),
        isAvailable: true,
        requestMethod,
        requestSubscription,
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();
    const initialSource = chartHarness.chartSources.at(-1);

    subscriptionCallback?.();
    await flushPromises();
    await nextTick();

    expect(requestMethod).toHaveBeenCalledWith('base', 'DEFAULT', 1, undefined);
    expect(requestMethod).toHaveBeenCalledWith('quote', 'DEFAULT', 1, undefined);
    expect(chartHarness.chartSources.at(-1)).toEqual(initialSource);
    expect(chartHarness.chartSources.at(-1)).toEqual([[latestTimestamp, 2, 2, 1, 2.5, 10]]);
  });

  it('does not insert a current bucket before the indexer returns one', async () => {
    const requestMethod = vi.fn(async () => ({
      pageInfo: {
        hasNextPage: false,
        endCursor: undefined,
      },
      edges: [
        {
          cursor: 'latest',
          node: snapshot(1_700_000_000_000, [1, 2, 1, 3]),
        },
      ],
    }));

    const wrapper = mount(PriceChartWidget, {
      props: {
        baseAsset: asset('xor', 'XOR'),
        requestMethod,
        requestSubscription: vi.fn(() => () => undefined),
      },
    });
    wrappers.push(wrapper);

    await flushChartDebounce();
    const initialSource = chartHarness.chartSources.at(-1);

    await vi.advanceTimersByTimeAsync(12_000);
    await flushPromises();
    await nextTick();

    expect(chartHarness.chartSources.at(-1)).toEqual(initialSource);
    expect(chartHarness.chartSources.at(-1)).toEqual([[1_700_000_000_000, 1, 2, 1, 3, 10]]);
  });
});
