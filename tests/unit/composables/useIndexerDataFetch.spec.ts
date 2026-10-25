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
  debouncedInputHandler: (handler: (...args: unknown[]) => unknown) => vi.fn((...args: unknown[]) => handler(...args)),
}));

type TestItem = {
  id: string;
  timestamp: number;
};

type UseIndexerOptions = Parameters<typeof useIndexerDataFetch<TestItem>>[0];

const createHarness = (overrides: Partial<UseIndexerOptions> = {}) => {
  const requestData = overrides.requestData ?? vi.fn(async () => ({ items: [], totalCount: 0 }));
  const buildDataVariables = vi.fn(({ fetchAmount, fetchPage }) => ({ type: 'page', fetchAmount, fetchPage }));
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

  it('normalizes malformed indexer page data before pagination', async () => {
    const requestData = vi.fn(async () => ({
      items: null,
      totalCount: Number.NaN,
    })) as unknown as UseIndexerOptions['requestData'];
    const { api, wrapper } = createHarness({ requestData });

    await flushPromises();

    expect(api.visibleItems.value).toEqual([]);
    expect(api.total.value).toBe(0);
    expect(api.lastPage.value).toBe(1);

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

  it('ignores an older page response that resolves after the latest request', async () => {
    let resolveFirst!: (value: { items: TestItem[]; totalCount: number }) => void;
    let resolveSecond!: (value: { items: TestItem[]; totalCount: number }) => void;
    const firstResponse = new Promise<{ items: TestItem[]; totalCount: number }>((resolve) => {
      resolveFirst = resolve;
    });
    const secondResponse = new Promise<{ items: TestItem[]; totalCount: number }>((resolve) => {
      resolveSecond = resolve;
    });
    const requestData = vi.fn().mockReturnValueOnce(firstResponse).mockReturnValueOnce(secondResponse);
    const { api, wrapper } = createHarness({ requestData });

    await nextTick();
    expect(requestData).toHaveBeenCalledTimes(1);

    api.currentPage.value = 3;
    await nextTick();
    expect(requestData).toHaveBeenCalledTimes(2);

    resolveSecond({ items: [{ id: 'latest', timestamp: 2_000 }], totalCount: 5 });
    await flushPromises();
    expect(api.visibleItems.value.map(({ id }) => id)).toEqual(['latest']);

    resolveFirst({ items: [{ id: 'stale', timestamp: 1_000 }], totalCount: 2 });
    await flushPromises();
    expect(api.visibleItems.value.map(({ id }) => id)).toEqual(['latest']);
    expect(api.total.value).toBe(5);

    wrapper.unmount();
  });

  it('does not apply a pending response or start polling after unmount', async () => {
    vi.useFakeTimers();

    let resolveRequest!: (value: { items: TestItem[]; totalCount: number }) => void;
    const response = new Promise<{ items: TestItem[]; totalCount: number }>((resolve) => {
      resolveRequest = resolve;
    });
    const requestData = vi.fn().mockReturnValue(response);
    const { api, wrapper } = createHarness({ updateInterval: 25, requestData });

    await nextTick();
    expect(requestData).toHaveBeenCalledOnce();

    wrapper.unmount();
    resolveRequest({ items: [{ id: 'late', timestamp: 2_000 }], totalCount: 1 });
    await flushPromises();
    await vi.advanceTimersByTimeAsync(25);

    expect(api.visibleItems.value).toEqual([]);
    expect(api.total.value).toBe(0);
    expect(requestData).toHaveBeenCalledOnce();
  });

  it('refreshes the authoritative first-page snapshot', async () => {
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
        items: [
          { id: 'new-a', timestamp: 11_000 },
          { id: 'existing-a', timestamp: 10_000 },
          { id: 'existing-b', timestamp: 9_000 },
        ],
        totalCount: 3,
      });
    const { api, buildDataVariables, wrapper } = createHarness({ updateInterval: 50, requestData });

    await flushPromises();

    expect(api.visibleItems.value.map(({ id }) => id)).toEqual(['existing-a', 'existing-b']);

    await vi.advanceTimersByTimeAsync(50);
    await flushPromises();

    expect(buildDataVariables).toHaveBeenLastCalledWith({ fetchAmount: 4, fetchPage: 1 });
    expect(api.total.value).toBe(3);
    expect(api.visibleItems.value.map(({ id }) => id)).toEqual(['new-a', 'existing-a']);

    wrapper.unmount();
  });

  it('discovers the first item after an initially empty history', async () => {
    vi.useFakeTimers();

    const requestData = vi
      .fn()
      .mockResolvedValueOnce({ items: [], totalCount: 0 })
      .mockResolvedValueOnce({ items: [{ id: 'first', timestamp: 1_000 }], totalCount: 1 });
    const { api, wrapper } = createHarness({ updateInterval: 25, requestData });

    await flushPromises();

    expect(api.intervalTimestamp.value).toBe(0);

    await vi.advanceTimersByTimeAsync(25);
    await flushPromises();

    expect(requestData).toHaveBeenCalledTimes(2);
    expect(api.total.value).toBe(1);
    expect(api.visibleItems.value.map(({ id }) => id)).toEqual(['first']);

    wrapper.unmount();
  });

  it('does not overlap slow snapshot polls', async () => {
    vi.useFakeTimers();

    let resolveSnapshot!: (value: { items: TestItem[]; totalCount: number }) => void;
    const snapshot = new Promise<{ items: TestItem[]; totalCount: number }>((resolve) => {
      resolveSnapshot = resolve;
    });
    const requestData = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: 'existing', timestamp: 1_000 }], totalCount: 1 })
      .mockReturnValue(snapshot);
    const { api, wrapper } = createHarness({ updateInterval: 25, requestData });

    await flushPromises();
    await vi.advanceTimersByTimeAsync(75);

    expect(requestData).toHaveBeenCalledTimes(2);

    resolveSnapshot({ items: [{ id: 'latest', timestamp: 2_000 }], totalCount: 1 });
    await flushPromises();

    expect(api.visibleItems.value.map(({ id }) => id)).toEqual(['latest']);
    expect(api.total.value).toBe(1);

    wrapper.unmount();
  });
});
