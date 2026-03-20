import { z as defineComponent, Z as ZeroStringValue, aZ as components, u as useTranslation, a9 as ref, aA as watch, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aj as unref, aO as createTextVNode, aN as toDisplayString, h as computed } from "./index-73GArslZ.js";
import { u as useSwapStore } from "./swap-DtWqRzUD.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "LossWarningDialog",
  props: {
    visible: { type: Boolean },
    value: { default: ZeroStringValue },
    appendToBody: { type: Boolean, default: false }
  },
  emits: ["update:visible", "confirm"],
  setup(__props, { emit: __emit }) {
    const DialogBase = components.DialogBase;
    const SimpleNotification = components.SimpleNotification;
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const swapStore = useSwapStore();
    const isVisible = ref(props.visible);
    watch(
      () => props.visible,
      (value2) => {
        isVisible.value = value2;
      },
      { immediate: true }
    );
    watch(isVisible, (value2) => {
      emit("update:visible", value2);
    });
    const appendToBody = computed(() => props.appendToBody);
    const value = computed(() => props.value);
    const hidePopup = ref(false);
    const handleConfirm = async () => {
      swapStore.setAllowLossPopup(!hidePopup.value);
      isVisible.value = false;
      emit("confirm");
    };
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(DialogBase), {
        visible: isVisible.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => isVisible.value = $event),
        "append-to-body": appendToBody.value,
        "modal-append-to-body": appendToBody.value
      }, {
        default: withCtx(() => [
          createVNode(unref(SimpleNotification), {
            optional: "",
            "modal-content": "",
            modelValue: hidePopup.value,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => hidePopup.value = $event),
            "button-text": unref(t)("confirmNextTxFailure.button"),
            onSubmit: handleConfirm
          }, {
            title: withCtx(() => [
              createTextVNode(toDisplayString(unref(t)("confirmNextTxFailure.header")), 1)
            ]),
            text: withCtx(() => [
              createTextVNode(toDisplayString(unref(t)("exchange.lossWarning", { value: value.value })), 1)
            ]),
            _: 1
          }, 8, ["modelValue", "button-text"])
        ]),
        _: 1
      }, 8, ["visible", "append-to-body", "modal-append-to-body"]);
    };
  }
});
export {
  _sfc_main as default
};
