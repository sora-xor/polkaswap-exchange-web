import { z as defineComponent, dk as useSlots, bm as toRefs, a_ as resolveComponent, A as createElementBlock, C as openBlock, aO as createTextVNode, am as createBlock, aM as createCommentVNode, aN as toDisplayString, aj as unref, h as computed, ao as withCtx, ap as createVNode, aJ as renderSlot, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "settings-header" };
const tooltipScopedSlot = "tooltip-content";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{ name: "MarketAlgorithmHeader" },
  __name: "Header",
  props: {
    title: { default: "" },
    tooltip: { default: "" }
  },
  setup(__props) {
    const props = __props;
    const slots = useSlots();
    const { title, tooltip } = toRefs(props);
    const hasTooltipContent = computed(() => !!tooltip.value || !!slots[tooltipScopedSlot]);
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createTextVNode(toDisplayString(unref(title)) + " ", 1),
        hasTooltipContent.value ? (openBlock(), createBlock(_component_s_tooltip, {
          key: 0,
          content: unref(tooltip),
          "popper-class": "info-tooltip info-tooltip--settings-header",
          placement: "right-start",
          "border-radius": "mini",
          tabindex: "-1"
        }, {
          content: withCtx(() => [
            renderSlot(_ctx.$slots, tooltipScopedSlot, {}, void 0, true)
          ]),
          default: withCtx(() => [
            createVNode(_component_s_icon, {
              class: "settings-header-hint",
              name: "info-16",
              size: "14px"
            })
          ]),
          _: 3
        }, 8, ["content"])) : createCommentVNode("", true)
      ]);
    };
  }
});
const SwapSettingsHeader = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-08e4d63c"]]);
export {
  SwapSettingsHeader as default
};
