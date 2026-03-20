import { bN as SortDirection, aA as watch, a9 as ref, aQ as toValue, h as computed, a4 as onMounted, aB as onBeforeUnmount, b5 as nextTick } from "./index-73GArslZ.js";
const PaginationButton = {
  Prev: "prev",
  Next: "next",
  Last: "last"
};
function useExploreTable(options) {
  const {
    items,
    query,
    filter,
    defaultOrder = SortDirection.DESC,
    defaultProperty = "",
    pageAmount: defaultPageAmount = 10
  } = options;
  const order = ref(defaultOrder);
  const property = ref(defaultProperty);
  const currentPage = ref(1);
  const pageAmount = ref(defaultPageAmount);
  const tableRef = ref(null);
  const teardownScrollSync = ref(null);
  const resolveQuery = () => query ? toValue(query)?.toLowerCase?.().trim?.() ?? "" : "";
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
    const prop = property.value;
    return [...filteredItems.value].sort((a, b) => {
      const aValue = a[prop];
      const bValue = b[prop];
      if (aValue === bValue) return 0;
      return (isAscending ? aValue > bValue : aValue < bValue) ? 1 : -1;
    });
  });
  const total = computed(() => preparedItems.value.length);
  const lastPage = computed(() => total.value ? Math.ceil(total.value / pageAmount.value) : 1);
  const startIndex = computed(() => (currentPage.value - 1) * pageAmount.value);
  const lastIndex = computed(() => currentPage.value * pageAmount.value);
  const tableItems = computed(() => {
    return preparedItems.value.slice(startIndex.value, lastIndex.value);
  });
  watch(
    () => resolveQuery(),
    (newValue, oldValue) => {
      if (oldValue === void 0 || newValue === oldValue) return;
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
  const changeSort = ({ order: newOrder = SortDirection.DESC, property: newProperty = "" } = {}) => {
    order.value = newOrder;
    property.value = newProperty;
  };
  const handleResetSort = () => changeSort();
  const handlePaginationClick = (button) => {
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
    const bodyWrapper = elTable?.$refs?.bodyWrapper;
    const headerWrapper = elTable?.$refs?.headerWrapper;
    if (!bodyWrapper || !headerWrapper) return;
    const syncScroll = () => {
      const scrollLeft = bodyWrapper.scrollLeft;
      headerWrapper.scrollLeft = scrollLeft;
      elTable.scrollPosition = scrollLeft === 0 ? "left" : "right";
    };
    bodyWrapper.addEventListener("scroll", syncScroll, { passive: true });
    syncScroll();
    teardownScrollSync.value = () => {
      bodyWrapper.removeEventListener("scroll", syncScroll);
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
    tableRef,
    isDefaultSort,
    changeSort,
    handleResetSort,
    handlePaginationClick,
    initScrollbarSync
  };
}
export {
  useExploreTable as u
};
