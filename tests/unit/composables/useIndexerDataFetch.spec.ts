import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaginationButton } from '@/consts';

vi.mock('@/composables/useLoading', async () => {
  const { ref } = await import('vue');

  return {
    useLoading: () => ({
      loading: ref(false),
      withLoading: async (handler: () => unknown) => handler(),
      withParentLoading: async (handler: () => unknown) => handler(),
    }),
  };
});

vi.mock('@/utils', () => ({
  debouncedInputHandler: (handler: () => unknown) => vi.fn(() => handler()),
}));

type TestItem = {
  id: string;
  timestamp: number;
};

type UseIndexerOptions = Parameters<typeof useIndexerDataFetch<TestItem>>[0];

const createHarness = (overrides: Partial<UseIndexerOptions> = {}) => {
  const requestData = overrides.requestData ?? vi.fn(async () => ({ items: [], totalCount: 0 }));
  const buildDataVariables = vi.fn(({ fetchAmount, fetchPage }) => ({ type: 'page', fetchAmount, fetchPage }));
  const buildUpdateVariables = vi.fn(({ intervalTimestamp }) => ({ type: 'update', intervalTimestamp }));
  let api!: ReturnType<typeof useIndexerDataFetch<TestItem>>;

  const Harness = defineComponent({
    setup() {
      api = useIndexerDataFetch<TestItem>({
        pageAmount: 2,
        fetchAmount: 4,
        updateInterval: 0,
        requestData,
        getItemTimestamp: (item) => item?.timestamp ?? 0,
        buildDataVariables,
        buildUpdateVariables,
        ...overrides,
      });
      return () => null;
    },
  });

  const wrapper = mount(Harness);

  return {
    api,
    wrapper,
    requestData: requestData as ReturnType<typeof vi.fn>,
    buildDataVariables,
    buildUpdateVariables,
  };
};

import { useIndexerDataFetch } from '@/composables/useIndexerDataFetch';

describe('useIndexerDataFetch', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('fetches the first page and exposes page-aware visible items', async () => {
    const initialItems = [
      { id: 'a', timestamp: 4_000 },
      { id: 'b', timestamp: 3_000 },
      { id: 'c', timestamp: 2_000 },
      { id: 'd', timestamp: 1_000 },
    ];
    const requestData = vi.fn(async () => ({ items: initialItems, totalCount: 5 }));
    const { api, buildDataVariables, wrapper } = createHarness({ requestData });

    await flushPromises();

    expect(buildDataVariables).toHaveBeenCalledWith({ fetchAmount: 4, fetchPage: 1 });
    expect(api.total.value).toBe(5);
    expect(api.lastPage.value).toBe(3);
    expect(api.visibleItems.value.map(({ id }) => id)).toEqual(['a', 'b']);
    expect(api.intervalTimestamp.value).toBe(4);

    api.handlePaginationClick(PaginationButton.Next);
    await nextTick();

    expect(api.currentPage.value).toBe(2);
    expect(api.fetchPage.value).toBe(1);
    expect(api.visibleItems.value.map(({ id }) => id)).toEqual(['c', 'd']);

    api.handlePaginationClick(PaginationButton.Last);
    await flushPromises();

    expect(api.currentPage.value).toBe(3);
    expect(api.fetchPage.value).toBe(2);

    wrapper.unmount();
  });

  it('resets pagination and items when watched criteria change', async () => {
    const requestData = vi.fn(async () => ({
      items: [
        { id: 'a', timestamp: 2_000 },
        { id: 'b', timestamp: 1_000 },
      ],
      totalCount: 2,
    }));
    const { api, wrapper } = createHarness({ requestData });

    await flushPromises();

    api.handlePaginationClick(PaginationButton.Next);
    await nextTick();
    api.checkTriggerUpdate({ filter: 'next' }, { filter: 'previous' });

    expect(api.currentPage.value).toBe(1);
    expect(api.total.value).toBe(0);
    expect(api.visibleItems.value).toEqual([]);

    await flushPromises();

    expect(requestData).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it('subscribes to first-page updates and prepends fetched changes', async () => {
    vi.useFakeTimers();

    const requestData = vi
      .fn()
      .mockResolvedValueOnce({
        items: [
          { id: 'existing-a', timestamp: 10_000 },
          { id: 'existing-b', timestamp: 9_000 },
        ],
        totalCount: 2,
      })
      .mockResolvedValueOnce({
        items: [{ id: 'new-a', timestamp: 11_000 }],
        totalCount: 1,
      });
    const { api, buildUpdateVariables, wrapper } = createHarness({ updateInterval: 50, requestData });

    await flushPromises();

    expect(api.visibleItems.value.map(({ id }) => id)).toEqual(['existing-a', 'existing-b']);

    await vi.advanceTimersByTimeAsync(50);
    await flushPromises();

    expect(buildUpdateVariables).toHaveBeenCalledWith({ intervalTimestamp: 10 });
    expect(api.total.value).toBe(3);
    expect(api.visibleItems.value.map(({ id }) => id)).toEqual(['new-a', 'existing-a']);

    wrapper.unmount();
  });

  it('ignores update polling when no timestamp or no update items are available', async () => {
    vi.useFakeTimers();

    const requestData = vi
      .fn()
      .mockResolvedValueOnce({ items: [], totalCount: 0 })
      .mockResolvedValueOnce({ items: [], totalCount: 5 });
    const { api, wrapper } = createHarness({ updateInterval: 25, requestData });

    await flushPromises();

    expect(api.intervalTimestamp.value).toBe(0);

    await vi.advanceTimersByTimeAsync(25);
    await flushPromises();

    expect(requestData).toHaveBeenCalledTimes(1);
    expect(api.total.value).toBe(0);

    wrapper.unmount();
  });
});
