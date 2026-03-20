import { z as defineComponent, aZ as components, u as useTranslation, v as useWalletStore, e as useSettingsStore, U as useLoading, by as debounce, aA as watch, a4 as onMounted, b5 as nextTick, aB as onBeforeUnmount, h as computed, a9 as ref, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, aM as createCommentVNode, bA as withDirectives, D as createBaseVNode, aN as toDisplayString, aj as unref, bB as vShow, am as createBlock, ao as withCtx, ap as createVNode, bb as normalizeClass, a7 as PriceVariant, aO as createTextVNode, aI as WALLET_CONSTS, d as dayjs, F as FPNumber } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { O as OrderStatus } from "./orderBook-BhgledRv.js";
const _hoisted_1 = { class: "s-flex-column order-table__main" };
const _hoisted_2 = {
  key: 0,
  class: "h4 order-table__empty"
};
const _hoisted_3 = { class: "order-table__date" };
const _hoisted_4 = { class: "order-table__pair" };
const _hoisted_5 = { class: "order-table__price" };
const _hoisted_6 = { class: "price" };
const _hoisted_7 = { class: "order-table__amount" };
const _hoisted_8 = { class: "amount" };
const _hoisted_9 = { class: "order-table__date" };
const _hoisted_10 = { class: "order-table__status" };
const _hoisted_11 = { class: "order-table__total" };
const _hoisted_12 = { class: "order-table__pagination" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      HistoryPagination: components.HistoryPagination
    }
  },
  __name: "OrderTable",
  props: {
    orders: { default: () => [] },
    selectable: { type: Boolean, default: false },
    isOpenOrders: { type: Boolean, default: false },
    parentLoading: { type: Boolean, default: false }
  },
  emits: ["select", "cell-click", "selection-change", "page-updated", "sync"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const walletStore = useWalletStore();
    const settingsStore = useSettingsStore();
    const formattedAmount = useFormattedAmount();
    const { loading, withParentLoading } = useLoading({ parentLoading: () => props.parentLoading });
    const tableComponent = ref();
    const teardownScrollSync = ref(null);
    const PriceVariant$1 = PriceVariant;
    const ordersList = computed(() => props.orders ?? []);
    const percentFormat = computed(() => settingsStore.percentFormat ?? null);
    const assetsDataTable = computed(() => walletStore.assetsDataTable ?? {});
    const currentPage = ref(1);
    const pageAmount = ref(10);
    const startIndex = computed(() => (currentPage.value - 1) * pageAmount.value);
    const lastIndex = computed(() => currentPage.value * pageAmount.value);
    const getStatusTranslation = (status) => {
      switch (status) {
        case OrderStatus.Active:
          return t("orderBook.orderStatus.active");
        case OrderStatus.Aligned:
        case OrderStatus.Canceled:
          return t("orderBook.orderStatus.canceled");
        case OrderStatus.Expired:
          return t("orderBook.orderStatus.expired");
        case OrderStatus.Filled:
          return t("orderBook.orderStatus.filled");
        default:
          return t("orderBook.orderStatus.active");
      }
    };
    const preparedItems = computed(
      () => ordersList.value.map((order) => {
        const { originalAmount, amount, price, side, id, orderBookId, time, status, lifespan } = order;
        const { base, quote } = orderBookId;
        const baseAsset = assetsDataTable.value?.[base];
        const quoteAsset = assetsDataTable.value?.[quote];
        const baseAssetSymbol = baseAsset?.symbol;
        const quoteAssetSymbol = quoteAsset?.symbol;
        const pair = `${baseAssetSymbol ?? base}-${quoteAssetSymbol ?? quote}`;
        const created = dayjs(time);
        const expires = dayjs.duration(lifespan);
        const proportion = amount.div(originalAmount);
        const percent = FPNumber.ONE.sub(proportion).toNumber(2);
        const filled = percentFormat.value?.format?.(percent) ?? `${percent * 100}%`;
        const totalFpn = formattedAmount.getFPNumberFiatAmountByFPNumber(originalAmount.mul(price), quoteAsset) ?? FPNumber.ZERO;
        return {
          id,
          orderBookId,
          originalAmount: originalAmount.dp(2),
          amount: originalAmount.sub(amount).dp(2),
          filled,
          baseAssetSymbol,
          quoteAssetSymbol,
          pair,
          price: price.dp(2),
          total: totalFpn.dp(2).toLocaleString(),
          side,
          status: getStatusTranslation(status),
          created: { date: created.format("M/DD"), time: created.format("HH:mm:ss") },
          expires: expires.format("D[D]")
        };
      })
    );
    const tableItems = computed(() => preparedItems.value.slice(startIndex.value, lastIndex.value));
    const total = computed(() => preparedItems.value.length);
    const lastPage = computed(() => total.value ? Math.ceil(total.value / pageAmount.value) : 1);
    const loadingState = computed(() => Boolean(props.parentLoading) || loading.value);
    const shouldEmptyStateBeShown = computed(() => !(loadingState.value || ordersList.value.length));
    const rowKey = computed(() => props.selectable ? "id" : void 0);
    const syncTableItems = async () => {
      if (currentPage.value !== 1 && tableItems.value.length === 0) {
        await handlePagination(WALLET_CONSTS.PaginationButton.Prev);
        return;
      }
      emit("sync", tableItems.value);
    };
    const debouncedSync = debounce(syncTableItems, 250);
    watch(
      tableItems,
      () => {
        debouncedSync();
      },
      { deep: true, immediate: true }
    );
    const initScrollbarSync = () => {
      const elTable = tableComponent.value;
      const elTableBodyWrapper = elTable?.$refs?.bodyWrapper;
      const elTableHeaderWrapper = elTable?.$refs?.headerWrapper;
      if (!elTableBodyWrapper || !elTableHeaderWrapper) return;
      const syncScroll = () => {
        const scrollLeft = elTableBodyWrapper.scrollLeft;
        elTableHeaderWrapper.scrollLeft = scrollLeft;
        elTable.scrollPosition = scrollLeft === 0 ? "left" : "right";
      };
      elTableBodyWrapper.addEventListener("scroll", syncScroll, { passive: true });
      syncScroll();
      teardownScrollSync.value = () => {
        elTableBodyWrapper.removeEventListener("scroll", syncScroll);
      };
    };
    const resetScrollbarSync = () => {
      teardownScrollSync.value?.();
      teardownScrollSync.value = null;
    };
    onMounted(async () => {
      await withParentLoading(async () => {
        await nextTick();
        initScrollbarSync();
      });
    });
    onBeforeUnmount(() => {
      debouncedSync.cancel();
      resetScrollbarSync();
    });
    const getString = (value) => value.toLocaleString();
    const handleSelect = (rows) => {
      if (!props.selectable) return;
      emit("select", rows);
    };
    const handleSelectRow = (row) => {
      if (!props.selectable) return;
      emit("cell-click", row);
    };
    const handleSelectionChange = (rows) => {
      if (!props.selectable) return;
      emit("selection-change", rows);
    };
    const handlePaginationClick = (button) => {
      let nextPage = 1;
      switch (button) {
        case WALLET_CONSTS.PaginationButton.Prev:
          nextPage = currentPage.value - 1;
          break;
        case WALLET_CONSTS.PaginationButton.Next:
          nextPage = currentPage.value + 1;
          break;
        case WALLET_CONSTS.PaginationButton.Last:
          nextPage = lastPage.value;
          break;
        case WALLET_CONSTS.PaginationButton.First:
        default:
          nextPage = 1;
          break;
      }
      currentPage.value = Math.min(Math.max(nextPage, 1), lastPage.value);
    };
    const handlePagination = async (button) => {
      handlePaginationClick(button);
      await nextTick();
      emit("page-updated", currentPage.value, tableItems.value);
    };
    __expose({
      tableComponent,
      tableItems
    });
    return (_ctx, _cache) => {
      const _component_s_table_column = resolveComponent("s-table-column");
      const _component_s_table = resolveComponent("s-table");
      const _component_history_pagination = resolveComponent("history-pagination");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        shouldEmptyStateBeShown.value ? (openBlock(), createElementBlock("span", _hoisted_2, toDisplayString(unref(t)("orderBook.orderTable.noOrders")), 1)) : createCommentVNode("", true),
        withDirectives((openBlock(), createBlock(_component_s_table, {
          class: "order-table",
          ref: "table",
          "row-key": rowKey.value,
          "empty-text": unref(t)("orderBook.orderTable.noOrders"),
          data: tableItems.value,
          "highlight-current-row": false,
          onCellClick: handleSelectRow,
          onSelectionChange: handleSelectionChange,
          onSelect: handleSelect
        }, {
          default: withCtx(() => [
            __props.selectable ? (openBlock(), createBlock(_component_s_table_column, {
              key: 0,
              type: "selection"
            })) : createCommentVNode("", true),
            createVNode(_component_s_table_column, { width: "88" }, {
              header: withCtx(() => [
                createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.orderTable.time")), 1)
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("div", _hoisted_3, [
                  createBaseVNode("div", null, toDisplayString(row.created.date), 1),
                  createBaseVNode("div", null, toDisplayString(row.created.time), 1)
                ])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, { width: "126" }, {
              header: withCtx(() => [
                createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.orderTable.pair")), 1)
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("span", _hoisted_4, toDisplayString(row.pair), 1)
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, { width: "62" }, {
              header: withCtx(() => [
                createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.orderTable.side")), 1)
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("span", {
                  class: normalizeClass(["order-table__side", [{ buy: row.side === unref(PriceVariant$1).Buy }]])
                }, toDisplayString(row.side), 3)
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, { width: "126" }, {
              header: withCtx(() => [
                createBaseVNode("span", null, toDisplayString(unref(t)("priceText")), 1)
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("div", _hoisted_5, [
                  createBaseVNode("span", _hoisted_6, toDisplayString(getString(row.price)), 1),
                  createBaseVNode("span", null, toDisplayString(row.quoteAssetSymbol), 1)
                ])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, { width: "180" }, {
              header: withCtx(() => [
                createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.amount")), 1)
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("div", _hoisted_7, [
                  createBaseVNode("span", _hoisted_8, toDisplayString(getString(row.amount)) + "/" + toDisplayString(getString(row.originalAmount)), 1),
                  createBaseVNode("span", null, toDisplayString(row.baseAssetSymbol), 1)
                ])
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, { width: "84" }, {
              header: withCtx(() => [
                createBaseVNode("span", null, "% " + toDisplayString(unref(t)("orderBook.orderTable.filled")), 1)
              ]),
              default: withCtx(({ row }) => [
                createTextVNode(toDisplayString(row.filled), 1)
              ]),
              _: 1
            }),
            createVNode(_component_s_table_column, { width: "94" }, {
              header: withCtx(() => [
                createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.orderTable.lifetime")), 1)
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("div", _hoisted_9, [
                  createBaseVNode("div", null, toDisplayString(row.expires), 1)
                ])
              ]),
              _: 1
            }),
            !__props.isOpenOrders ? (openBlock(), createBlock(_component_s_table_column, {
              key: 1,
              width: "93"
            }, {
              header: withCtx(() => [
                createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.tradingPair.status")), 1)
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("span", _hoisted_10, toDisplayString(row.status), 1)
              ]),
              _: 1
            })) : createCommentVNode("", true),
            createVNode(_component_s_table_column, null, {
              header: withCtx(() => [
                createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.total")), 1)
              ]),
              default: withCtx(({ row }) => [
                createBaseVNode("span", _hoisted_11, "$" + toDisplayString(row.total), 1)
              ]),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["row-key", "empty-text", "data"])), [
          [
            vShow,
            !shouldEmptyStateBeShown.value
            /* v-show cuz SScrollbar is set during the mounting */
          ],
          [_directive_loading, loadingState.value]
        ]),
        createBaseVNode("div", _hoisted_12, [
          total.value ? (openBlock(), createBlock(_component_history_pagination, {
            key: 0,
            "current-page": currentPage.value,
            "page-amount": pageAmount.value,
            total: total.value,
            "last-page": lastPage.value,
            loading: loadingState.value,
            onPaginationClick: handlePagination
          }, null, 8, ["current-page", "page-amount", "total", "last-page", "loading"])) : createCommentVNode("", true)
        ])
      ]);
    };
  }
});
export {
  _sfc_main as _
};
