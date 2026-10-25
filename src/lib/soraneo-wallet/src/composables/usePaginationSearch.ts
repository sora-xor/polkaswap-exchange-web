import { computed, ref } from 'vue';

export function usePaginationSearch() {
  const currentPage = ref(1);
  const pageAmount = ref(10);
  const query = ref('');
  const isLtrDirection = ref(true);

  const startIndex = computed(() => (currentPage.value - 1) * pageAmount.value);
  const lastIndex = computed(() => currentPage.value * pageAmount.value);
  const searchQuery = computed(() => query.value.trim());
  const total = computed(() => 0);
  const lastPage = computed(() => (total.value ? Math.ceil(total.value / pageAmount.value) : 1));
  const directionShift = computed(() => {
    const lastPageAmount = total.value % pageAmount.value || pageAmount.value;
    return isLtrDirection.value ? 0 : pageAmount.value - lastPageAmount;
  });

  const resetPage = (): void => {
    currentPage.value = 1;
  };

  const resetSearch = (): void => {
    query.value = '';
  };

  const sortTransactions = <T extends { startTime?: number | string }>(
    transactions: T[],
    isAscendingOrder = false
  ): T[] => {
    return transactions.sort((a, b) =>
      a.startTime && b.startTime ? (isAscendingOrder ? +b.startTime - +a.startTime : +a.startTime - +b.startTime) : 0
    );
  };

  const getPageItems = <T>(items: T[], customStartIndex?: number, customLastIndex?: number): T[] => {
    return items.slice(customStartIndex ?? startIndex.value, customLastIndex ?? lastIndex.value);
  };

  const handlePrevClick = (current: number): void => {
    currentPage.value = current;
  };

  const handleNextClick = (current: number): void => {
    currentPage.value = current;
  };

  return {
    currentPage,
    pageAmount,
    query,
    isLtrDirection,
    startIndex,
    lastIndex,
    searchQuery,
    total,
    lastPage,
    directionShift,
    resetPage,
    resetSearch,
    sortTransactions,
    getPageItems,
    handlePrevClick,
    handleNextClick,
  };
}
