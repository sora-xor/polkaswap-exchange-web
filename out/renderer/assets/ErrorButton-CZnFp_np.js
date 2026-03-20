import { z as defineComponent, u as useTranslation, a_ as resolveComponent, A as createElementBlock, C as openBlock, D as createBaseVNode, ap as createVNode, aN as toDisplayString, aj as unref } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ErrorButton",
  props: {
    error: { default: "" }
  },
  setup(__props) {
    const { t } = useTranslation();
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      return openBlock(), createElementBlock("span", null, [
        createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.cantPlaceOrder")), 1),
        createVNode(_component_s_icon, {
          name: "info-16",
          class: "book-inform-icon-btn"
        })
      ]);
    };
  }
});
export {
  _sfc_main as default
};
