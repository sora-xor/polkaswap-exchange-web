import { z as defineComponent, ak as lazyComponent, u as useTranslation, a9 as ref, a7 as PriceVariant, aA as watch, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, h as computed, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, A as createElementBlock, bQ as Fragment, bP as renderList, aj as unref, al as Components } from "./index-73GArslZ.js";
import { u as useOrderBook } from "./useOrderBook-BhgjjoQG.js";
import { u as usePiniaTelemetry } from "./usePiniaTelemetry-DKBIwNF3.js";
import { u as useOrderBookStore } from "./index-BDxnS5Vu.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "order-book-tabs" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      BaseWidget: lazyComponent(Components.BaseWidget),
      BuySell: lazyComponent(Components.BuySell)
    }
  },
  __name: "SetLimitOrderWidget",
  setup(__props) {
    const { t } = useTranslation();
    const { PriceVariant: orderBookPriceVariant, side, setSide, orderBookId, baseAsset, quoteAsset } = useOrderBook();
    const orderBookStore = useOrderBookStore();
    const LimitOrderTabsItems = orderBookPriceVariant ?? PriceVariant;
    const currentTab = ref(side.value ?? PriceVariant.Buy);
    usePiniaTelemetry("order-book", [{ store: orderBookStore, storeId: "orderBook" }], {
      metadata: () => ({
        widget: "set-limit-order",
        orderBookId: orderBookId.value || null,
        baseAsset: baseAsset.value?.symbol ?? null,
        quoteAsset: quoteAsset.value?.symbol ?? null
      })
    });
    watch(
      side,
      (side2) => {
        if (side2 && side2 !== currentTab.value) {
          currentTab.value = side2;
        }
      },
      { immediate: true }
    );
    const loadingState = computed(() => false);
    const handleChangeTab = (side2) => {
      currentTab.value = side2;
      setSide(side2);
    };
    return (_ctx, _cache) => {
      const _component_s_tab = resolveComponent("s-tab");
      const _component_s_tabs = resolveComponent("s-tabs");
      const _component_buy_sell = resolveComponent("buy-sell");
      const _component_base_widget = resolveComponent("base-widget");
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createBlock(_component_base_widget, { extensive: "" }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(_component_s_tabs, {
              value: currentTab.value,
              type: "card",
              onInput: handleChangeTab
            }, {
              default: withCtx(() => [
                (openBlock(true), createElementBlock(Fragment, null, renderList(unref(LimitOrderTabsItems), (bookTab) => {
                  return openBlock(), createBlock(_component_s_tab, {
                    key: bookTab,
                    label: unref(t)(`orderBook.${bookTab}`),
                    name: bookTab
                  }, null, 8, ["label", "name"]);
                }), 128))
              ]),
              _: 1
            }, 8, ["value"])
          ]),
          createBaseVNode("div", null, [
            createVNode(_component_buy_sell)
          ])
        ]),
        _: 1
      })), [
        [_directive_loading, loadingState.value]
      ]);
    };
  }
});
export {
  _sfc_main as default
};
