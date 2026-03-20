import { z as defineComponent, bF as useAttrs, aA as watch, u as useTranslation, a9 as ref, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, aJ as renderSlot, bH as normalizeProps, as as mergeProps, aj as unref, ap as createVNode, ao as withCtx, bA as withDirectives, bb as normalizeClass, D as createBaseVNode, aN as toDisplayString, h as computed, aP as _export_sfc } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "TransactionDetails",
  props: {
    infoOnly: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const attrs = useAttrs();
    const visible = ref(false);
    watch(
      () => props.disabled,
      (isDisabled) => {
        if (isDisabled) {
          visible.value = false;
        }
      }
    );
    const icon = computed(() => visible.value ? "arrows-chevron-top-24" : "arrows-chevron-bottom-24");
    const { t } = useTranslation();
    __expose({
      visible
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_popover_panel = resolveComponent("s-popover-panel");
      const _directive_button = resolveDirective("button");
      return __props.infoOnly ? (openBlock(), createElementBlock("div", normalizeProps(mergeProps({ key: 0 }, unref(attrs))), [
        renderSlot(_ctx.$slots, "default", {}, void 0, true)
      ], 16)) : (openBlock(), createElementBlock("span", normalizeProps(mergeProps({ key: 1 }, unref(attrs))), [
        createVNode(_component_s_popover_panel, {
          show: visible.value,
          "onUpdate:show": _cache[0] || (_cache[0] = ($event) => visible.value = $event),
          "visible-arrow": false,
          disabled: __props.disabled,
          placement: "bottom",
          "popper-class": "transaction-details-popper",
          trigger: "click"
        }, {
          reference: withCtx(() => [
            withDirectives((openBlock(), createElementBlock("div", {
              class: normalizeClass(["transaction-details", { visible: visible.value, disabled: __props.disabled }])
            }, [
              renderSlot(_ctx.$slots, "reference", {}, () => [
                createBaseVNode("span", null, toDisplayString(unref(t)("transactionDetailsText")), 1)
              ], true),
              createVNode(_component_s_icon, {
                name: icon.value,
                size: "16px",
                class: "transaction-details-icon"
              }, null, 8, ["name"])
            ], 2)), [
              [_directive_button]
            ])
          ]),
          default: withCtx(() => [
            renderSlot(_ctx.$slots, "default", {}, void 0, true)
          ]),
          _: 3
        }, 8, ["show", "disabled"])
      ], 16));
    };
  }
});
const TransactionDetails = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-a14a1b44"]]);
export {
  TransactionDetails as default
};
