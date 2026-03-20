import { z as defineComponent, aK as KnownSymbols, u as useTranslation, aL as getWalletStore, a9 as ref, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, A as createElementBlock, aM as createCommentVNode, aN as toDisplayString, aj as unref, aO as createTextVNode, aq as withModifiers } from "./index-73GArslZ.js";
import SimpleNotification from "./SimpleNotification-De0sbHHr.js";
const _hoisted_1 = { key: 0 };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "NetworkFeeWarning",
  props: {
    fee: { default: void 0 },
    symbol: { default: KnownSymbols.XOR },
    payoff: { type: Boolean, default: true }
  },
  emits: ["confirm"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const emit = __emit;
    const { t } = useTranslation();
    const store = getWalletStore();
    const hidePopup = ref(false);
    const handleConfirm = async () => {
      store.commit.wallet.settings.setAllowFeePopup(!hidePopup.value);
      emit("confirm");
    };
    __expose({
      hidePopup,
      handleConfirm
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(SimpleNotification, {
        modelValue: hidePopup.value,
        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => hidePopup.value = $event),
        optional: "",
        "modal-content": "",
        "button-text": unref(t)("confirmNextTxFailure.button"),
        onSubmit: withModifiers(handleConfirm, ["prevent"])
      }, {
        title: withCtx(() => [
          createTextVNode(toDisplayString(unref(t)("confirmNextTxFailure.header")), 1)
        ]),
        text: withCtx(() => [
          createBaseVNode("div", null, toDisplayString(unref(t)("confirmNextTxFailure.info", { fee: __props.fee, symbol: __props.symbol })), 1),
          __props.payoff ? (openBlock(), createElementBlock("div", _hoisted_1, toDisplayString(unref(t)("confirmNextTxFailure.payoff")), 1)) : createCommentVNode("", true)
        ]),
        _: 1
      }, 8, ["modelValue", "button-text"]);
    };
  }
});
export {
  _sfc_main as _
};
