import { u as useCopyAddress } from "./useCopyAddress-CJeOU9NK.js";
import { z as defineComponent, a_ as resolveComponent, am as createBlock, C as openBlock, aj as unref, ao as withCtx, D as createBaseVNode, A as createElementBlock, h as computed, aO as createTextVNode, cd as normalizeStyle, aN as toDisplayString, bQ as Fragment, cS as getTextWidth, aP as _export_sfc } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "FormattedAddress",
  props: {
    value: { default: "" },
    tooltipText: { default: "" },
    symbols: { default: 12 },
    offset: { default: 0 },
    symbolsOffset: { default: 0 }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const { copyTooltip, handleCopyAddress } = useCopyAddress();
    const symbolsCount = computed(() => Number(props.symbols));
    const offsetValue = computed(() => Number(props.offset));
    const symbolsOffsetValue = computed(() => Number(props.symbolsOffset));
    const sliced = computed(() => props.value.length >= symbolsCount.value);
    const count = computed(() => symbolsCount.value / 2);
    const firstPartWidth = computed(() => {
      const text = props.value.slice(0, Math.round(count.value) + symbolsOffsetValue.value);
      const width = getTextWidth(text) - offsetValue.value;
      return `${width}px`;
    });
    const secondPart = computed(() => props.value.slice(-Math.floor(count.value) + symbolsOffsetValue.value));
    __expose({
      handleCopyAddress,
      copyTooltip
    });
    return (_ctx, _cache) => {
      const _component_s_tooltip = resolveComponent("s-tooltip");
      return openBlock(), createBlock(_component_s_tooltip, {
        content: unref(copyTooltip)(__props.tooltipText),
        tabindex: "-1",
        "append-to-body": ""
      }, {
        default: withCtx(() => [
          createBaseVNode("div", {
            class: "formatted-address",
            onClick: _cache[0] || (_cache[0] = ($event) => unref(handleCopyAddress)(__props.value, $event))
          }, [
            sliced.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              createBaseVNode("span", {
                class: "address",
                style: normalizeStyle({ width: firstPartWidth.value })
              }, toDisplayString(__props.value), 5),
              _cache[1] || (_cache[1] = createTextVNode(" ... ", -1)),
              createBaseVNode("span", null, toDisplayString(secondPart.value), 1)
            ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
              createTextVNode(toDisplayString(__props.value), 1)
            ], 64))
          ])
        ]),
        _: 1
      }, 8, ["content"]);
    };
  }
});
const FormattedAddress = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e38de4b1"]]);
export {
  FormattedAddress as default
};
