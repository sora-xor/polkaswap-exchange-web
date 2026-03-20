import { z as defineComponent, bt as mergeModels, aZ as components, bu as useModel, u as useTranslation, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aK as KnownSymbols } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogBase: components.DialogBase,
      NetworkFeeWarning: components.NetworkFeeWarning
    }
  },
  __name: "NetworkFeeWarning",
  props: /* @__PURE__ */ mergeModels({
    fee: {},
    symbol: { default: KnownSymbols.XOR },
    payoff: { type: Boolean, default: true },
    appendToBody: { type: Boolean, default: true }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["confirm"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const visible = useModel(__props, "visible");
    const emit = __emit;
    useTranslation();
    function handleConfirm() {
      visible.value = false;
      emit("confirm");
    }
    return (_ctx, _cache) => {
      const _component_network_fee_warning = resolveComponent("network-fee-warning", true);
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: visible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => visible.value = $event),
        "append-to-body": __props.appendToBody,
        "modal-append-to-body": __props.appendToBody
      }, {
        default: withCtx(() => [
          createVNode(_component_network_fee_warning, {
            class: "network-fee",
            fee: __props.fee,
            symbol: __props.symbol,
            payoff: __props.payoff,
            onConfirm: handleConfirm
          }, null, 8, ["fee", "symbol", "payoff"])
        ]),
        _: 1
      }, 8, ["visible", "append-to-body", "modal-append-to-body"]);
    };
  }
});
export {
  _sfc_main as default
};
