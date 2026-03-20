import { z as defineComponent, c5 as FontWeightRate, c7 as FontSizeRate, bm as toRefs, A as createElementBlock, C as openBlock, ap as createVNode, am as createBlock, aM as createCommentVNode, ao as withCtx, aJ as renderSlot, aj as unref, bb as normalizeClass, h as computed, aP as _export_sfc } from "./index-73GArslZ.js";
import FormattedAmount from "./FormattedAmount-CpadAVnm.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "FormattedAmountWithFiatValue",
  props: {
    valueClass: { default: "" },
    value: { default: "" },
    fontSizeRate: { default: FontSizeRate.NORMAL },
    fontWeightRate: { default: FontWeightRate.NORMAL },
    assetSymbol: { default: "" },
    symbolAsDecimal: { type: Boolean, default: false },
    hasFiatValue: { type: Boolean, default: true },
    fiatValue: { default: "" },
    fiatFormatAsValue: { type: Boolean, default: false },
    valueCanBeHidden: { type: Boolean, default: false },
    fiatFontSizeRate: { default: FontSizeRate.NORMAL },
    fiatFontWeightRate: { default: FontWeightRate.NORMAL },
    withLeftShift: { type: Boolean, default: false }
  },
  setup(__props) {
    const props = __props;
    const {
      valueClass,
      value,
      fontSizeRate,
      fontWeightRate,
      assetSymbol,
      symbolAsDecimal,
      hasFiatValue,
      fiatValue,
      fiatFormatAsValue,
      valueCanBeHidden,
      fiatFontSizeRate,
      fiatFontWeightRate,
      withLeftShift
    } = toRefs(props);
    const computedClasses = computed(() => {
      const baseClass = "formatted-amount__container";
      const classes = [baseClass];
      if (+value.value === 0) {
        classes.push(`${baseClass}--nowrap`);
      }
      return classes.join(" ");
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(computedClasses.value)
      }, [
        createVNode(FormattedAmount, {
          class: normalizeClass(unref(valueClass)),
          value: unref(value),
          "font-size-rate": unref(fontSizeRate),
          "font-weight-rate": unref(fontWeightRate),
          "asset-symbol": unref(assetSymbol),
          "symbol-as-decimal": unref(symbolAsDecimal),
          "value-can-be-hidden": unref(valueCanBeHidden)
        }, {
          default: withCtx(() => [
            renderSlot(_ctx.$slots, "default", {}, void 0, true)
          ]),
          _: 3
        }, 8, ["class", "value", "font-size-rate", "font-weight-rate", "asset-symbol", "symbol-as-decimal", "value-can-be-hidden"]),
        unref(hasFiatValue) ? (openBlock(), createBlock(FormattedAmount, {
          key: 0,
          "is-fiat-value": "",
          value: unref(fiatValue),
          "font-size-rate": unref(fiatFormatAsValue) ? unref(fontSizeRate) : unref(fiatFontSizeRate),
          "font-weight-rate": unref(fiatFormatAsValue) ? unref(fontWeightRate) : unref(fiatFontWeightRate),
          "with-left-shift": unref(withLeftShift),
          "value-can-be-hidden": unref(valueCanBeHidden)
        }, null, 8, ["value", "font-size-rate", "font-weight-rate", "with-left-shift", "value-can-be-hidden"])) : createCommentVNode("", true)
      ], 2);
    };
  }
});
const FormattedAmountWithFiatValue = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-a337d35a"]]);
export {
  FormattedAmountWithFiatValue as default
};
