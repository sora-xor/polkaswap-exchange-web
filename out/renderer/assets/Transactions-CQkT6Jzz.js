import { U as useLoading, cm as debouncedInputHandler, aA as watch, aB as onBeforeUnmount, h as computed, a9 as ref, bJ as isEqual, aI as WALLET_CONSTS, a4 as onMounted, b5 as nextTick, aQ as toValue, z as defineComponent, aZ as components, ak as lazyComponent, u as useTranslation, O as Operation, d as dayjs, a_ as resolveComponent, bz as resolveDirective, am as createBlock, C as openBlock, ao as withCtx, bA as withDirectives, ap as createVNode, D as createBaseVNode, aN as toDisplayString, aj as unref, aM as createCommentVNode, aq as withModifiers, ar as isRef, as as mergeProps, al as Components, aF as getCurrentIndexer, cD as showMostFittingValue, F as FPNumber, y as soraExplorerLinks, s as store, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useWidgetTokenSelect } from "./useWidgetTokenSelect-CzOdir7j.js";
function useIndexerDataFetch(options) {
  const loadingApi = useLoading({ parentLoading: options.parentLoading });
  const pageAmount = ref(options.pageAmount ?? 5);
  const fetchAmount = ref(Math.max(options.fetchAmount ?? pageAmount.value, 1));
  const currentPage = ref(1);
  const totalCount = ref(0);
  const items = ref(Object.freeze([]));
  const updateInterval = options.updateInterval ?? 24e3;
  const safeFetchAmount = computed(() => Math.max(fetchAmount.value, 1));
  const fetchPage = computed(
    () => Math.max(Math.ceil(pageAmount.value * currentPage.value / safeFetchAmount.value), 1)
  );
  const total = computed(() => totalCount.value);
  const lastPage = computed(() => totalCount.value ? Math.ceil(totalCount.value / pageAmount.value) : 1);
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
    return Math.floor(options.getItemTimestamp(firstItem) / 1e3);
  });
  let interval = null;
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
          fetchPage: fetchPage.value
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
  const checkTriggerUpdate = (current, previous) => {
    if (!isEqual(current)(previous)) {
      currentPage.value = 1;
      resetItems();
      updateItems();
    }
  };
  const handlePaginationClick = (button) => {
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
    checkTriggerUpdate
  };
}
function useScrollableTable(options) {
  const tableRef = ref(null);
  const teardownScrollSync = ref(null);
  const resetScrollbarSync = () => {
    teardownScrollSync.value?.();
    teardownScrollSync.value = null;
  };
  const initScrollbarSync = () => {
    resetScrollbarSync();
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
  const refreshScrollbarSync = () => {
    nextTick().then(() => initScrollbarSync());
  };
  onMounted(refreshScrollbarSync);
  watch(
    () => toValue(options.tableItems),
    () => refreshScrollbarSync()
  );
  onBeforeUnmount(() => resetScrollbarSync());
  return {
    tableRef,
    initScrollbarSync
  };
}
const _hoisted_1 = { class: "explore-table-item-date" };
const _hoisted_2 = { class: "explore-table-cell" };
const _hoisted_3 = { class: "explore-table-item-token" };
const _hoisted_4 = { class: "explore-table-cell" };
const _hoisted_5 = { class: "explore-table-item-token" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "SwapTransactionsWidget",
    components: {
      BaseWidget: lazyComponent(Components.BaseWidget),
      LinksDropdown: lazyComponent(Components.LinksDropdown),
      TokenSelectButton: lazyComponent(Components.TokenSelectButton),
      SelectToken: lazyComponent(Components.SelectToken),
      TokenLogo: components.TokenLogo,
      FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
      FormattedAddress: components.FormattedAddress,
      HistoryPagination: components.HistoryPagination
    }
  },
  __name: "Transactions",
  props: {
    predefinedToken: { default: null }
  },
  setup(__props) {
    const props = __props;
    const predefinedToken = computed(() => props.predefinedToken);
    const { t, tc } = useTranslation();
    const soraNetwork = computed(() => store.state?.wallet?.settings?.soraNetwork);
    const assetsDataTable = computed(
      () => store.getters?.wallet?.account?.assetsDataTable ?? {}
    );
    const FontSizeRate = WALLET_CONSTS.FontSizeRate;
    const operations = [Operation.Swap];
    const fromTimestamp = dayjs().subtract(1, "week").startOf("day").unix();
    let indexerLoadingRef = null;
    let parseHistoryWarningShown = false;
    const {
      selectedToken,
      areActionsDisabled,
      selectTokenIcon,
      tokenTabIndex,
      showSelectTokenDialog,
      handleSelectToken,
      changeToken
    } = useWidgetTokenSelect({
      predefinedToken,
      loading: () => indexerLoadingRef?.value ?? false
    });
    const createFilter = (timestamp) => {
      const indexer = getCurrentIndexer();
      const assetAddress = selectedToken.value?.address;
      return indexer.historyElementsFilter({
        operations,
        assetAddress,
        timestamp
      });
    };
    const requestHistoryData = async (variables) => {
      const indexer = getCurrentIndexer();
      const response = await indexer.services.explorer.account.getHistory(variables);
      if (!response)
        return {
          items: [],
          totalCount: 0
        };
      const { nodes, totalCount } = response;
      const parsedItems = [];
      for (const node of nodes) {
        let historyItem = null;
        try {
          historyItem = await indexer.services.dataParser.parseTransactionAsHistoryItem(node);
        } catch (error) {
          if (!parseHistoryWarningShown) {
            parseHistoryWarningShown = true;
            console.warn("[swap-transactions] failed to parse one or more history items", error);
          }
          continue;
        }
        if (historyItem) {
          parsedItems.push(historyItem);
        }
      }
      return { items: parsedItems, totalCount };
    };
    const { loading, pageAmount, currentPage, total, lastPage, visibleItems, handlePaginationClick, checkTriggerUpdate } = useIndexerDataFetch({
      fetchAmount: 100,
      pageAmount: 5,
      requestData: requestHistoryData,
      getItemTimestamp: (item) => item?.startTime ?? 0,
      buildDataVariables: ({ fetchAmount, fetchPage }) => ({
        filter: createFilter(fromTimestamp),
        first: fetchAmount,
        offset: fetchAmount * (fetchPage - 1)
      }),
      buildUpdateVariables: ({ intervalTimestamp }) => ({
        filter: createFilter(intervalTimestamp)
      })
    });
    indexerLoadingRef = loading;
    const tableItems = computed(
      () => visibleItems.value.map((item) => {
        const txId = item.id ?? "";
        const blockId = item.blockId ?? "";
        const address = item.from ?? "";
        const inputAsset = item.assetAddress ? assetsDataTable.value[item.assetAddress] : null;
        const inputAssetSymbol = inputAsset?.symbol || item.symbol || "??";
        const outputAsset = item.asset2Address ? assetsDataTable.value[item.asset2Address] : null;
        const outputAssetSymbol = outputAsset?.symbol || item.symbol2 || "??";
        const inputAmount = showMostFittingValue(new FPNumber(item.amount ?? 0));
        const inputAmountUSD = new FPNumber(item.payload.amountUSD ?? 0).toLocaleString();
        const outputAmount = showMostFittingValue(new FPNumber(item.amount2 ?? 0));
        const outputAmountUSD = new FPNumber(item.payload.amount2USD ?? 0).toLocaleString();
        const date = dayjs(item.startTime);
        const links = soraExplorerLinks(soraNetwork.value, txId, blockId);
        return {
          address,
          inputAsset,
          inputAssetSymbol,
          outputAsset,
          outputAssetSymbol,
          inputAmount,
          inputAmountUSD,
          outputAmount,
          outputAmountUSD,
          datetime: { date: date.format("M/DD"), time: date.format("HH:mm:ss") },
          links
        };
      })
    );
    const { tableRef } = useScrollableTable({ tableItems });
    const assetsAddresses = computed(() => {
      const token = selectedToken.value;
      return token ? [token.address] : [];
    });
    watch(
      assetsAddresses,
      (current, previous) => {
        checkTriggerUpdate(current, previous);
      },
      { immediate: true }
    );
    return (_ctx, _cache) => {
      const _component_token_select_button = resolveComponent("token-select-button");
      const _component_select_token = resolveComponent("select-token");
      const _component_s_table_column = resolveComponent("s-table-column");
      const _component_formatted_amount_with_fiat_value = resolveComponent("formatted-amount-with-fiat-value");
      const _component_token_logo = resolveComponent("token-logo");
      const _component_formatted_address = resolveComponent("formatted-address");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_links_dropdown = resolveComponent("links-dropdown");
      const _component_s_table = resolveComponent("s-table");
      const _component_history_pagination = resolveComponent("history-pagination");
      const _component_base_widget = resolveComponent("base-widget");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createBlock(_component_base_widget, mergeProps(_ctx.$attrs, {
        title: unref(tc)("transactionText", 2),
        class: "swap-transactions-widget"
      }), {
        types: withCtx(() => [
          createVNode(_component_token_select_button, {
            icon: unref(selectTokenIcon),
            token: unref(selectedToken),
            tabindex: unref(tokenTabIndex),
            disabled: unref(areActionsDisabled),
            onClick: withModifiers(unref(handleSelectToken), ["stop"])
          }, null, 8, ["icon", "token", "tabindex", "disabled", "onClick"]),
          !predefinedToken.value ? (openBlock(), createBlock(_component_select_token, {
            key: 0,
            "disabled-custom": "",
            visible: unref(showSelectTokenDialog),
            "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isRef(showSelectTokenDialog) ? showSelectTokenDialog.value = $event : null),
            asset: unref(selectedToken),
            onSelect: unref(changeToken)
          }, null, 8, ["visible", "asset", "onSelect"])) : createCommentVNode("", true)
        ]),
        default: withCtx(() => [
          withDirectives((openBlock(), createBlock(_component_s_table, {
            ref_key: "tableRef",
            ref: tableRef,
            data: tableItems.value,
            "highlight-current-row": false,
            size: "small",
            class: "explore-table"
          }, {
            default: withCtx(() => [
              createVNode(_component_s_table_column, { width: "74" }, {
                header: withCtx(() => [
                  createBaseVNode("span", null, toDisplayString(unref(t)("transaction.startTime")), 1)
                ]),
                default: withCtx(({ row }) => [
                  createBaseVNode("div", _hoisted_1, [
                    createBaseVNode("div", null, toDisplayString(row.datetime.date), 1),
                    createBaseVNode("div", null, toDisplayString(row.datetime.time), 1)
                  ])
                ]),
                _: 1
              }),
              createVNode(_component_s_table_column, {
                "header-align": "right",
                align: "right"
              }, {
                header: withCtx(() => [
                  createBaseVNode("span", null, toDisplayString(unref(t)("removeLiquidity.input")), 1)
                ]),
                default: withCtx(({ row }) => [
                  createVNode(_component_formatted_amount_with_fiat_value, {
                    class: "explore-table-item-token tx-amount",
                    "font-size-rate": unref(FontSizeRate).SMALL,
                    value: row.inputAmount,
                    "fiat-value": row.inputAmountUSD
                  }, null, 8, ["font-size-rate", "value", "fiat-value"])
                ]),
                _: 1
              }),
              createVNode(_component_s_table_column, {
                "header-align": "left",
                align: "left"
              }, {
                header: withCtx(() => [
                  createBaseVNode("span", null, toDisplayString(unref(t)("removeLiquidity.output")), 1)
                ]),
                default: withCtx(({ row }) => [
                  createVNode(_component_formatted_amount_with_fiat_value, {
                    class: "explore-table-item-token tx-amount",
                    "font-size-rate": unref(FontSizeRate).SMALL,
                    value: row.outputAmount,
                    "fiat-value": row.outputAmountUSD
                  }, null, 8, ["font-size-rate", "value", "fiat-value"])
                ]),
                _: 1
              }),
              createVNode(_component_s_table_column, {
                "header-align": "left",
                align: "left"
              }, {
                header: withCtx(() => [
                  createBaseVNode("span", null, toDisplayString(unref(t)("transfers.from")), 1)
                ]),
                default: withCtx(({ row }) => [
                  createBaseVNode("div", _hoisted_2, [
                    createVNode(_component_token_logo, {
                      size: "small",
                      class: "explore-table-item-logo explore-table-item-logo--plain",
                      token: row.inputAsset,
                      "token-symbol": row.inputAssetSymbol
                    }, null, 8, ["token", "token-symbol"]),
                    createBaseVNode("span", _hoisted_3, toDisplayString(row.inputAssetSymbol), 1)
                  ])
                ]),
                _: 1
              }),
              createVNode(_component_s_table_column, {
                "header-align": "left",
                align: "left"
              }, {
                header: withCtx(() => [
                  createBaseVNode("span", null, toDisplayString(unref(t)("transfers.to")), 1)
                ]),
                default: withCtx(({ row }) => [
                  createBaseVNode("div", _hoisted_4, [
                    createVNode(_component_token_logo, {
                      size: "small",
                      class: "explore-table-item-logo explore-table-item-logo--plain",
                      token: row.outputAsset,
                      "token-symbol": row.outputAssetSymbol
                    }, null, 8, ["token", "token-symbol"]),
                    createBaseVNode("span", _hoisted_5, toDisplayString(row.outputAssetSymbol), 1)
                  ])
                ]),
                _: 1
              }),
              createVNode(_component_s_table_column, { width: "94" }, {
                header: withCtx(() => [
                  createBaseVNode("span", null, toDisplayString(unref(tc)("accountText", 1)), 1)
                ]),
                default: withCtx(({ row }) => [
                  createVNode(_component_formatted_address, {
                    value: row.address,
                    symbols: 8
                  }, null, 8, ["value"])
                ]),
                _: 1
              }),
              createVNode(_component_s_table_column, {
                width: "48",
                "header-align": "center"
              }, {
                header: withCtx(() => [
                  createVNode(_component_s_icon, {
                    name: "basic-eye-no-24",
                    size: "16px"
                  })
                ]),
                default: withCtx(({ row }) => [
                  row.links.length ? (openBlock(), createBlock(_component_links_dropdown, {
                    key: 0,
                    links: row.links
                  }, null, 8, ["links"])) : createCommentVNode("", true)
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["data"])), [
            [_directive_loading, unref(loading)]
          ]),
          createVNode(_component_history_pagination, {
            class: "explore-table-pagination",
            "current-page": unref(currentPage),
            "page-amount": unref(pageAmount),
            total: unref(total),
            loading: unref(loading),
            "last-page": unref(lastPage),
            onPaginationClick: unref(handlePaginationClick)
          }, null, 8, ["current-page", "page-amount", "total", "loading", "last-page", "onPaginationClick"])
        ]),
        _: 1
      }, 16, ["title"]);
    };
  }
});
const SwapTransactionsWidget = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-ceacc2f1"]]);
export {
  SwapTransactionsWidget as default
};
