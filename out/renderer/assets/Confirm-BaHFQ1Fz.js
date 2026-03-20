import { z as defineComponent, bt as mergeModels, bu as useModel, c1 as useI18n, aZ as components, bD as poolLazyComponent, bE as PoolComponents, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aN as toDisplayString, h as computed, A as createElementBlock, aM as createCommentVNode, aO as createTextVNode, aj as unref, x as useNumberFormatter, s as store, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "tokens" };
const _hoisted_2 = { class: "tokens-info-container" };
const _hoisted_3 = { class: "token-value" };
const _hoisted_4 = { class: "token-value" };
const _hoisted_5 = { class: "tokens-info-container" };
const _hoisted_6 = {
  key: 0,
  class: "token"
};
const _hoisted_7 = {
  key: 1,
  class: "token"
};
const _hoisted_8 = { class: "transaction-message" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Confirm",
  props: /* @__PURE__ */ mergeModels({
    parentLoading: { type: Boolean, default: false }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["close", "confirm"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const isVisible = useModel(__props, "visible");
    const { t } = useI18n();
    const { formatStringValue } = useNumberFormatter();
    const firstTokenAmount = computed(() => store.state.removeLiquidity.firstTokenAmount);
    const secondTokenAmount = computed(() => store.state.removeLiquidity.secondTokenAmount);
    const slippageTolerance = computed(() => store.state.settings.slippageTolerance);
    const firstToken = computed(() => store.getters.removeLiquidity.firstToken);
    const secondToken = computed(() => store.getters.removeLiquidity.secondToken);
    const formattedFromValue = computed(() => formatStringValue(firstTokenAmount.value));
    const formattedToValue = computed(() => formatStringValue(secondTokenAmount.value));
    const closeDialog = () => {
      emit("close");
      isVisible.value = false;
    };
    const handleConfirmRemoveLiquidity = () => {
      emit("confirm");
      closeDialog();
    };
    const DialogBase = components.DialogBase;
    const TokenLogo = components.TokenLogo;
    const AccountConfirmationOption = components.AccountConfirmationOption;
    const RemoveLiquidityTransactionDetails = poolLazyComponent(PoolComponents.RemoveLiquidityTransactionDetails);
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(unref(DialogBase), {
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event),
        title: unref(t)("removeLiquidity.confirmTitle"),
        "append-to-body": ""
      }, {
        footer: withCtx(() => [
          createVNode(unref(AccountConfirmationOption), {
            "with-hint": "",
            class: "confirmation-option"
          }),
          createVNode(_component_s_button, {
            type: "primary",
            class: "s-typography-button--large",
            loading: props.parentLoading,
            onClick: handleConfirmRemoveLiquidity
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(unref(t)("confirmText")), 1)
            ]),
            _: 1
          }, 8, ["loading"])
        ]),
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("span", _hoisted_3, toDisplayString(formattedFromValue.value), 1),
              createVNode(_component_s_icon, {
                class: "icon-divider",
                name: "plus-16"
              }),
              createBaseVNode("span", _hoisted_4, toDisplayString(formattedToValue.value), 1)
            ]),
            createBaseVNode("div", _hoisted_5, [
              firstToken.value ? (openBlock(), createElementBlock("div", _hoisted_6, [
                createVNode(unref(TokenLogo), {
                  class: "token-logo",
                  token: firstToken.value
                }, null, 8, ["token"]),
                createTextVNode(" " + toDisplayString(firstToken.value.symbol), 1)
              ])) : createCommentVNode("", true),
              secondToken.value ? (openBlock(), createElementBlock("div", _hoisted_7, [
                createVNode(unref(TokenLogo), {
                  class: "token-logo",
                  token: secondToken.value
                }, null, 8, ["token"]),
                createTextVNode(" " + toDisplayString(secondToken.value.symbol), 1)
              ])) : createCommentVNode("", true)
            ])
          ]),
          createBaseVNode("p", _hoisted_8, toDisplayString(unref(t)("removeLiquidity.outputMessage", { slippageTolerance: unref(formatStringValue)(slippageTolerance.value) })), 1),
          createVNode(_component_s_divider),
          createVNode(unref(RemoveLiquidityTransactionDetails))
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const Confirm = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-ec1536b3"]]);
export {
  Confirm as default
};
