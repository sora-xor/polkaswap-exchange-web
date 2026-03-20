import { z as defineComponent, bt as mergeModels, aZ as components, bu as useModel, u as useTranslation, a9 as ref, aA as watch, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aN as toDisplayString, aj as unref, aO as createTextVNode } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "error-info-banner" };
const _hoisted_2 = { class: "error-info-banner__text" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogBase: components.DialogBase
    }
  },
  __name: "PaymentError",
  props: {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  },
  emits: /* @__PURE__ */ mergeModels(["close"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const visible = useModel(__props, "visible");
    const emit = __emit;
    const { t } = useTranslation();
    const loading = ref(false);
    const dialogVisible = ref(visible.value);
    watch(
      () => visible.value,
      (value) => {
        dialogVisible.value = value;
      }
    );
    watch(dialogVisible, (value) => {
      visible.value = value;
    });
    function closeDialog() {
      emit("close");
      dialogVisible.value = false;
    }
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: dialogVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => dialogVisible.value = $event)
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(_component_s_icon, {
              class: "error-info-banner__icon",
              name: "basic-clear-X-24",
              size: "64px"
            }),
            _cache[1] || (_cache[1] = createBaseVNode("h4", { class: "error-info-banner__header" }, "The payment widget is currently unavailable", -1)),
            createBaseVNode("p", _hoisted_2, toDisplayString(unref(t)("fiatPayment.errorMessage")), 1),
            createVNode(_component_s_button, {
              class: "error-info-banner__btn s-typography-button--large",
              type: "primary",
              disabled: loading.value,
              onClick: closeDialog
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(t)("browserNotificationDialog.agree")), 1)
              ]),
              _: 1
            }, 8, ["disabled"])
          ])
        ]),
        _: 1
      }, 8, ["visible"]);
    };
  }
});
export {
  _sfc_main as default
};
