import { z as defineComponent, bV as mapState, c5 as FontWeightRate, c7 as FontSizeRate, c8 as HiddenValue, aP as _export_sfc, a_ as resolveComponent, A as createElementBlock, C as openBlock, aJ as renderSlot, D as createBaseVNode, am as createBlock, aM as createCommentVNode, aN as toDisplayString, ao as withCtx, ap as createVNode, bQ as Fragment, aO as createTextVNode, bL as resolveDynamicComponent } from "./index-73GArslZ.js";
import FormattedAmount from "./FormattedAmount-CpadAVnm.js";
const _sfc_main = defineComponent({
  components: { FormattedAmount },
  props: {
    label: { default: "", type: String },
    labelTooltip: { default: "", type: String },
    value: { default: "", type: [String, Number] },
    assetSymbol: { default: "", type: String },
    isFormatted: { default: false, type: Boolean },
    fiatValue: { default: "", type: String },
    valueTooltip: { default: "", type: String },
    /**
     * Define directly that this field displays value which can be hidden by hide balances button.
     */
    valueCanBeHidden: { default: false, type: Boolean }
  },
  data() {
    return {
      HiddenValue
    };
  },
  computed: {
    ...mapState("wallet/settings", ["shouldBalanceBeHidden"]),
    normalizedValue() {
      if (this.value === null || this.value === void 0) {
        return "";
      }
      if (typeof this.value === "string") {
        return this.value;
      }
      return String(this.value);
    },
    hasInvalidValue() {
      return ["NaN", "Infinity", "-Infinity"].includes(this.normalizedValue);
    },
    isValueExists() {
      if (this.hasInvalidValue) {
        return false;
      }
      return this.normalizedValue.trim().length > 0;
    },
    formattedFontSize() {
      return this.isFormatted ? FontSizeRate.MEDIUM : null;
    },
    formattedFontWeight() {
      return this.isFormatted ? FontWeightRate.SMALL : null;
    },
    tooltipOrTemplate() {
      return this.valueTooltip ? "s-tooltip" : "span";
    }
  }
});
const _hoisted_1 = { class: "info-line" };
const _hoisted_2 = { class: "info-line-label" };
const _hoisted_3 = { class: "info-line-content" };
const _hoisted_4 = { class: "info-line-value" };
const _hoisted_5 = {
  key: 0,
  class: "asset-symbol"
};
const _hoisted_6 = {
  key: 2,
  class: "info-line-value"
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_s_icon = resolveComponent("s-icon");
  const _component_s_tooltip = resolveComponent("s-tooltip");
  const _component_formatted_amount = resolveComponent("formatted-amount");
  return openBlock(), createElementBlock("div", _hoisted_1, [
    renderSlot(_ctx.$slots, "info-line-prefix", {}, void 0, true),
    createBaseVNode("span", _hoisted_2, toDisplayString(_ctx.label), 1),
    _ctx.labelTooltip ? (openBlock(), createBlock(_component_s_tooltip, {
      key: 0,
      "popper-class": "info-tooltip info-tooltip--info-line",
      content: _ctx.labelTooltip,
      placement: "right-start",
      "border-radius": "mini",
      "wrapper-tag": "span",
      tabindex: "-1"
    }, {
      default: withCtx(() => [
        createVNode(_component_s_icon, {
          class: "el-tooltip",
          name: "info-16",
          size: "14px"
        })
      ]),
      _: 1
    }, 8, ["content"])) : createCommentVNode("", true),
    createBaseVNode("div", _hoisted_3, [
      _ctx.isValueExists ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
        renderSlot(_ctx.$slots, "info-line-value-prefix", {}, void 0, true),
        _ctx.isFormatted ? (openBlock(), createBlock(_component_formatted_amount, {
          key: 0,
          class: "info-line-value",
          value: _ctx.value,
          "asset-symbol": _ctx.assetSymbol,
          "font-size-rate": _ctx.formattedFontSize,
          "font-weight-rate": _ctx.formattedFontWeight,
          "value-can-be-hidden": _ctx.valueCanBeHidden
        }, null, 8, ["value", "asset-symbol", "font-size-rate", "font-weight-rate", "value-can-be-hidden"])) : !_ctx.valueCanBeHidden || !_ctx.shouldBalanceBeHidden ? (openBlock(), createBlock(resolveDynamicComponent(_ctx.tooltipOrTemplate), {
          key: 1,
          content: _ctx.valueTooltip
        }, {
          default: withCtx(() => [
            createBaseVNode("span", _hoisted_4, [
              createTextVNode(toDisplayString(_ctx.normalizedValue) + " ", 1),
              _ctx.assetSymbol ? (openBlock(), createElementBlock("span", _hoisted_5, toDisplayString(" " + _ctx.assetSymbol), 1)) : createCommentVNode("", true)
            ])
          ]),
          _: 1
        }, 8, ["content"])) : (openBlock(), createElementBlock("span", _hoisted_6, toDisplayString(_ctx.HiddenValue), 1)),
        _ctx.fiatValue ? (openBlock(), createBlock(_component_formatted_amount, {
          key: 3,
          "is-fiat-value": "",
          value: _ctx.fiatValue,
          "font-size-rate": _ctx.formattedFontSize,
          "value-can-be-hidden": _ctx.valueCanBeHidden
        }, null, 8, ["value", "font-size-rate", "value-can-be-hidden"])) : createCommentVNode("", true)
      ], 64)) : createCommentVNode("", true),
      renderSlot(_ctx.$slots, "default", {}, void 0, true)
    ])
  ]);
}
const InfoLine = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-a956a0db"]]);
export {
  InfoLine as default
};
