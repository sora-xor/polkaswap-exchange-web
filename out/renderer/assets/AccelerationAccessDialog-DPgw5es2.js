import { z as defineComponent, aZ as components, u as useTranslation, e as useSettingsStore, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aN as toDisplayString, aj as unref, aO as createTextVNode, h as computed } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "browser-notification-dialog" };
const _hoisted_2 = { class: "browser-notification-dialog__title" };
const _hoisted_3 = { class: "browser-notification-dialog__info" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "AccelerationAccessDialog",
    components: {
      DialogBase: components.DialogBase
    }
  },
  __name: "AccelerationAccessDialog",
  setup(__props) {
    const { t } = useTranslation();
    const settingsStore = useSettingsStore();
    const rotatePhoneDialogVisibility = computed(() => settingsStore.rotatePhoneDialogVisibility);
    const isAccessAccelerometrEventDeclined = computed(() => settingsStore.isAccessAccelerometrEventDeclined);
    const isAccessRotationListener = computed(() => settingsStore.isAccessRotationListener);
    const isVisible = computed({
      get: () => rotatePhoneDialogVisibility.value && !isAccessRotationListener.value && isAccessAccelerometrEventDeclined.value,
      set: (flag) => settingsStore.setRotatePhoneDialogVisibility(flag)
    });
    function reloadPage() {
      window.location.reload();
    }
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event),
        class: "browser-notification"
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("p", _hoisted_2, toDisplayString(unref(t)("rotatePhoneNotification.enableAcceleration")), 1),
            createBaseVNode("p", _hoisted_3, toDisplayString(unref(t)("rotatePhoneNotification.gyroscropePhone")), 1),
            createVNode(_component_s_button, {
              type: "secondary",
              class: "s-typography-button--large browser-notification-dialog__btn",
              onClick: reloadPage
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(t)("provider.messages.reloadPage")), 1)
              ]),
              _: 1
            })
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
