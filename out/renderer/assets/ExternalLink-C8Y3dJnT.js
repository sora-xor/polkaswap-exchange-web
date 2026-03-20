import { z as defineComponent, A as createElementBlock, C as openBlock, D as createBaseVNode, aN as toDisplayString, bb as normalizeClass, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = ["href"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ExternalLink",
  props: {
    title: { default: "" },
    href: { default: "" },
    defaultClass: { default: "p4" }
  },
  setup(__props) {
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("a", {
        class: normalizeClass(["external-link", __props.defaultClass]),
        href: __props.href,
        target: "_blank",
        rel: "nofollow noopener"
      }, [
        createBaseVNode("span", null, toDisplayString(__props.title), 1)
      ], 10, _hoisted_1);
    };
  }
});
const ExternalLink = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7459e480"]]);
export {
  ExternalLink as default
};
