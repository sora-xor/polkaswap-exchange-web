import { z as defineComponent, aZ as components, ak as lazyComponent, u as useTranslation, U as useLoading, Q as useBridgeHistoryStore, R as useBridgeTransactionsStore, du as useBridgeFormStore, H as useAssetsStore, a9 as ref, h as computed, aA as watch, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, bA as withDirectives, aj as unref, am as createBlock, ao as withCtx, ap as createVNode, D as createBaseVNode, bb as normalizeClass, aM as createCommentVNode, bQ as Fragment, bP as renderList, aN as toDisplayString, al as Components, b5 as nextTick, x as useNumberFormatter, aI as WALLET_CONSTS, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useBridgeCore } from "./useBridgeCore-BwzkDv5F.js";
import { u as useBridgeHistory } from "./useBridgeHistory-BfHU-41q.js";
import { u as usePiniaTelemetry } from "./usePiniaTelemetry-DKBIwNF3.js";
import { u as useNetworkFormatter } from "./useNetworkFormatter-Cuwa7_ot.js";
import { u as useBridgeStore } from "./index-FPtsBGoq.js";
const _hoisted_1 = { class: "history-container" };
const _hoisted_2 = { class: "history-header-buttons" };
const _hoisted_3 = { class: "history-items" };
const _hoisted_4 = ["onClick"];
const _hoisted_5 = { class: "history-item-info" };
const _hoisted_6 = { class: "history-item-title p4" };
const _hoisted_7 = { class: "history-item-title-separator" };
const _hoisted_8 = { class: "history-item-date" };
const _hoisted_9 = { class: "history-item-status-text" };
const _hoisted_10 = {
  key: 1,
  class: "history-empty p4"
};
const pageAmount = 8;
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      GenericPageHeader: lazyComponent(Components.GenericPageHeader),
      BridgeNetworkSelector: lazyComponent(Components.BridgeNetworkSelector),
      SearchInput: components.SearchInput,
      FormattedAmount: components.FormattedAmount,
      HistoryPagination: components.HistoryPagination
    }
  },
  __name: "BridgeTransactionsHistory",
  setup(__props) {
    const SearchAttrs = [
      "assetAddress",
      "symbol",
      "hash",
      "blockId",
      "txId",
      "externalBlockId",
      "externalHash",
      "parachainBlockId",
      "parachainHash",
      "relaychainBlockId",
      "relaychainHash"
    ];
    const { t } = useTranslation();
    const { formatStringValue } = useNumberFormatter();
    const { getNetworkIcon, isOutgoingTx, isFailedState, isSuccessState, isWaitingForActionState, formatDatetime } = useNetworkFormatter();
    const { loading: parentLoading, withParentLoading } = useLoading();
    const bridgeHistory = useBridgeHistory({ parentLoading });
    const bridgeHistoryStore = useBridgeHistoryStore();
    const bridgeTransactionsStore = useBridgeTransactionsStore();
    const bridgeStore = useBridgeStore();
    const bridgeFormStore = useBridgeFormStore();
    usePiniaTelemetry("bridge-history", [
      { store: bridgeHistoryStore, storeId: "bridgeHistory" },
      { store: bridgeTransactionsStore, storeId: "bridgeTransactions" },
      { store: bridgeFormStore, storeId: "bridgeForm" }
    ]);
    const bridgeCore = useBridgeCore();
    const assetsStore = useAssetsStore();
    const { history, networkHistoryLoading, updateExternalHistory, showHistory, setHistoryPage } = bridgeHistory;
    const { navigateToBridge } = bridgeCore;
    const registeredAssets = computed(() => assetsStore.registeredAssets);
    const historyPage = computed(() => bridgeHistoryStore.historyPage);
    const networkHistoryId = computed(() => bridgeStore.networkHistoryId);
    const query = ref("");
    const currentPage = ref(historyPage.value || 1);
    const isLtrDirection = ref(true);
    const historyList = computed(() => Object.values(history.value));
    const sortTransactions = (transactions, ascending = false) => {
      return [...transactions].sort((a, b) => {
        if (!a?.startTime || !b?.startTime) return 0;
        return ascending ? a.startTime - b.startTime : b.startTime - a.startTime;
      });
    };
    const searchQuery = computed(() => query.value.trim().toLowerCase());
    const filteredHistory = computed(() => {
      const sorted = sortTransactions(historyList.value, isLtrDirection.value);
      if (!searchQuery.value) return sorted;
      return sorted.filter((item) => {
        const registeredAsset = registeredAssets.value[item.assetAddress];
        const criteria = [registeredAsset?.address];
        for (const attr of SearchAttrs) {
          if (attr in item) {
            criteria.push(item[attr]);
          }
        }
        return criteria.some(
          (value) => String(value ?? "").toLowerCase().includes(searchQuery.value)
        );
      });
    });
    const total = computed(() => filteredHistory.value.length);
    const lastPage = computed(() => total.value ? Math.ceil(total.value / pageAmount) : 1);
    const directionShift = computed(() => {
      const remainder = total.value % pageAmount || pageAmount;
      return isLtrDirection.value ? 0 : pageAmount - remainder;
    });
    const clampCurrentPage = () => {
      if (currentPage.value > lastPage.value) {
        currentPage.value = lastPage.value;
      }
      if (currentPage.value < 1) {
        currentPage.value = 1;
      }
    };
    watch(total, clampCurrentPage);
    watch(historyPage, (value) => {
      if (value !== currentPage.value) {
        currentPage.value = value || 1;
      }
    });
    const getPageItems = (items, start, end) => items.slice(start, end);
    const filteredHistoryItems = computed(() => {
      if (!filteredHistory.value.length) return [];
      let start;
      let end;
      if (isLtrDirection.value) {
        end = Math.min(currentPage.value * pageAmount, filteredHistory.value.length);
        start = Math.max(end - pageAmount, 0);
      } else {
        end = Math.max((lastPage.value - currentPage.value + 1) * pageAmount - directionShift.value, 0);
        start = Math.max((lastPage.value - currentPage.value) * pageAmount - directionShift.value, 0);
      }
      return sortTransactions(getPageItems(filteredHistory.value, start, end), true);
    });
    const hasHistory = computed(() => filteredHistoryItems.value.length > 0);
    const resetPage = () => {
      currentPage.value = 1;
      isLtrDirection.value = true;
      setHistoryPage(1);
    };
    const resetSearch = () => {
      query.value = "";
    };
    const handleResetSearch = () => {
      resetPage();
      resetSearch();
    };
    const updateBridgeHistoryAction = () => bridgeStore.updateBridgeHistory();
    const fetchNetworkHistory = async () => {
      await withParentLoading(async () => {
        await updateBridgeHistoryAction();
        await nextTick();
        if (historyPage.value !== 1) {
          currentPage.value = historyPage.value;
          if (currentPage.value !== 1 && currentPage.value === lastPage.value) {
            isLtrDirection.value = false;
          }
        } else {
          resetPage();
        }
      });
    };
    watch(networkHistoryId, fetchNetworkHistory, { immediate: true });
    const formatAmount = (item, received = false) => {
      const amount = received ? item.amount2 ?? item.amount : item.amount;
      if (!item.assetAddress || !amount) return "";
      const registeredAsset = registeredAssets.value[item.assetAddress];
      const decimals = registeredAsset?.decimals;
      return formatStringValue(amount, decimals);
    };
    const historyStatusClasses = (item) => {
      const iconClass = "history-item-status";
      const classes = [iconClass];
      if (isWaitingForActionState(item)) {
        classes.push(`${iconClass}--info`);
      } else if (isFailedState(item)) {
        classes.push(`${iconClass}--error`);
      } else if (isSuccessState(item)) {
        classes.push(`${iconClass}--success`);
      } else {
        classes.push(`${iconClass}--pending`);
      }
      return classes.join(" ");
    };
    const historyStatusIconName = (item) => {
      if (isWaitingForActionState(item)) {
        return "notifications-alert-triangle-24";
      }
      if (isFailedState(item)) {
        return "basic-clear-X-24";
      }
      if (isSuccessState(item)) {
        return "basic-check-marks-24";
      }
      return "time-time-24";
    };
    const historyStatusText = (item) => {
      if (isWaitingForActionState(item)) {
        return t("bridgeHistory.statusAction");
      }
      return "";
    };
    const handlePaginationClick = (button) => {
      let nextPage = currentPage.value;
      switch (button) {
        case WALLET_CONSTS.PaginationButton.Prev:
          nextPage = currentPage.value - 1;
          break;
        case WALLET_CONSTS.PaginationButton.Next:
          nextPage = currentPage.value + 1;
          if (nextPage === lastPage.value) {
            isLtrDirection.value = false;
          }
          break;
        case WALLET_CONSTS.PaginationButton.First:
          nextPage = 1;
          isLtrDirection.value = true;
          break;
        case WALLET_CONSTS.PaginationButton.Last:
          nextPage = lastPage.value;
          isLtrDirection.value = false;
          break;
      }
      currentPage.value = Math.min(Math.max(nextPage, 1), lastPage.value);
      setHistoryPage(currentPage.value);
    };
    const handleBack = () => {
      setHistoryPage(1);
      navigateToBridge();
    };
    const refreshExternalHistory = async (clearHistory = false) => {
      await withParentLoading(async () => {
        await updateExternalHistory(clearHistory);
      });
    };
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_bridge_network_selector = resolveComponent("bridge-network-selector");
      const _component_generic_page_header = resolveComponent("generic-page-header");
      const _component_search_input = resolveComponent("search-input");
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_history_pagination = resolveComponent("history-pagination");
      const _component_s_form = resolveComponent("s-form");
      const _component_s_card = resolveComponent("s-card");
      const _directive_button = resolveDirective("button");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        withDirectives((openBlock(), createBlock(_component_s_card, {
          class: "history-content",
          "border-radius": "medium",
          shadow: "always",
          primary: ""
        }, {
          default: withCtx(() => [
            createVNode(_component_generic_page_header, {
              title: unref(t)("bridgeHistory.title")
            }, {
              back: withCtx(() => [
                createVNode(_component_s_button, {
                  type: "action",
                  icon: "arrows-chevron-left-rounded-24",
                  onClick: handleBack
                })
              ]),
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_2, [
                  createVNode(_component_s_button, {
                    class: normalizeClass(["history-restore-btn", { loading: unref(networkHistoryLoading) }]),
                    type: "action",
                    icon: "arrows-swap-90-24",
                    disabled: unref(networkHistoryLoading),
                    tooltip: unref(t)("bridgeHistory.restoreHistory"),
                    onClick: _cache[0] || (_cache[0] = ($event) => refreshExternalHistory(true))
                  }, null, 8, ["class", "disabled", "tooltip"]),
                  createVNode(_component_bridge_network_selector)
                ])
              ]),
              _: 1
            }, 8, ["title"]),
            createVNode(_component_s_form, {
              class: "history-form",
              "show-message": false
            }, {
              default: withCtx(() => [
                historyList.value.length ? (openBlock(), createBlock(_component_search_input, {
                  key: 0,
                  modelValue: query.value,
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => query.value = $event),
                  placeholder: unref(t)("bridgeHistory.filterPlaceholder"),
                  autofocus: "",
                  onClear: handleResetSearch,
                  class: "history--search"
                }, null, 8, ["modelValue", "placeholder"])) : createCommentVNode("", true),
                createBaseVNode("div", _hoisted_3, [
                  hasHistory.value ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(filteredHistoryItems.value, (item) => {
                    return withDirectives((openBlock(), createElementBlock("div", {
                      class: "history-item",
                      key: `history-${item.id}`,
                      tabindex: "0",
                      onClick: ($event) => unref(showHistory)(item.id)
                    }, [
                      createBaseVNode("div", _hoisted_5, [
                        createBaseVNode("div", _hoisted_6, [
                          createVNode(_component_formatted_amount, {
                            "value-can-be-hidden": "",
                            value: formatAmount(item, false),
                            "asset-symbol": item.symbol
                          }, null, 8, ["value", "asset-symbol"]),
                          createBaseVNode("i", {
                            class: normalizeClass(`network-icon network-icon--${unref(getNetworkIcon)(
                              unref(isOutgoingTx)(item) ? 0 : item.externalNetwork
                            )}`)
                          }, null, 2),
                          createBaseVNode("span", _hoisted_7, toDisplayString(unref(t)("bridgeTransaction.for")), 1),
                          createVNode(_component_formatted_amount, {
                            "value-can-be-hidden": "",
                            value: formatAmount(item, true),
                            "asset-symbol": item.symbol
                          }, null, 8, ["value", "asset-symbol"]),
                          createBaseVNode("i", {
                            class: normalizeClass(`network-icon network-icon--${unref(getNetworkIcon)(
                              !unref(isOutgoingTx)(item) ? 0 : item.externalNetwork
                            )}`)
                          }, null, 2)
                        ]),
                        createBaseVNode("div", _hoisted_8, toDisplayString(unref(formatDatetime)(item)), 1)
                      ]),
                      createBaseVNode("div", {
                        class: normalizeClass(historyStatusClasses(item))
                      }, [
                        createBaseVNode("div", _hoisted_9, toDisplayString(historyStatusText(item)), 1),
                        createVNode(_component_s_icon, {
                          class: "history-item-status-icon",
                          name: historyStatusIconName(item),
                          size: "16"
                        }, null, 8, ["name"])
                      ], 2)
                    ], 8, _hoisted_4)), [
                      [_directive_button]
                    ]);
                  }), 128)) : (openBlock(), createElementBlock("p", _hoisted_10, toDisplayString(unref(t)("bridgeHistory.empty")), 1)),
                  hasHistory.value ? (openBlock(), createBlock(_component_history_pagination, {
                    key: 2,
                    "current-page": currentPage.value,
                    "page-amount": pageAmount,
                    total: total.value,
                    "last-page": lastPage.value,
                    onPaginationClick: handlePaginationClick
                  }, null, 8, ["current-page", "total", "last-page"])) : createCommentVNode("", true)
                ])
              ]),
              _: 1
            })
          ]),
          _: 1
        })), [
          [_directive_loading, unref(parentLoading)]
        ])
      ]);
    };
  }
});
const BridgeTransactionsHistory = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-58f4c54b"]]);
export {
  BridgeTransactionsHistory as default
};
