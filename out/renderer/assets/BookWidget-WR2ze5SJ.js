import { z as defineComponent, ak as lazyComponent, u as useTranslation, U as useLoading, aB as onBeforeUnmount, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, aj as unref, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, A as createElementBlock, aN as toDisplayString, bb as normalizeClass, cd as normalizeStyle, bQ as Fragment, bP as renderList, a7 as PriceVariant, ap as createVNode, aM as createCommentVNode, as as mergeProps, al as Components } from "./index-73GArslZ.js";
import { u as useOrderBook } from "./useOrderBook-BhgjjoQG.js";
import { u as usePiniaTelemetry } from "./usePiniaTelemetry-DKBIwNF3.js";
import { u as useOrderBookStore } from "./index-BDxnS5Vu.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { slot: "menu" };
const _hoisted_2 = { class: "book-columns" };
const _hoisted_3 = ["onClick"];
const _hoisted_4 = ["title"];
const _hoisted_5 = ["title"];
const _hoisted_6 = ["title"];
const _hoisted_7 = {
  key: 1,
  class: "stock-book-sell--no-asks"
};
const _hoisted_8 = ["title"];
const _hoisted_9 = ["title"];
const _hoisted_10 = ["onClick"];
const _hoisted_11 = ["title"];
const _hoisted_12 = ["title"];
const _hoisted_13 = ["title"];
const _hoisted_14 = {
  key: 3,
  class: "stock-book-buy--no-bids"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    inheritAttrs: false,
    components: {
      BaseWidget: lazyComponent(Components.BaseWidget)
    }
  },
  __name: "BookWidget",
  setup(__props) {
    const { t } = useTranslation();
    const { loading, withLoading, withParentLoading } = useLoading();
    const {
      orderBookId,
      baseAsset,
      quoteAsset,
      asksFormatted,
      bidsFormatted,
      sellOrders,
      buyOrders,
      sellMarginStyle,
      barStyle,
      isMarketOrder,
      steps,
      selectedStep,
      setSelectedStep,
      trendIcon,
      trendClass,
      lastPriceFormatted,
      fiatValue,
      fillPrice,
      watchOrderBookSubscription,
      unsubscribeFromOrderBook,
      PriceVariant: orderBookPriceVariant
    } = useOrderBook({ maxRows: 11 });
    const orderBookStore = useOrderBookStore();
    usePiniaTelemetry("order-book", [{ store: orderBookStore, storeId: "orderBook" }], {
      metadata: () => ({
        widget: "book",
        orderBookId: orderBookId.value || null,
        baseAsset: baseAsset.value?.symbol ?? null,
        quoteAsset: quoteAsset.value?.symbol ?? null
      })
    });
    const handleSelectStep = (value) => setSelectedStep(value);
    const stopSubscription = watchOrderBookSubscription({ withLoading, withParentLoading });
    onBeforeUnmount(() => {
      stopSubscription?.();
      unsubscribeFromOrderBook();
    });
    const PriceVariant$1 = orderBookPriceVariant ?? PriceVariant;
    return (_ctx, _cache) => {
      const _component_s_dropdown_item = resolveComponent("s-dropdown-item");
      const _component_s_dropdown = resolveComponent("s-dropdown");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_base_widget = resolveComponent("base-widget");
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createBlock(_component_base_widget, mergeProps(_ctx.$attrs, {
        extensive: "",
        class: "stock-book book",
        title: unref(t)("orderBook.orderBook"),
        tooltip: unref(t)("orderBook.tooltip.bookWidget")
      }), {
        filters: withCtx(() => [
          false ? (openBlock(), createBlock(_component_s_dropdown, {
            key: 0,
            class: "stock-book__switcher",
            trigger: "click",
            size: 18,
            "popper-class": "stock-book-switcher"
          }, {
            default: withCtx(() => [
              _createTextVNode(toDisplayString(unref(selectedStep)) + " ", 1),
              createBaseVNode("template", _hoisted_1, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(unref(steps), (value) => {
                  return openBlock(), createBlock(_component_s_dropdown_item, {
                    key: value,
                    onClick: ($event) => handleSelectStep(value)
                  }, {
                    default: withCtx(() => [
                      _createTextVNode(toDisplayString(value), 1)
                    ]),
                    _: 2
                  }, 1032, ["onClick"]);
                }), 128))
              ])
            ]),
            _: 1
          })) : createCommentVNode("", true)
        ]),
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_2, [
            createBaseVNode("div", null, toDisplayString(unref(t)("priceText")), 1),
            createBaseVNode("div", null, toDisplayString(unref(t)("orderBook.amount")), 1),
            createBaseVNode("div", null, toDisplayString(unref(t)("orderBook.total")), 1)
          ]),
          unref(asksFormatted).length ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: normalizeClass(["stock-book-sell", { unclickable: unref(isMarketOrder) }])
          }, [
            createBaseVNode("div", {
              class: "margin",
              style: normalizeStyle(unref(sellMarginStyle))
            }, null, 4),
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(sellOrders), (order) => {
              return openBlock(), createElementBlock("div", {
                key: order.price,
                class: "row",
                onClick: ($event) => unref(fillPrice)(order.price, unref(PriceVariant$1).Sell)
              }, [
                createBaseVNode("span", {
                  class: "order-info total",
                  title: order.total
                }, toDisplayString(order.total), 9, _hoisted_4),
                createBaseVNode("span", {
                  class: "order-info amount",
                  title: order.amount
                }, toDisplayString(order.amount), 9, _hoisted_5),
                createBaseVNode("span", {
                  class: "order-info price",
                  title: order.price
                }, toDisplayString(order.price), 9, _hoisted_6),
                createBaseVNode("div", {
                  class: "bar",
                  style: normalizeStyle(unref(barStyle)(order.filled))
                }, null, 4)
              ], 8, _hoisted_3);
            }), 128))
          ], 2)) : (openBlock(), createElementBlock("div", _hoisted_7, toDisplayString(unref(t)("orderBook.book.noAsks")), 1)),
          createBaseVNode("div", {
            class: normalizeClass(unref(trendClass))
          }, [
            createBaseVNode("div", null, [
              createBaseVNode("span", {
                class: "mark-price",
                title: unref(lastPriceFormatted)
              }, toDisplayString(unref(lastPriceFormatted)), 9, _hoisted_8),
              createVNode(_component_s_icon, {
                class: "trend-icon",
                name: unref(trendIcon),
                size: "18"
              }, null, 8, ["name"]),
              createBaseVNode("span", {
                class: "last-traded-price",
                title: unref(fiatValue)
              }, toDisplayString(unref(fiatValue)), 9, _hoisted_9)
            ])
          ], 2),
          unref(bidsFormatted).length ? (openBlock(), createElementBlock("div", {
            key: 2,
            class: normalizeClass(["stock-book-buy", { unclickable: unref(isMarketOrder) }])
          }, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(buyOrders), (order) => {
              return openBlock(), createElementBlock("div", {
                key: order.price,
                class: "row",
                onClick: ($event) => unref(fillPrice)(order.price, unref(PriceVariant$1).Buy)
              }, [
                createBaseVNode("span", {
                  class: "order-info total",
                  title: order.total
                }, toDisplayString(order.total), 9, _hoisted_11),
                createBaseVNode("span", {
                  class: "order-info amount",
                  title: order.amount
                }, toDisplayString(order.amount), 9, _hoisted_12),
                createBaseVNode("span", {
                  class: "order-info price",
                  title: order.price
                }, toDisplayString(order.price), 9, _hoisted_13),
                createBaseVNode("div", {
                  class: "bar",
                  style: normalizeStyle(unref(barStyle)(order.filled))
                }, null, 4)
              ], 8, _hoisted_10);
            }), 128))
          ], 2)) : (openBlock(), createElementBlock("div", _hoisted_14, toDisplayString(unref(t)("orderBook.book.noBids")), 1))
        ]),
        _: 1
      }, 16, ["title", "tooltip"])), [
        [_directive_loading, unref(loading)]
      ]);
    };
  }
});
export {
  _sfc_main as default
};
