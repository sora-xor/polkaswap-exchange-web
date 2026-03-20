import { z as defineComponent, aZ as components, u as useTranslation, e as useSettingsStore, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aN as toDisplayString, aj as unref, aO as createTextVNode, h as computed, ct as tmaSdkService, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "browser-notification-dialog__header" };
const _hoisted_2 = { class: "browser-notification-dialog" };
const _hoisted_3 = { class: "browser-notification-dialog__title" };
const _hoisted_4 = { class: "browser-notification-dialog__info" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{ name: "RotatePhoneDialog" },
  __name: "RotatePhoneDialog",
  setup(__props) {
    const DialogBase = components.DialogBase;
    const { t } = useTranslation();
    const settingsStore = useSettingsStore();
    const visibility = computed({
      get: () => {
        const dialogVisible = Boolean(settingsStore.rotatePhoneDialogVisibility);
        const hideFeatureEnabled = Boolean(settingsStore.isRotatePhoneHideBalanceFeatureEnabled);
        const accessDeclined = Boolean(settingsStore.isAccessAccelerometrEventDeclined);
        const rotationListener = Boolean(settingsStore.isAccessRotationListener);
        return dialogVisible && !hideFeatureEnabled && !accessDeclined && !rotationListener;
      },
      set: (flag) => {
        settingsStore.setRotatePhoneDialogVisibility(flag);
      }
    });
    const closeDialog = () => {
      visibility.value = false;
    };
    const enableRotatePhoneHideBalanceFeature = () => {
      const grantAccess = () => {
        settingsStore.setAccessGranted(true);
        settingsStore.setIsRotatePhoneHideBalanceFeatureEnabled(true);
        tmaSdkService.listenForDeviceRotation();
      };
      const denyAccess = () => {
        settingsStore.setAccessGranted(false);
        settingsStore.setIsAccessAccelerometrEventDeclined(true);
        console.warn("Device motion permission denied.");
      };
      if (!tmaSdkService.checkAccelerometerSupport()) {
        console.warn("Device does not support motion events.");
        closeDialog();
        return;
      }
      if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
        DeviceMotionEvent.requestPermission().then((permissionState) => {
          if (permissionState === "granted") {
            grantAccess();
          } else {
            denyAccess();
          }
        }).catch((error) => {
          console.error("Error requesting device motion permission:", error);
        }).finally(closeDialog);
        return;
      }
      grantAccess();
      closeDialog();
    };
    return (_ctx, _cache) => {
      const _component_s_image = resolveComponent("s-image");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(unref(DialogBase), {
        class: "browser-notification",
        visible: visibility.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => visibility.value = $event)
      }, {
        title: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(_component_s_image, {
              src: "browser-notification/rotate-phone-tg.png",
              class: "browser-notification-dialog__image",
              fit: "cover"
            })
          ])
        ]),
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_2, [
            createBaseVNode("p", _hoisted_3, toDisplayString(unref(t)("rotatePhoneNotification.title")), 1),
            createBaseVNode("p", _hoisted_4, toDisplayString(unref(t)("rotatePhoneNotification.info")), 1),
            createVNode(_component_s_button, {
              type: "primary",
              class: "s-typography-button--large browser-notification-dialog__btn",
              onClick: _cache[0] || (_cache[0] = ($event) => enableRotatePhoneHideBalanceFeature())
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(t)("browserPermission.btnAllow")), 1)
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
const RotatePhoneDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e1733eb7"]]);
export {
  RotatePhoneDialog as default
};
