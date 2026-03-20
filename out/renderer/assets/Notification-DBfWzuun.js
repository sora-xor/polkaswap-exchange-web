import { z as defineComponent, aZ as components, u as useTranslation, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aq as withModifiers, h as computed, D as createBaseVNode, aO as createTextVNode, aN as toDisplayString, s as store, b1 as resolveLibraryTheme, b2 as sanitizeHtml } from "./index-73GArslZ.js";
import { _ as _sfc_main$1 } from "./Moonpay.vue_vue_type_script_setup_true_lang-B8HGD9Zz.js";
import { M as MoonpayNotifications } from "./consts-Cuk5ZfDH.js";
const _hoisted_1 = ["innerHTML"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      MoonpayLogo: _sfc_main$1,
      DialogBase: components.DialogBase,
      SimpleNotification: components.SimpleNotification
    }
  },
  __name: "Notification",
  setup(__props) {
    const { t } = useTranslation();
    const visibility = computed({
      get: () => Boolean(store.state.moonpay.notificationVisibility),
      set: (flag) => {
        store.commit.moonpay.setNotificationVisibility(flag);
      }
    });
    const notificationKey = computed(() => store.state.moonpay.notificationKey);
    const libraryTheme = computed(() => resolveLibraryTheme(store));
    const success = computed(() => notificationKey.value === MoonpayNotifications.Success);
    const title = computed(() => {
      if (!notificationKey.value) return "";
      return t(`moonpay.notifications.${notificationKey.value}.title`);
    });
    const text = computed(() => {
      if (!notificationKey.value) return "";
      return t(`moonpay.notifications.${notificationKey.value}.text`);
    });
    const sanitizedText = computed(
      () => sanitizeHtml(text.value, {
        allowedTags: ["a", "span", "strong", "em", "p", "br"],
        allowedAttributes: {
          "*": ["class"],
          a: ["href", "rel", "target", "title", "class"]
        }
      })
    );
    const close = () => {
      visibility.value = false;
    };
    return (_ctx, _cache) => {
      const _component_simple_notification = resolveComponent("simple-notification");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: visibility.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => visibility.value = $event),
        class: "moonpay-dialog"
      }, {
        title: withCtx(() => [
          createVNode(_sfc_main$1, { theme: libraryTheme.value }, null, 8, ["theme"])
        ]),
        default: withCtx(() => [
          createVNode(_component_simple_notification, {
            success: success.value,
            onSubmit: withModifiers(close, ["prevent"])
          }, {
            title: withCtx(() => [
              createTextVNode(toDisplayString(title.value), 1)
            ]),
            text: withCtx(() => [
              createBaseVNode("div", { innerHTML: sanitizedText.value }, null, 8, _hoisted_1)
            ]),
            _: 1
          }, 8, ["success"])
        ]),
        _: 1
      }, 8, ["visible"]);
    };
  }
});
export {
  _sfc_main as default
};
