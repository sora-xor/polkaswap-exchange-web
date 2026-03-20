import { z as defineComponent, aZ as components, u as useTranslation, U as useLoading, aA as watch, aB as onBeforeUnmount, h as computed, am as createBlock, C as openBlock, a9 as ref, aa as OrderBookStatus, bC as waitUntil } from "./index-73GArslZ.js";
import { u as useOrderBookUserOrders } from "./useOrderBookUserOrders-B0IscmbH.js";
import { _ as _sfc_main$1 } from "./OrderTable.vue_vue_type_style_index_0_lang-Bu4g82aO.js";
import "./index-BDxnS5Vu.js";
import "./useFormattedAmount-D-xkdlPs.js";
import "./orderBook-BhgledRv.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      OrderTable: _sfc_main$1,
      HistoryPagination: components.HistoryPagination
    }
  },
  __name: "OpenOrders",
  props: {
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    useTranslation();
    const { loading, withLoading } = useLoading({ parentLoading: () => props.parentLoading });
    const orderTable = ref();
    const {
      userLimitOrders,
      currentOrderBook,
      ordersToBeCancelled,
      subscribeOnLimitOrders,
      resetPagedUserLimitOrdersSubscription,
      setOrdersToBeCancelled
    } = useOrderBookUserOrders();
    const loadingState = computed(() => Boolean(props.parentLoading) || loading.value);
    const isSelectionAllowed = computed(
      () => !!currentOrderBook.value && currentOrderBook.value.status !== OrderBookStatus.Stop
    );
    const sortedUserLimitOrders = computed(() => [...userLimitOrders.value].sort((a, b) => b.time - a.time));
    const currentPage = ref(1);
    const tableItems = ref([]);
    const selectedPageItemIds = ref([]);
    const needToUpdateSelection = ref(false);
    const syncTableItemsRefreshing = ref(false);
    const ordersToBeCancelledIds = computed(() => ordersToBeCancelled.value.map(({ id }) => id));
    const restoreSelectedData = () => {
      const pageItems = tableItems.value.filter(({ id }) => ordersToBeCancelledIds.value.includes(id));
      pageItems.forEach((row) => {
        orderTable.value?.tableComponent?.toggleRowSelection?.(row, true);
      });
      selectedPageItemIds.value = pageItems.map(({ id }) => id);
    };
    const handlePagination = async (page, items) => {
      await withLoading(async () => {
        const list = items ?? tableItems.value;
        currentPage.value = page;
        resetPagedUserLimitOrdersSubscription();
        if (list.length) {
          await subscribeOnLimitOrders(list.map(({ id }) => id));
        }
      });
    };
    const handleSelect = () => {
      needToUpdateSelection.value = true;
    };
    const handleSelectRow = (row) => {
      if (!isSelectionAllowed.value) return;
      needToUpdateSelection.value = true;
      orderTable.value?.tableComponent?.toggleRowSelection?.(row);
    };
    const handleSelectionChange = (rows) => {
      if (!(isSelectionAllowed.value && needToUpdateSelection.value)) return;
      const diff = selectedPageItemIds.value.length - rows.length;
      if (diff === 1) {
        const rowIds = rows.map(({ id }) => id);
        const clickedRowId = selectedPageItemIds.value.find((id) => !rowIds.includes(id));
        if (clickedRowId) {
          setOrdersToBeCancelled(ordersToBeCancelled.value.filter(({ id }) => id !== clickedRowId));
        }
      } else if (diff === -1) {
        const clickedRow = rows.find(({ id }) => !selectedPageItemIds.value.includes(id));
        if (clickedRow) {
          setOrdersToBeCancelled([...ordersToBeCancelled.value, clickedRow]);
        }
      }
      selectedPageItemIds.value = rows.map(({ id }) => id);
      needToUpdateSelection.value = false;
    };
    const syncTableItems = (items) => {
      tableItems.value = items;
      syncTableItemsRefreshing.value = false;
      restoreSelectedData();
    };
    watch(
      sortedUserLimitOrders,
      async (next, prev) => {
        if (!next?.length || next.length === prev?.length) {
          return;
        }
        syncTableItemsRefreshing.value = true;
        await waitUntil(() => !syncTableItemsRefreshing.value);
        if (ordersToBeCancelledIds.value.length) {
          const stillRemain = tableItems.value.filter(({ id }) => ordersToBeCancelledIds.value.includes(id));
          setOrdersToBeCancelled(stillRemain);
        }
        await handlePagination(currentPage.value);
      },
      { deep: true, immediate: true }
    );
    onBeforeUnmount(() => {
      if (isSelectionAllowed.value) {
        setOrdersToBeCancelled([]);
      }
      resetPagedUserLimitOrdersSubscription();
    });
    __expose({
      handlePagination
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(_sfc_main$1, {
        ref_key: "orderTable",
        ref: orderTable,
        "is-open-orders": "",
        orders: sortedUserLimitOrders.value,
        selectable: isSelectionAllowed.value,
        "parent-loading": loadingState.value,
        onCellClick: handleSelectRow,
        onSelectionChange: handleSelectionChange,
        onSelect: handleSelect,
        onPageUpdated: handlePagination,
        onSync: syncTableItems
      }, null, 8, ["orders", "selectable", "parent-loading"]);
    };
  }
});
export {
  _sfc_main as default
};
