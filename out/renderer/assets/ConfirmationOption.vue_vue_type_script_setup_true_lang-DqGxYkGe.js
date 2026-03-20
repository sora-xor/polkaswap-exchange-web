import { z as defineComponent, u as useTranslation, r as requireLegacyStore, h as computed, am as createBlock, C as openBlock, ao as withCtx, aJ as renderSlot, aj as unref } from "./index-73GArslZ.js";
import { A as AccountSettingsOption } from "./Option-DNliqlst.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ConfirmationOption",
  props: {
    withHint: { type: Boolean, default: false }
  },
  setup(__props, { expose: __expose }) {
    const { t } = useTranslation();
    const store = requireLegacyStore();
    const model = computed({
      get: () => store.state.wallet.transactions.isConfirmTxDialogDisabled,
      set: (value) => {
        store.commit.wallet.transactions.setConfirmTxDialogDisabled(value);
      }
    });
    __expose({
      model
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(AccountSettingsOption, {
        modelValue: model.value,
        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => model.value = $event),
        title: unref(t)("accountSettings.confirmation.title"),
        hint: unref(t)("accountSettings.hint"),
        "with-hint": __props.withHint
      }, {
        default: withCtx(() => [
          renderSlot(_ctx.$slots, "default")
        ]),
        _: 3
      }, 8, ["modelValue", "title", "hint", "with-hint"]);
    };
  }
});
export {
  _sfc_main as _
};
