import { WALLET_CONSTS } from '@wallet';
import isEqual from 'lodash/fp/isEqual';
import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue';

import { useLoading } from '@/composables/useLoading';
import { debouncedInputHandler } from '@/utils';

import type { FetchVariables } from '@/types/indexers';
import type { Nullable } from '@/types/common';

type BuildDataVariablesContext = {
  fetchAmount: number;
  fetchPage: number;
};

type BuildUpdateVariablesContext = {
  intervalTimestamp: number;
};

type UseIndexerDataFetchOptions<T> = {
  parentLoading?: Ref<boolean> | (() => boolean);
  pageAmount?: number;
  fetchAmount?: number;
  updateInterval?: number;
  requestData: (variables: FetchVariables) => Promise<{ items: T[]; totalCount: number }>;
  getItemTimestamp: (item: Nullable<T>) => number;
  buildDataVariables: (context: BuildDataVariablesContext) => FetchVariables;
  buildUpdateVariables: (context: BuildUpdateVariablesContext) => FetchVariables;
};

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
  const updateItems = debouncedInputHandler(
    async () => {
      await updateData();
    },
    250,
    { leading: false }
  );

  const resetItems = () => {
    items.value = Object.freeze([]);
    totalCount.value = 0;
  };

  const fetchData = async () => {
    await loadingApi.withLoading(async () => {
      await loadingApi.withParentLoading(async () => {
        const variables = options.buildDataVariables({
          fetchAmount: safeFetchAmount.value,
          fetchPage: fetchPage.value,
        });
        const { items: fetchedItems, totalCount: totalItems } = await options.requestData(variables);
        items.value = Object.freeze([...fetchedItems]);
        totalCount.value = totalItems;
      });
    });
  };

  const fetchDataUpdates = async () => {
    if (!intervalTimestamp.value) return;

    const variables = options.buildUpdateVariables({ intervalTimestamp: intervalTimestamp.value });
    const { items: fetchedItems, totalCount: totalItems } = await options.requestData(variables);
    if (!fetchedItems.length) return;

    items.value = Object.freeze([...fetchedItems, ...items.value].slice(0, safeFetchAmount.value));
    totalCount.value = totalCount.value + totalItems;
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

  const updateData = async () => {
    resetDataSubscription();
    await fetchData();

    if (fetchPage.value === 1) {
      subscribeOnData();
    }
  };

  watch(
    fetchPage,
    () => {
      updateItems();
    },
    { immediate: true }
  );

  const checkTriggerUpdate = (current: unknown, previous: unknown) => {
    if (!isEqual(current)(previous)) {
      currentPage.value = 1;
      resetItems();
      updateItems();
    }
  };

  const handlePaginationClick = (button: WALLET_CONSTS.PaginationButton) => {
    let current = 1;

    switch (button) {
      case WALLET_CONSTS.PaginationButton.Prev:
        current = currentPage.value - 1;
        break;
      case WALLET_CONSTS.PaginationButton.Next:
        current = currentPage.value + 1;
        break;
      case WALLET_CONSTS.PaginationButton.Last:
        current = lastPage.value;
        break;
      default:
        current = 1;
    }

    currentPage.value = current;
  };

  onBeforeUnmount(() => {
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
