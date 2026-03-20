import { z as defineComponent, aP as _export_sfc, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, cd as normalizeStyle, aJ as renderSlot } from "./index-73GArslZ.js";
const _sfc_main = defineComponent({
  props: {
    size: { default: 0, type: Number },
    visible: { default: 7, type: Number },
    itemOffset: { default: 8, type: Number },
    itemHeight: { default: 60, type: Number }
  },
  computed: {
    style() {
      const styles = {};
      if (this.size >= this.visible) {
        const height = (this.itemHeight + this.itemOffset) * this.visible - this.itemOffset;
        styles.height = `${height}px`;
      }
      return styles;
    }
  }
});
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_s_scrollbar = resolveComponent("s-scrollbar");
  return openBlock(), createBlock(_component_s_scrollbar, {
    class: "connection-items",
    style: normalizeStyle(_ctx.style)
  }, {
    default: withCtx(() => [
      createBaseVNode("div", {
        class: "connection-items-list",
        style: normalizeStyle({ gap: `${_ctx.itemOffset}px` })
      }, [
        renderSlot(_ctx.$slots, "default")
      ], 4)
    ]),
    _: 3
  }, 8, ["style"]);
}
const ConnectionItems = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  ConnectionItems as default
};
