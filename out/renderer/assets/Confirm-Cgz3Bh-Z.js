import { z as defineComponent, aZ as components, ak as lazyComponent, al as Components, u as useTranslation, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, A as createElementBlock, aM as createCommentVNode, aN as toDisplayString, h as computed, aj as unref, aO as createTextVNode, bb as normalizeClass, b2 as sanitizeHtml, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useSwapAmounts } from "./useSwapAmounts-COuMA7gl.js";
import { u as useSwapStore } from "./swap-DtWqRzUD.js";
const _hoisted_1 = { class: "tokens" };
const _hoisted_2 = { class: "tokens-info-container" };
const _hoisted_3 = { class: "token-value" };
const _hoisted_4 = {
  key: 0,
  class: "token"
};
const _hoisted_5 = { class: "tokens-info-container" };
const _hoisted_6 = { class: "token-value" };
const _hoisted_7 = {
  key: 0,
  class: "token"
};
const _hoisted_8 = ["innerHTML"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "SwapConfirm",
    components: {
      DialogBase: components.DialogBase,
      TokenLogo: components.TokenLogo,
      AccountConfirmationOption: components.AccountConfirmationOption
    }
  },
  __name: "Confirm",
  props: {
    visible: { type: Boolean },
    isInsufficientBalance: { type: Boolean, default: false },
    appendToBody: { type: Boolean, default: false }
  },
  emits: ["update:visible", "confirm"],
  setup(__props, { emit: __emit }) {
    const SwapTransactionDetails = lazyComponent(Components.SwapTransactionDetails);
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const { formatStringValue, formatCodecNumber } = useFormattedAmount();
    const { tokenFrom, tokenTo, fromValue, toValue } = useSwapAmounts();
    const swapStore = useSwapStore();
    const visible = computed({
      get: () => props.visible,
      set: (value) => emit("update:visible", value)
    });
    const appendToBody = computed(() => props.appendToBody);
    const isInsufficientBalance = computed(() => props.isInsufficientBalance);
    const isExchangeB = computed(() => swapStore.isExchangeB);
    const minMaxReceived = computed(() => swapStore.minMaxReceived);
    const decimalsFrom = computed(() => tokenFrom.value?.decimals);
    const decimalsTo = computed(() => tokenTo.value?.decimals);
    const formattedFromValue = computed(() => formatStringValue(fromValue.value, decimalsFrom.value));
    const formattedToValue = computed(() => formatStringValue(toValue.value, decimalsTo.value));
    const formattedMinMaxReceived = computed(
      () => formatCodecNumber(minMaxReceived.value, (isExchangeB.value ? decimalsFrom.value : decimalsTo.value) ?? void 0)
    );
    const swapMessageHtml = computed(() => {
      const translation = t(`swap.swap${isExchangeB.value ? "Input" : "Output"}Message`, {
        transactionValue: `<span class='transaction-number'>${formattedMinMaxReceived.value}</span>`
      });
      return sanitizeHtml(translation, {
        allowedTags: ["span", "strong", "em", "p", "br"],
        allowedAttributes: {
          span: ["class"]
        }
      });
    });
    const handleConfirm = () => {
      emit("confirm");
      visible.value = false;
    };
    return (_ctx, _cache) => {
      const _component_token_logo = resolveComponent("token-logo");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_account_confirmation_option = resolveComponent("account-confirmation-option");
      const _component_s_button = resolveComponent("s-button");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: visible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => visible.value = $event),
        title: unref(t)("swap.confirmSwap"),
        "append-to-body": appendToBody.value,
        "modal-append-to-body": appendToBody.value,
        "custom-class": "dialog--confirm-swap"
      }, {
        footer: withCtx(() => [
          createVNode(_component_account_confirmation_option, {
            "with-hint": "",
            class: "confirmation-option"
          }),
          createVNode(_component_s_button, {
            type: "primary",
            class: "s-typography-button--large",
            disabled: isInsufficientBalance.value,
            onClick: handleConfirm
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(unref(t)("confirmText")), 1)
            ]),
            _: 1
          }, 8, ["disabled"])
        ]),
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("span", _hoisted_3, toDisplayString(formattedFromValue.value), 1),
              unref(tokenFrom) ? (openBlock(), createElementBlock("div", _hoisted_4, [
                createVNode(_component_token_logo, {
                  class: "token-logo",
                  token: unref(tokenFrom)
                }, null, 8, ["token"]),
                createTextVNode(" " + toDisplayString(unref(tokenFrom).symbol), 1)
              ])) : createCommentVNode("", true)
            ]),
            createVNode(_component_s_icon, {
              class: "icon-divider",
              name: "arrows-arrow-bottom-24"
            }),
            createBaseVNode("div", _hoisted_5, [
              createBaseVNode("span", _hoisted_6, toDisplayString(formattedToValue.value), 1),
              unref(tokenTo) ? (openBlock(), createElementBlock("div", _hoisted_7, [
                createVNode(_component_token_logo, {
                  class: "token-logo",
                  token: unref(tokenTo)
                }, null, 8, ["token"]),
                createTextVNode(" " + toDisplayString(unref(tokenTo).symbol), 1)
              ])) : createCommentVNode("", true)
            ])
          ]),
          createBaseVNode("p", {
            class: normalizeClass(["transaction-message", { "transaction-message--min-received": !isExchangeB.value }]),
            innerHTML: swapMessageHtml.value
          }, null, 10, _hoisted_8),
          createVNode(_component_s_divider),
          createVNode(unref(SwapTransactionDetails), {
            full: "",
            expanded: ""
          })
        ]),
        _: 1
      }, 8, ["visible", "title", "append-to-body", "modal-append-to-body"]);
    };
  }
});
const Confirm = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-b0f762a9"]]);
export {
  Confirm as default
};
