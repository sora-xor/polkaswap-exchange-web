import { z as defineComponent, a_ as resolveComponent, A as createElementBlock, C as openBlock, D as createBaseVNode, aJ as renderSlot, ap as createVNode, h as computed, bb as normalizeClass, aM as createCommentVNode, aN as toDisplayString, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "settings-option-label-title" };
const _hoisted_2 = {
  key: 0,
  class: "settings-option-label-hint"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Option",
  props: {
    hint: { default: "" },
    title: { default: "" },
    disabled: { type: Boolean, default: false },
    withHint: { type: Boolean, default: false },
    modelValue: { type: Boolean, default: false }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const model = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value)
    });
    return (_ctx, _cache) => {
      const _component_s_switch = resolveComponent("s-switch");
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["settings-option", { disabled: __props.disabled }])
      }, [
        createBaseVNode("label", {
          class: normalizeClass(["settings-option-label", { disabled: __props.disabled }])
        }, [
          createVNode(_component_s_switch, {
            modelValue: model.value,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => model.value = $event),
            disabled: __props.disabled
          }, null, 8, ["modelValue", "disabled"]),
          createBaseVNode("div", {
            class: normalizeClass(["settings-option-label-description", { hint: __props.withHint }])
          }, [
            createBaseVNode("span", _hoisted_1, toDisplayString(__props.title), 1),
            __props.withHint ? (openBlock(), createElementBlock("span", _hoisted_2, toDisplayString(__props.hint), 1)) : createCommentVNode("", true)
          ], 2)
        ], 2),
        renderSlot(_ctx.$slots, "default", {}, void 0, true)
      ], 2);
    };
  }
});
const AccountSettingsOption = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-3d75060d"]]);
export {
  AccountSettingsOption as A
};
