import { z as defineComponent, u as useTranslation, h as computed, A as createElementBlock, C as openBlock, aM as createCommentVNode, D as createBaseVNode, aN as toDisplayString, aO as createTextVNode, ap as createVNode, as as mergeProps, aj as unref, aP as _export_sfc } from "./index-73GArslZ.js";
import FormattedAddress from "./FormattedAddress-BPe25jN5.js";
import "./useCopyAddress-CJeOU9NK.js";
const _hoisted_1 = { class: "token-address" };
const _hoisted_2 = {
  key: 0,
  class: "token-address__name"
};
const _hoisted_3 = { class: "token-address__value" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "TokenAddress",
  props: {
    name: { default: "" },
    symbol: { default: "" },
    address: { default: "" },
    externalAddress: { default: "" },
    external: { type: Boolean, default: false },
    showName: { type: Boolean, default: true },
    symbols: { default: 11 },
    symbolsOffset: { default: 2 }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const { t } = useTranslation();
    const tokenName = computed(() => props.name || props.symbol);
    const tokenAddress = computed(() => props.external ? props.externalAddress : props.address);
    __expose({
      tokenAddress
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        __props.showName ? (openBlock(), createElementBlock("span", _hoisted_2, toDisplayString(tokenName.value), 1)) : createCommentVNode("", true),
        createBaseVNode("div", _hoisted_3, [
          _cache[0] || (_cache[0] = createTextVNode(" (", -1)),
          createVNode(FormattedAddress, mergeProps({
            value: tokenAddress.value,
            "tooltip-text": unref(t)("assets.assetId")
          }, { ..._ctx.$attrs, symbols: __props.symbols, symbolsOffset: __props.symbolsOffset }), null, 16, ["value", "tooltip-text"]),
          _cache[1] || (_cache[1] = createTextVNode(") ", -1))
        ])
      ]);
    };
  }
});
const TokenAddress = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-ce21ea7c"]]);
export {
  TokenAddress as default
};
