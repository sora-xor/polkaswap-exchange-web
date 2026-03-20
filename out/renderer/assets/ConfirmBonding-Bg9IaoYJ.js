import { z as defineComponent, bt as mergeModels, aZ as components, bu as useModel, u as useTranslation, at as useRoute, X as XOR, h as computed, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aN as toDisplayString, aO as createTextVNode, aj as unref, V as PageNames, s as store, O as Operation, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "tokens" };
const _hoisted_2 = { class: "tokens-info-container" };
const _hoisted_3 = { class: "token-value" };
const _hoisted_4 = { class: "token" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogBase: components.DialogBase,
      InfoLine: components.InfoLine,
      TokenLogo: components.TokenLogo,
      AccountConfirmationOption: components.AccountConfirmationOption
    }
  },
  __name: "ConfirmBonding",
  props: {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  },
  emits: /* @__PURE__ */ mergeModels(["close", "confirm"], ["update:visible"]),
  setup(__props, { expose: __expose, emit: __emit }) {
    const emit = __emit;
    const isVisible = useModel(__props, "visible");
    const { t } = useTranslation();
    const { formatStringValue, formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();
    const route = useRoute();
    const xor = XOR;
    const amount = computed(() => store.state.referrals.amount);
    const networkFees = computed(() => store.state.wallet.settings.networkFees);
    const xorSymbol = XOR.symbol;
    const isBond = computed(() => route.name === PageNames.ReferralBonding);
    const formattedAmount = computed(() => formatStringValue(amount.value, XOR.decimals));
    const networkFee = computed(
      () => networkFees.value[isBond.value ? Operation.ReferralReserveXor : Operation.ReferralUnreserveXor]
    );
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const networkFeeFiat = computed(() => getFiatAmountByCodecString(networkFee.value, XOR));
    const handleConfirmBonding = () => {
      emit("confirm");
      isVisible.value = false;
    };
    __expose({
      handleConfirmBonding,
      isBond,
      formattedAmount,
      networkFeeFormatted,
      xor
    });
    return (_ctx, _cache) => {
      const _component_token_logo = resolveComponent("token-logo");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_info_line = resolveComponent("info-line");
      const _component_account_confirmation_option = resolveComponent("account-confirmation-option");
      const _component_s_button = resolveComponent("s-button");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event),
        title: unref(t)(`referralProgram.confirm.${isBond.value ? "bond" : "unbond"}`),
        "custom-class": "dialog--confirm-bond"
      }, {
        footer: withCtx(() => [
          createVNode(_component_account_confirmation_option, {
            "with-hint": "",
            class: "confirmation-option"
          }),
          createVNode(_component_s_button, {
            type: "primary",
            class: "s-typography-button--large",
            onClick: handleConfirmBonding
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(unref(t)("confirmText")), 1)
            ]),
            _: 1
          })
        ]),
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("span", _hoisted_3, toDisplayString(formattedAmount.value), 1),
              createBaseVNode("div", _hoisted_4, [
                createVNode(_component_token_logo, {
                  class: "token-logo",
                  token: unref(xor)
                }, null, 8, ["token"]),
                createTextVNode(" " + toDisplayString(unref(xorSymbol)), 1)
              ])
            ])
          ]),
          createVNode(_component_s_divider),
          createVNode(_component_info_line, {
            label: unref(t)("networkFeeText"),
            "label-tooltip": unref(t)("networkFeeTooltipText"),
            value: networkFeeFormatted.value,
            "asset-symbol": unref(xorSymbol),
            "fiat-value": networkFeeFiat.value,
            "is-formatted": ""
          }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const ConfirmBonding = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-eb060ce4"]]);
export {
  ConfirmBonding as default
};
