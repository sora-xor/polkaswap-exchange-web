import { z as defineComponent, bF as useAttrs, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, A as createElementBlock, bQ as Fragment, bP as renderList, h as computed, aM as createCommentVNode, as as mergeProps, aj as unref, b2 as sanitizeHtml } from "./index-73GArslZ.js";
const _hoisted_1 = ["innerHTML"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Tabs",
  props: {
    value: { default: "" },
    tabs: { default: () => [] }
  },
  setup(__props) {
    const props = __props;
    const attrs = useAttrs();
    const sanitizedTabs = computed(
      () => props.tabs.map((tab) => {
        if (!tab.content) return tab;
        return {
          ...tab,
          content: sanitizeHtml(tab.content, {
            allowedTags: ["a", "span", "strong", "em", "p", "br", "ul", "li"],
            allowedAttributes: {
              "*": ["class"],
              a: ["href", "rel", "target", "title"]
            }
          })
        };
      })
    );
    return (_ctx, _cache) => {
      const _component_s_tab = resolveComponent("s-tab");
      const _component_s_tabs = resolveComponent("s-tabs");
      return openBlock(), createBlock(_component_s_tabs, mergeProps({
        class: "settings-tabs",
        type: "rounded",
        value: __props.value
      }, unref(attrs)), {
        default: withCtx(() => [
          (openBlock(true), createElementBlock(Fragment, null, renderList(sanitizedTabs.value, (tab) => {
            return openBlock(), createBlock(_component_s_tab, {
              key: tab.name,
              name: tab.name,
              label: tab.label
            }, {
              default: withCtx(() => [
                tab.content ? (openBlock(), createElementBlock("p", {
                  key: 0,
                  innerHTML: tab.content,
                  class: "settings-content"
                }, null, 8, _hoisted_1)) : createCommentVNode("", true)
              ]),
              _: 2
            }, 1032, ["name", "label"]);
          }), 128))
        ]),
        _: 1
      }, 16, ["value"]);
    };
  }
});
export {
  _sfc_main as default
};
