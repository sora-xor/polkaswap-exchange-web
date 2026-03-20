import { z as defineComponent, a_ as resolveComponent, A as createElementBlock, C as openBlock, aJ as renderSlot, D as createBaseVNode, am as createBlock, aM as createCommentVNode, aO as createTextVNode, aN as toDisplayString, bb as normalizeClass, h as computed, aP as _export_sfc } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "GenericPageHeader",
  props: {
    hasButtonBack: { type: Boolean, default: false },
    bold: { type: Boolean, default: false },
    title: { default: "" },
    tooltip: { default: "" },
    tooltipPlacement: { default: "right-start" }
  },
  emits: ["back"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const headerClasses = computed(() => {
      const baseClass = "page-header";
      return props.hasButtonBack ? `${baseClass} ${baseClass}--center` : baseClass;
    });
    const handleBack = (event) => {
      emit("back", event);
    };
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(headerClasses.value)
      }, [
        renderSlot(_ctx.$slots, "back", {}, () => [
          __props.hasButtonBack ? (openBlock(), createBlock(_component_s_button, {
            key: 0,
            type: "action",
            icon: "arrows-chevron-left-rounded-24",
            onClick: _cache[0] || (_cache[0] = ($event) => handleBack($event))
          })) : createCommentVNode("", true)
        ], true),
        createBaseVNode("h3", {
          class: normalizeClass(["page-header-title", { bold: __props.bold }])
        }, [
          renderSlot(_ctx.$slots, "title", {}, () => [
            createTextVNode(toDisplayString(__props.title), 1)
          ], true),
          __props.tooltip ? (openBlock(), createBlock(_component_s_tooltip, {
            key: 0,
            class: "page-header-tooltip s-icon-info-16",
            "wrapper-tag": "i",
            "popper-class": "info-tooltip info-tooltip--page-header",
            "border-radius": "mini",
            content: __props.tooltip,
            placement: __props.tooltipPlacement,
            tabindex: "-1"
          }, null, 8, ["content", "placement"])) : createCommentVNode("", true)
        ], 2),
        renderSlot(_ctx.$slots, "default", {}, void 0, true)
      ], 2);
    };
  }
});
const GenericPageHeader = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-6f41d01d"]]);
export {
  GenericPageHeader as default
};
