import { z as defineComponent, ak as lazyComponent, u as useTranslation, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aj as unref, D as createBaseVNode, aN as toDisplayString, bb as normalizeClass, as as mergeProps, al as Components } from "./index-73GArslZ.js";
import { u as useOrderBook } from "./useOrderBook-BhgjjoQG.js";
import { u as usePiniaTelemetry } from "./usePiniaTelemetry-DKBIwNF3.js";
import { u as useOrderBookStore } from "./index-BDxnS5Vu.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "market-trades__header" };
const _hoisted_2 = { class: "order-info time" };
const _hoisted_3 = { class: "market-trades__header" };
const _hoisted_4 = { class: "order-info" };
const _hoisted_5 = { class: "market-trades__header" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      BaseWidget: lazyComponent(Components.BaseWidget)
    }
  },
  __name: "MarketTradesWidget",
  setup(__props, { expose: __expose }) {
    const { t } = useTranslation();
    const { completedOrders, orderBookId, baseAsset, quoteAsset } = useOrderBook();
    const orderBookStore = useOrderBookStore();
    usePiniaTelemetry("order-book", [{ store: orderBookStore, storeId: "orderBook" }], {
      metadata: () => ({
        widget: "market-trades",
        orderBookId: orderBookId.value || null,
        baseAsset: baseAsset.value?.symbol ?? null,
        quoteAsset: quoteAsset.value?.symbol ?? null
      })
    });
    __expose({ completedOrders });
    return (_ctx, _cache) => {
      const _component_s_table_column = resolveComponent("s-table-column");
      const _component_s_table = resolveComponent("s-table");
      const _component_base_widget = resolveComponent("base-widget");
      return openBlock(), createBlock(_component_base_widget, mergeProps(_ctx.$attrs, {
        extensive: "",
        class: "market-trades",
        title: unref(t)("orderBook.marketTrades"),
        tooltip: unref(t)("orderBook.tooltip.marketWidget")
      }), {
        default: withCtx(() => [
          createVNode(_component_s_table, {
            class: "market-trades-table",
            data: unref(completedOrders)
          }, {
            default: withCtx(() => [
              createVNode(_component_s_table_column, null, {
                header: withCtx(() => [
                  createBaseVNode("span", _hoisted_1, toDisplayString(unref(t)("orderBook.time")), 1)
                ]),
                default: withCtx((scope) => [
                  createBaseVNode("span", _hoisted_2, toDisplayString(scope?.row?.time), 1)
                ]),
                _: 1
              }),
              createVNode(_component_s_table_column, null, {
                header: withCtx(() => [
                  createBaseVNode("span", _hoisted_3, toDisplayString(unref(t)("orderBook.amount")), 1)
                ]),
                default: withCtx((scope) => [
                  createBaseVNode("span", _hoisted_4, toDisplayString(scope?.row?.amount), 1)
                ]),
                _: 1
              }),
              createVNode(_component_s_table_column, {
                "header-align": "right",
                align: "right"
              }, {
                header: withCtx(() => [
                  createBaseVNode("span", _hoisted_5, toDisplayString(unref(t)("priceText")), 1)
                ]),
                default: withCtx((scope) => [
                  createBaseVNode("span", {
                    class: normalizeClass(["order-info price", { buy: scope?.row?.isBuy }])
                  }, toDisplayString(scope?.row?.price), 3)
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["data"])
        ]),
        _: 1
      }, 16, ["title", "tooltip"]);
    };
  }
});
export {
  _sfc_main as default
};
