import isEqual from 'lodash/fp/isEqual';
import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue';

import { PaginationButton } from '@/consts';
import { useLoading } from '@/composables/useLoading';
import { debouncedInputHandler } from '@/utils';

import type { FetchVariables } from '@/types/indexers';
import type { Nullable } from '@/types/common';

type BuildDataVariablesContext = {
  fetchAmount: number;
  fetchPage: number;
};

type UseIndexerDataFetchOptions<T> = {
  parentLoading?: Ref<boolean> | (() => boolean);
  pageAmount?: number;
  fetchAmount?: number;
  updateInterval?: number;
  requestData: (variables: FetchVariables) => Promise<{ items: T[]; totalCount: number }>;
  getItemTimestamp: (item: Nullable<T>) => number;
  buildDataVariables: (context: BuildDataVariablesContext) => FetchVariables;
};

/** Normalizes untrusted indexer pagination totals for safe page arithmetic. */
const normalizeTotalCount = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;

/**
 * Composition-friendly port of `IndexerDataFetchMixin`.
 * Handles page-aware fetching, incremental updates, and loading state coordination.
 */
export function useIndexerDataFetch<T>(options: UseIndexerDataFetchOptions<T>) {
  const loadingApi = useLoading({ parentLoading: options.parentLoading });
  const pageAmount = ref(options.pageAmount ?? 5);
  const fetchAmount = ref(Math.max(options.fetchAmount ?? pageAmount.value, 1));
  const currentPage = ref(1);
  const totalCount = ref(0);
  const items = ref<readonly T[]>(Object.freeze([]));
  const updateInterval = options.updateInterval ?? 24_000;

  const safeFetchAmount = computed(() => Math.max(fetchAmount.value, 1));
  const fetchPage = computed(() =>
    Math.max(Math.ceil((pageAmount.value * currentPage.value) / safeFetchAmount.value), 1)
  );
  const total = computed(() => totalCount.value);
  const lastPage = computed(() => (totalCount.value ? Math.ceil(totalCount.value / pageAmount.value) : 1));
  const visibleItems = computed(() => {
    if (!items.value.length) return [];

    const offset = safeFetchAmount.value * (fetchPage.value - 1);
    const start = pageAmount.value * (currentPage.value - 1) - offset;
    const end = start + pageAmount.value;

    return items.value.slice(Math.max(start, 0), Math.max(end, 0));
  });
  const intervalTimestamp = computed(() => {
    const firstItem = items.value[0] ?? null;
    if (!firstItem) return 0;
    return Math.floor(options.getItemTimestamp(firstItem) / 1000);
  });

  let interval: Nullable<ReturnType<typeof setInterval>> = null;
  let latestDataRequest = 0;
  let snapshotUpdateInFlight = false;
  const updateItems = debouncedInputHandler(
    async (requestId: number) => {
      await updateData(requestId);
    },
    250,
    { leading: false }
  );

  const scheduleDataUpdate = () => {
    const requestId = ++latestDataRequest;
    updateItems(requestId);
  };

  const resetItems = () => {
    items.value = Object.freeze([]);
    totalCount.value = 0;
  };

  const fetchData = async (requestId: number) => {
    await loadingApi.withLoading(async () => {
      await loadingApi.withParentLoading(async () => {
        const variables = options.buildDataVariables({
          fetchAmount: safeFetchAmount.value,
          fetchPage: fetchPage.value,
        });
        const { items: fetchedItems, totalCount: totalItems } = await options.requestData(variables);

        if (requestId !== latestDataRequest) return;

        items.value = Object.freeze(Array.isArray(fetchedItems) ? [...fetchedItems] : []);
        totalCount.value = normalizeTotalCount(totalItems);
      });
    });
  };

  /**
   * Refreshes the authoritative first-page snapshot without overlapping polls.
   * A snapshot avoids timestamp-cursor gaps for empty histories and late items
   * that share the newest indexed second.
   */
  const fetchDataUpdates = async () => {
    if (snapshotUpdateInFlight) return;

    snapshotUpdateInFlight = true;
    const requestId = latestDataRequest;

    try {
      const variables = options.buildDataVariables({
        fetchAmount: safeFetchAmount.value,
        fetchPage: 1,
      });
      const { items: fetchedItems, totalCount: totalItems } = await options.requestData(variables);
      if (requestId !== latestDataRequest) return;

      items.value = Object.freeze(Array.isArray(fetchedItems) ? [...fetchedItems] : []);
      totalCount.value = normalizeTotalCount(totalItems);
    } finally {
      snapshotUpdateInFlight = false;
    }
  };

  const resetDataSubscription = () => {
    if (interval) {
      clearInterval(interval);
    }
    interval = null;
  };

  const subscribeOnData = () => {
    resetDataSubscription();
    if (!updateInterval) return;

    interval = setInterval(() => {
      fetchDataUpdates().catch((error) => console.error(error));
    }, updateInterval);
  };

  const updateData = async (requestId: number) => {
    resetDataSubscription();
    await fetchData(requestId);

    if (requestId !== latestDataRequest) return;

    if (fetchPage.value === 1) {
      subscribeOnData();
    }
  };

  watch(
    fetchPage,
    () => {
      scheduleDataUpdate();
    },
    { immediate: true }
  );

  const checkTriggerUpdate = (current: unknown, previous: unknown) => {
    if (!isEqual(current)(previous)) {
      currentPage.value = 1;
      resetItems();
      scheduleDataUpdate();
    }
  };

  const handlePaginationClick = (button: PaginationButton) => {
    let current = 1;

    switch (button) {
      case PaginationButton.Prev:
        current = currentPage.value - 1;
        break;
      case PaginationButton.Next:
        current = currentPage.value + 1;
        break;
      case PaginationButton.Last:
        current = lastPage.value;
        break;
      default:
        current = 1;
    }

    currentPage.value = current;
  };

  onBeforeUnmount(() => {
    latestDataRequest += 1;
    updateItems.cancel?.();
    resetDataSubscription();
  });

  return {
    loading: loadingApi.loading,
    pageAmount,
    fetchAmount,
    currentPage,
    total,
    lastPage,
    fetchPage,
    visibleItems,
    intervalTimestamp,
    handlePaginationClick,
    checkTriggerUpdate,
  };
}
