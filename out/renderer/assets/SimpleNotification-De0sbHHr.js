import { z as defineComponent, u as useTranslation, a_ as resolveComponent, am as createBlock, C as openBlock, aq as withModifiers, bb as normalizeClass, ao as withCtx, ap as createVNode, D as createBaseVNode, A as createElementBlock, aM as createCommentVNode, aJ as renderSlot, h as computed, bQ as Fragment, aN as toDisplayString, aj as unref, aO as createTextVNode, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "simple-notification__title" };
const _hoisted_2 = {
  key: 0,
  class: "simple-notification__text"
};
const _hoisted_3 = { class: "simple-notification__switch" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "SimpleNotification",
  props: {
    success: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    optional: { type: Boolean, default: false },
    modalContent: { type: Boolean, default: false },
    buttonText: { default: "" },
    modelValue: { type: Boolean, default: false }
  },
  emits: ["update:modelValue", "submit"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const optionalModel = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value)
    });
    const iconName = computed(() => props.success ? "basic-check-mark-24" : "notifications-alert-triangle-24");
    const btnText = computed(() => props.buttonText || t("closeText"));
    const handleSubmit = () => {
      emit("submit");
    };
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_s_switch = resolveComponent("s-switch");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_form = resolveComponent("s-form");
      return openBlock(), createBlock(_component_s_form, {
        class: normalizeClass(["simple-notification", { "modal-content": __props.modalContent }]),
        onSubmit: withModifiers(handleSubmit, ["prevent"])
      }, {
        default: withCtx(() => [
          createVNode(_component_s_icon, {
            class: normalizeClass(["simple-notification-icon", { success: __props.success }]),
            name: iconName.value,
            size: "64"
          }, null, 8, ["class", "name"]),
          createBaseVNode("div", _hoisted_1, [
            renderSlot(_ctx.$slots, "title", {}, void 0, true)
          ]),
          _ctx.$slots.text ? (openBlock(), createElementBlock("div", _hoisted_2, [
            renderSlot(_ctx.$slots, "text", {}, void 0, true)
          ])) : createCommentVNode("", true),
          renderSlot(_ctx.$slots, "default", {}, void 0, true),
          __props.optional ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
            createVNode(_component_s_divider, { class: "simple-notification__divider" }),
            createBaseVNode("div", _hoisted_3, [
              createVNode(_component_s_switch, {
                modelValue: optionalModel.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => optionalModel.value = $event)
              }, null, 8, ["modelValue"]),
              createBaseVNode("span", null, toDisplayString(unref(t)("doNotShowText")), 1)
            ])
          ], 64)) : createCommentVNode("", true),
          createVNode(_component_s_button, {
            type: "primary",
            "native-type": "submit",
            class: "simple-notification__button s-typography-button--big",
            loading: __props.loading
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(btnText.value), 1)
            ]),
            _: 1
          }, 8, ["loading"])
        ]),
        _: 3
      }, 8, ["class"]);
    };
  }
});
const SimpleNotification = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-bfed8eac"]]);
export {
  SimpleNotification as default
};
