import { z as defineComponent, u as useTranslation, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, aN as toDisplayString, aj as unref, h as computed, ap as createVNode, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "limit-card-content" };
const _hoisted_2 = { class: "limit-card-title" };
const _hoisted_3 = { class: "limit-card-text" };
const _hoisted_4 = { class: "limit-card-badge" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "LimitCard",
  props: {
    max: { type: Boolean, default: false },
    amount: { default: "" },
    symbol: { default: "" }
  },
  setup(__props) {
    const props = __props;
    const { t } = useTranslation();
    const type = computed(() => props.max ? t("maxAmountText") : t("minAmountText"));
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_card = resolveComponent("s-card");
      return openBlock(), createBlock(_component_s_card, {
        "border-radius": "small",
        shadow: "always",
        size: "medium",
        pressed: "",
        class: "limit-card"
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", null, [
              createBaseVNode("div", _hoisted_2, toDisplayString(unref(t)("confirmNextTxFailure.header")), 1),
              createBaseVNode("div", _hoisted_3, toDisplayString(unref(t)("bridge.limitMessage", { type: type.value, amount: __props.amount, symbol: __props.symbol })), 1)
            ]),
            createBaseVNode("div", _hoisted_4, [
              createVNode(_component_s_icon, {
                class: "limit-card-badge-icon",
                name: "notifications-alert-triangle-24",
                size: "24"
              })
            ])
          ])
        ]),
        _: 1
      });
    };
  }
});
const LimitCard = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-c36e91f6"]]);
export {
  LimitCard as default
};
