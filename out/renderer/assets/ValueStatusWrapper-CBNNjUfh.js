import { g as getDifferenceStatus, D as DifferenceStatus } from "./swap-sOuQz5wL.js";
import { z as defineComponent, a_ as resolveComponent, A as createElementBlock, C as openBlock, am as createBlock, aM as createCommentVNode, aJ as renderSlot, h as computed, bb as normalizeClass, aP as _export_sfc } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ValueStatusWrapper",
  props: {
    badge: { type: Boolean, default: false },
    value: { default: "" },
    errorIconSize: { default: "12" },
    getStatus: { type: Function, default: getDifferenceStatus }
  },
  setup(__props) {
    const props = __props;
    const formatted = computed(() => {
      const numericValue = Number(props.value);
      return Number.isFinite(numericValue) ? numericValue : 0;
    });
    const status = computed(() => props.getStatus(formatted.value));
    const errorIcon = computed(() => status.value === DifferenceStatus.Error && props.badge);
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["value-status-wrapper", status.value, { badge: __props.badge }])
      }, [
        errorIcon.value ? (openBlock(), createBlock(_component_s_icon, {
          key: 0,
          class: "value-status-wrapper-icon",
          name: "notifications-alert-triangle-24",
          size: __props.errorIconSize
        }, null, 8, ["size"])) : createCommentVNode("", true),
        renderSlot(_ctx.$slots, "default", {}, void 0, true)
      ], 2);
    };
  }
});
const ValueStatusWrapper = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-df7f65cb"]]);
export {
  ValueStatusWrapper as default
};
