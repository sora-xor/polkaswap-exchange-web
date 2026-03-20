import { z as defineComponent, ak as lazyComponent, u as useTranslation, G as useInternalConnect, c2 as useTransaction, a9 as ref, aA as watch, aB as onBeforeUnmount, a_ as resolveComponent, bz as resolveDirective, am as createBlock, C as openBlock, ao as withCtx, A as createElementBlock, ap as createVNode, aj as unref, D as createBaseVNode, aN as toDisplayString, aO as createTextVNode, ar as isRef, aM as createCommentVNode, bA as withDirectives, bb as normalizeClass, h as computed, as as mergeProps, al as Components, ay as api, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useConfirmDialog } from "./useConfirmDialog-CVL8UdZp.js";
import { u as useOrderBook } from "./useOrderBook-BhgjjoQG.js";
import { u as usePiniaTelemetry } from "./usePiniaTelemetry-DKBIwNF3.js";
import { u as useOrderBookUserOrders } from "./useOrderBookUserOrders-B0IscmbH.js";
import { u as useOrderBookStore } from "./index-BDxnS5Vu.js";
import { F as Filter, C as Cancel } from "./orderBook-BhgledRv.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "order-history-buttons order-history-buttons--filter-buttons" };
const _hoisted_2 = {
  key: 0,
  class: "order-history-buttons order-history-buttons--cancel-buttons"
};
const _hoisted_3 = {
  key: 0,
  class: "order-history-main s-flex-column"
};
const _hoisted_4 = {
  key: 1,
  class: "order-history-connect-account"
};
const _hoisted_5 = { class: "order-history-connect-account-button" };
const _hoisted_6 = { class: "h4" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      BaseWidget: lazyComponent(Components.BaseWidget),
      AllOrders: lazyComponent(Components.AllOrders),
      OpenOrders: lazyComponent(Components.OpenOrders),
      CancelConfirm: lazyComponent(Components.CancelOrders)
    }
  },
  __name: "HistoryOrderWidget",
  setup(__props, { expose: __expose }) {
    const FilterEnum = Filter;
    const CancelEnum = Cancel;
    const { t } = useTranslation();
    const { isLoggedIn, connectSoraWallet, soraAddress } = useInternalConnect();
    const { loading, withNotifications } = useTransaction();
    const { confirmDialogVisible, confirmOrExecute } = useConfirmDialog();
    const { orderBookId, baseAsset, quoteAsset } = useOrderBook();
    const orderBookStore = useOrderBookStore();
    usePiniaTelemetry("order-book", [{ store: orderBookStore, storeId: "orderBook" }], {
      metadata: () => ({
        widget: "history",
        orderBookId: orderBookId.value || null,
        baseAsset: baseAsset.value?.symbol ?? null,
        quoteAsset: quoteAsset.value?.symbol ?? null
      })
    });
    const {
      userLimitOrders,
      ordersToBeCancelled,
      nodeIsConnected,
      isBookStopped,
      subscribeToUserLimitOrders,
      unsubscribeFromUserLimitOrders,
      setOrdersToBeCancelled
    } = useOrderBookUserOrders();
    const currentFilter = ref(FilterEnum.open);
    const openOrdersLoading = ref(false);
    const subscribe = async () => {
      if (!(isLoggedIn.value && nodeIsConnected.value && orderBookId.value)) {
        openOrdersLoading.value = false;
        await unsubscribeFromUserLimitOrders();
        return;
      }
      openOrdersLoading.value = true;
      try {
        await unsubscribeFromUserLimitOrders();
        await subscribeToUserLimitOrders();
      } catch (error) {
        console.error("[orderBook] Failed to refresh user limit orders subscription", error);
      } finally {
        openOrdersLoading.value = false;
      }
    };
    watch([orderBookId, soraAddress, nodeIsConnected, isLoggedIn], subscribe, { immediate: true });
    onBeforeUnmount(() => {
      unsubscribeFromUserLimitOrders();
    });
    const openOrdersCount = computed(() => {
      if (!isLoggedIn.value) return "";
      const count = userLimitOrders.value.length;
      return count > 0 ? `(${count})` : "";
    });
    const openOrdersText = computed(() => t("orderBook.history.openOrders", { value: openOrdersCount.value }));
    const hasSelectedForCancellation = computed(() => ordersToBeCancelled.value.length > 0);
    const cancelText = computed(
      () => hasSelectedForCancellation.value ? t("orderBook.history.cancel", { value: `(${ordersToBeCancelled.value.length})` }) : t("orderBook.history.cancel")
    );
    const cancelAllText = computed(() => t("orderBook.history.cancelAll"));
    const isCancelAllInactive = computed(() => loading.value || isBookStopped.value || userLimitOrders.value.length === 0);
    const isCancelMultipleInactive = computed(
      () => loading.value || isBookStopped.value || !hasSelectedForCancellation.value
    );
    const switchFilter = (filter) => {
      currentFilter.value = filter;
    };
    const cancelOrders = async (cancel = CancelEnum.all) => {
      if (loading.value || isBookStopped.value || userLimitOrders.value.length === 0) return;
      const orders = cancel === CancelEnum.multiple ? ordersToBeCancelled.value : userLimitOrders.value;
      if (!orders.length) return;
      await withNotifications(async () => {
        const {
          orderBookId: { base, quote }
        } = orders[0];
        const ids = orders.map((order) => order.id);
        if (ids.length > 1) {
          await api.orderBook.cancelLimitOrderBatch(base, quote, ids);
        } else {
          await api.orderBook.cancelLimitOrder(base, quote, ids[0]);
        }
        setOrdersToBeCancelled([]);
      });
    };
    const openConfirmCancelDialog = async () => {
      if (isBookStopped.value || userLimitOrders.value.length === 0) return;
      await confirmOrExecute(() => cancelOrders());
    };
    __expose({
      cancelOrders,
      switchFilter,
      openConfirmCancelDialog,
      currentFilter,
      openOrdersLoading
    });
    return (_ctx, _cache) => {
      const _component_open_orders = resolveComponent("open-orders");
      const _component_all_orders = resolveComponent("all-orders");
      const _component_s_button = resolveComponent("s-button");
      const _component_cancel_confirm = resolveComponent("cancel-confirm");
      const _component_base_widget = resolveComponent("base-widget");
      const _directive_button = resolveDirective("button");
      return openBlock(), createBlock(_component_base_widget, mergeProps(_ctx.$attrs, {
        extensive: "",
        delimeter: "",
        class: "order-history-widget s-flex-column"
      }), {
        title: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            withDirectives((openBlock(), createElementBlock("span", {
              class: normalizeClass(["order-history-button", { active: currentFilter.value === unref(FilterEnum).open }]),
              onClick: _cache[0] || (_cache[0] = ($event) => switchFilter(unref(FilterEnum).open))
            }, [
              createTextVNode(toDisplayString(openOrdersText.value), 1)
            ], 2)), [
              [_directive_button]
            ]),
            withDirectives((openBlock(), createElementBlock("span", {
              class: normalizeClass(["order-history-button", { active: currentFilter.value === unref(FilterEnum).all }]),
              onClick: _cache[1] || (_cache[1] = ($event) => switchFilter(unref(FilterEnum).all))
            }, [
              createTextVNode(toDisplayString(unref(t)("orderBook.history.orderHistory")), 1)
            ], 2)), [
              [_directive_button]
            ]),
            withDirectives((openBlock(), createElementBlock("span", {
              class: normalizeClass(["order-history-button", { active: currentFilter.value === unref(FilterEnum).executed }]),
              onClick: _cache[2] || (_cache[2] = ($event) => switchFilter(unref(FilterEnum).executed))
            }, [
              createTextVNode(toDisplayString(unref(t)("orderBook.history.tradeHistory")), 1)
            ], 2)), [
              [_directive_button]
            ])
          ]),
          unref(isLoggedIn) ? (openBlock(), createElementBlock("div", _hoisted_2, [
            withDirectives((openBlock(), createElementBlock("span", {
              class: normalizeClass(["order-history-button", "order-history-button--cancel", { inactive: isCancelMultipleInactive.value }]),
              onClick: _cache[3] || (_cache[3] = ($event) => cancelOrders(unref(CancelEnum).multiple))
            }, [
              createTextVNode(toDisplayString(cancelText.value), 1)
            ], 2)), [
              [_directive_button]
            ]),
            withDirectives((openBlock(), createElementBlock("span", {
              class: normalizeClass(["order-history-button", "order-history-button--cancel", { inactive: isCancelAllInactive.value }]),
              onClick: openConfirmCancelDialog
            }, [
              createTextVNode(toDisplayString(cancelAllText.value), 1)
            ], 2)), [
              [_directive_button]
            ])
          ])) : createCommentVNode("", true)
        ]),
        default: withCtx(() => [
          unref(isLoggedIn) ? (openBlock(), createElementBlock("div", _hoisted_3, [
            currentFilter.value === unref(FilterEnum).open ? (openBlock(), createBlock(_component_open_orders, {
              key: 0,
              "parent-loading": openOrdersLoading.value
            }, null, 8, ["parent-loading"])) : (openBlock(), createBlock(_component_all_orders, {
              key: 1,
              filter: currentFilter.value
            }, null, 8, ["filter"]))
          ])) : (openBlock(), createElementBlock("div", _hoisted_4, [
            createBaseVNode("div", _hoisted_5, [
              createBaseVNode("h4", _hoisted_6, toDisplayString(unref(t)("orderBook.history.connect")), 1),
              createVNode(_component_s_button, {
                type: "primary",
                class: "btn s-typography-button--medium order-book-connect-btn",
                onClick: unref(connectSoraWallet)
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(unref(t)("connectWalletText")), 1)
                ]),
                _: 1
              }, 8, ["onClick"])
            ])
          ])),
          createVNode(_component_cancel_confirm, {
            visible: unref(confirmDialogVisible),
            "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => isRef(confirmDialogVisible) ? confirmDialogVisible.value = $event : null),
            onConfirm: cancelOrders
          }, null, 8, ["visible"])
        ]),
        _: 1
      }, 16);
    };
  }
});
const HistoryOrderWidget = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-a0983b32"]]);
export {
  HistoryOrderWidget as default
};
