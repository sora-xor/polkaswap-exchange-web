import { z as defineComponent, aZ as components, aI as WALLET_CONSTS, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, D as createBaseVNode, aJ as renderSlot, aj as unref, h as computed, aP as _export_sfc } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "PrevNextInfoLine",
  props: {
    prev: { default: "0" },
    next: { default: "0" },
    symbol: { default: "" },
    label: { default: "" },
    tooltip: { default: "" }
  },
  setup(__props) {
    const FormattedAmount = components.FormattedAmount;
    const InfoLine = components.InfoLine;
    const props = __props;
    const fontSize = WALLET_CONSTS.FontSizeRate.MEDIUM;
    const fontWeight = WALLET_CONSTS.FontWeightRate.SMALL;
    const isPercentSymbol = computed(() => props.symbol === "%");
    const firstSymbol = computed(() => isPercentSymbol.value ? props.symbol : "");
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(InfoLine), {
        class: "prev-next-info-line",
        label: __props.label,
        "label-tooltip": __props.tooltip
      }, {
        default: withCtx(() => [
          createVNode(unref(FormattedAmount), {
            class: "prev",
            value: __props.prev,
            "asset-symbol": firstSymbol.value,
            "font-size-rate": unref(fontSize),
            "font-weight-rate": unref(fontWeight)
          }, null, 8, ["value", "asset-symbol", "font-size-rate", "font-weight-rate"]),
          _cache[0] || (_cache[0] = createBaseVNode("span", { class: "divider" }, "→", -1)),
          createVNode(unref(FormattedAmount), {
            class: "next",
            value: __props.next,
            "asset-symbol": __props.symbol,
            "font-size-rate": unref(fontSize),
            "font-weight-rate": unref(fontWeight)
          }, null, 8, ["value", "asset-symbol", "font-size-rate", "font-weight-rate"]),
          renderSlot(_ctx.$slots, "default", {}, void 0, true)
        ]),
        _: 3
      }, 8, ["label", "label-tooltip"]);
    };
  }
});
const PrevNextInfoLine = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-c2c8b933"]]);
export {
  PrevNextInfoLine as default
};
