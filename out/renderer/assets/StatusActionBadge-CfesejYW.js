import { z as defineComponent, aP as _export_sfc, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, aJ as renderSlot } from "./index-73GArslZ.js";
const _sfc_main = defineComponent({
  name: "SwapStatusActionBadge"
});
const _hoisted_1 = { class: "status-action-badge__label" };
const _hoisted_2 = { class: "status-action-badge__value" };
const _hoisted_3 = { class: "status-action-badge__action" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_s_card = resolveComponent("s-card");
  return openBlock(), createBlock(_component_s_card, {
    shadow: "always",
    size: "small",
    "border-radius": "small",
    class: "status-action-badge"
  }, {
    default: withCtx(() => [
      createBaseVNode("span", _hoisted_1, [
        renderSlot(_ctx.$slots, "label", {}, void 0, true)
      ]),
      createBaseVNode("span", _hoisted_2, [
        renderSlot(_ctx.$slots, "value", {}, void 0, true)
      ]),
      createBaseVNode("div", _hoisted_3, [
        renderSlot(_ctx.$slots, "action", {}, void 0, true)
      ])
    ]),
    _: 3
  });
}
const StatusActionBadge = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-c436d937"]]);
export {
  StatusActionBadge as default
};
