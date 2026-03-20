import { z as defineComponent, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, h as computed, ao as withCtx, aO as createTextVNode, aj as unref, c5 as FontWeightRate, bb as normalizeClass, F as FPNumber, c6 as toPrecision, aP as _export_sfc } from "./index-73GArslZ.js";
import FormattedAmount from "./FormattedAmount-CpadAVnm.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "PriceChange",
    components: {
      FormattedAmount
    }
  },
  __name: "PriceChange",
  props: {
    value: {}
  },
  setup(__props) {
    const props = __props;
    const price = computed(() => props.value ?? FPNumber.ZERO);
    const increased = computed(() => FPNumber.gte(price.value, FPNumber.ZERO));
    const icon = computed(() => `arrows-arrow-bold-${increased.value ? "top" : "bottom"}-24`);
    const classes = computed(() => {
      const baseClass = "price-change";
      return increased.value ? [baseClass, `${baseClass}--increased`] : [baseClass];
    });
    const formatted = computed(() => {
      const normalized = increased.value ? price.value : price.value.mul(new FPNumber(-1));
      return toPrecision(normalized, 2).toLocaleString();
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(classes.value)
      }, [
        createVNode(_component_s_icon, {
          class: "price-change-arrow",
          name: icon.value,
          size: "14px"
        }, null, 8, ["name"]),
        createVNode(FormattedAmount, {
          value: formatted.value,
          "font-weight-rate": unref(FontWeightRate).MEDIUM
        }, {
          default: withCtx(() => [..._cache[0] || (_cache[0] = [
            createTextVNode("%", -1)
          ])]),
          _: 1
        }, 8, ["value", "font-weight-rate"])
      ], 2);
    };
  }
});
const PriceChange = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-961d725c"]]);
export {
  PriceChange as default
};
