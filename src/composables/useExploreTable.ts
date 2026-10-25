import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';

import { SortDirection } from '@soramitsu-ui/ui/types';
import { PaginationButton, type PaginationButtonValue } from '@/consts/pagination';
import type { FnWithoutArgs, Nullable } from '@/types/common';

type FilterFn<T> = (items: readonly T[], search: string) => readonly T[];

type UseExploreTableOptions<T> = {
  items: ComputedRef<readonly T[]>;
  query?: MaybeRefOrGetter<string>;
  filter?: FilterFn<T>;
  defaultOrder?: SortDirection | '';
  defaultProperty?: string;
  pageAmount?: number;
};

/**
 * Reusable replacement for the legacy Explore/Scrollable mixins.
 * Handles filtering, sorting, pagination, and scroll-sync for Sora explore tables.
 */
export function useExploreTable<T>(options: UseExploreTableOptions<T>) {
  const {
    items,
    query,
    filter,
    defaultOrder = SortDirection.DESC,
    defaultProperty = '',
    pageAmount: defaultPageAmount = 10,
  } = options;

  const order = ref<SortDirection | ''>(defaultOrder);
  const property = ref<string>(defaultProperty);
  const currentPage = ref(1);
  const pageAmount = ref(defaultPageAmount);
  const tableRef = ref<any>(null);
  const teardownScrollSync = ref<Nullable<FnWithoutArgs>>(null);

  const resolveQuery = () => (query ? (toValue(query)?.toLowerCase?.().trim?.() ?? '') : '');

  const filteredItems = computed(() => {
    const search = resolveQuery();
    if (!search) return items.value;
    if (!filter) return items.value;
    return filter(items.value, search);
  });

  const isDefaultSort = computed(() => !(order.value && property.value));

  const preparedItems = computed(() => {
    if (isDefaultSort.value) return filteredItems.value;

    const isAscending = order.value === SortDirection.ASC;
    const prop = property.value as keyof T;

    return [...filteredItems.value].sort((a, b) => {
      const aValue = (a as any)[prop];
      const bValue = (b as any)[prop];

      if (aValue === bValue) return 0;

      return (isAscending ? aValue > bValue : aValue < bValue) ? 1 : -1;
    });
  });

  const total = computed(() => preparedItems.value.length);
  const lastPage = computed(() => (total.value ? Math.ceil(total.value / pageAmount.value) : 1));
  const startIndex = computed(() => (currentPage.value - 1) * pageAmount.value);

  const lastIndex = computed(() => currentPage.value * pageAmount.value);

  const tableItems = computed(() => {
    return preparedItems.value.slice(startIndex.value, lastIndex.value);
  });

  watch(
    () => resolveQuery(),
    (newValue, oldValue) => {
      if (oldValue === undefined || newValue === oldValue) return;
      currentPage.value = 1;
    }
  );

  watch(total, () => {
    if (!total.value) {
      currentPage.value = 1;
      return;
    }

    if (currentPage.value > lastPage.value) {
      currentPage.value = lastPage.value;
    }
  });

  const changeSort = ({ order: newOrder = SortDirection.DESC, property: newProperty = '' } = {}) => {
    order.value = newOrder;
    property.value = newProperty;
  };

  const handleResetSort = () => changeSort();

  const handlePaginationClick = (button: PaginationButtonValue | string) => {
    switch (button) {
      case PaginationButton.Prev:
        currentPage.value = Math.max(currentPage.value - 1, 1);
        break;
      case PaginationButton.Next:
        currentPage.value = Math.min(currentPage.value + 1, lastPage.value);
        break;
      case PaginationButton.Last:
        currentPage.value = lastPage.value;
        break;
      default:
        currentPage.value = 1;
    }
  };

  const initScrollbarSync = () => {
    teardownScrollSync.value?.();

    const tableComponent = tableRef.value;
    const elTable = tableComponent?.$refs?.table;
    const bodyWrapper = elTable?.$refs?.bodyWrapper as HTMLElement | undefined;
    const headerWrapper = elTable?.$refs?.headerWrapper as HTMLElement | undefined;

    if (!bodyWrapper || !headerWrapper) return;

    const syncScroll = () => {
      const scrollLeft = bodyWrapper.scrollLeft;
      headerWrapper.scrollLeft = scrollLeft;
      elTable.scrollPosition = scrollLeft === 0 ? 'left' : 'right';
    };

    bodyWrapper.addEventListener('scroll', syncScroll, { passive: true });
    syncScroll();

    teardownScrollSync.value = () => {
      bodyWrapper.removeEventListener('scroll', syncScroll);
    };
  };

  const refreshScrollSync = () => {
    nextTick().then(() => initScrollbarSync());
  };

  onMounted(refreshScrollSync);
  watch(tableItems, refreshScrollSync);

  onBeforeUnmount(() => {
    teardownScrollSync.value?.();
    teardownScrollSync.value = null;
  });

  return {
    order,
    property,
    currentPage,
    pageAmount,
    total,
    lastPage,
    startIndex,
    tableItems,
    tableRef: tableRef as Ref<any>,
    isDefaultSort,
    changeSort,
    handleResetSort,
    handlePaginationClick,
    initScrollbarSync,
  };
}
