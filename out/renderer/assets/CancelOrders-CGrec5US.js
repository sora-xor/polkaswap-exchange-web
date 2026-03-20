import { z as defineComponent, bt as mergeModels, aZ as components, bu as useModel, u as useTranslation, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aN as toDisplayString, aj as unref } from "./index-73GArslZ.js";
import { C as Cancel } from "./orderBook-BhgledRv.js";
const _hoisted_1 = { class: "order-book-cancel-dialog" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogBase: components.DialogBase,
      AccountConfirmationOption: components.AccountConfirmationOption
    }
  },
  __name: "CancelOrders",
  props: {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  },
  emits: /* @__PURE__ */ mergeModels(["confirm"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const visible = useModel(__props, "visible");
    const { t } = useTranslation();
    function handleCancel() {
      visible.value = false;
      emit("confirm", Cancel.all);
    }
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_account_confirmation_option = resolveComponent("account-confirmation-option");
      const _component_s_button = resolveComponent("s-button");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: visible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => visible.value = $event)
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(_component_s_icon, {
              name: "notifications-alert-triangle-24",
              size: "64"
            }),
            createBaseVNode("h4", null, toDisplayString(unref(t)("orderBook.dialog.askCancel")), 1),
            createVNode(_component_account_confirmation_option, {
              "with-hint": "",
              class: "confirmation-option"
            }),
            createVNode(_component_s_button, {
              type: "primary",
              class: "btn s-typography-button--medium",
              disabled: !visible.value,
              onClick: handleCancel
            }, {
              default: withCtx(() => [
                createBaseVNode("span", null, toDisplayString(unref(t)("orderBook.dialog.cancelAll")), 1)
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
