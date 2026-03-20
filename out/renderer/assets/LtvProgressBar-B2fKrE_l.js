import { z as defineComponent, A as createElementBlock, C as openBlock, D as createBaseVNode, cd as normalizeStyle, h as computed, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "progress-bar-container" };
const _hoisted_2 = { class: "progress-bar" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "LtvProgressBar",
  props: {
    percentage: { default: 0 }
  },
  setup(__props) {
    const props = __props;
    const left = computed(() => {
      if (props.percentage >= 100) return "calc(100% - 8px)";
      if (props.percentage < 0) return "0%";
      return `${props.percentage}%`;
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          _cache[0] || (_cache[0] = createBaseVNode("div", { class: "success" }, null, -1)),
          _cache[1] || (_cache[1] = createBaseVNode("div", { class: "warning" }, null, -1)),
          _cache[2] || (_cache[2] = createBaseVNode("div", { class: "error" }, null, -1)),
          createBaseVNode("div", {
            class: "pointer",
            style: normalizeStyle({ left: left.value })
          }, null, 4)
        ])
      ]);
    };
  }
});
const LtvProgressBar = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-8d5f48ea"]]);
export {
  LtvProgressBar as default
};
