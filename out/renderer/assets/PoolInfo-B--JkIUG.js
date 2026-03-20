import { z as defineComponent, aP as _export_sfc, A as createElementBlock, C as openBlock, aJ as renderSlot, D as createBaseVNode, aM as createCommentVNode } from "./index-73GArslZ.js";
const _sfc_main = defineComponent({
  name: "PoolInfo"
});
const _hoisted_1 = { class: "pool-info" };
const _hoisted_2 = { class: "pool-info-content" };
const _hoisted_3 = {
  key: 0,
  class: "pool-info-buttons"
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", _hoisted_1, [
    renderSlot(_ctx.$slots, "prepend"),
    createBaseVNode("div", _hoisted_2, [
      renderSlot(_ctx.$slots, "default")
    ]),
    _ctx.$slots.buttons ? (openBlock(), createElementBlock("div", _hoisted_3, [
      renderSlot(_ctx.$slots, "buttons")
    ])) : createCommentVNode("", true),
    renderSlot(_ctx.$slots, "append")
  ]);
}
const PoolInfo = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  PoolInfo as default
};
