import { z as defineComponent, bt as mergeModels, bu as useModel, u as useTranslation, aZ as components, ak as lazyComponent, al as Components, a_ as resolveComponent, am as createBlock, aM as createCommentVNode, c0 as toRef, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aN as toDisplayString, aO as createTextVNode, aj as unref, h as computed, A as createElementBlock, bQ as Fragment, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as usePoolApy } from "./usePoolApy-lSPKqmx4.js";
const _hoisted_1 = { class: "pool-tokens-amount" };
const _hoisted_2 = { class: "output-description" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Confirm",
  props: /* @__PURE__ */ mergeModels({
    shareOfPool: { default: "100" },
    firstToken: {},
    secondToken: {},
    firstTokenValue: { default: "" },
    secondTokenValue: { default: "" },
    price: { default: "0" },
    priceReversed: { default: "0" },
    slippageTolerance: { default: "0" },
    insufficientBalanceTokenSymbol: { default: "" },
    parentLoading: { type: Boolean, default: false }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["confirm", "close"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const isVisible = useModel(__props, "visible");
    const { t } = useTranslation();
    const { formatStringValue, getFiatAmount, getFPNumberFromCodec, Hundred } = useFormattedAmount();
    const { getPoolApy } = usePoolApy();
    const shareOfPool = toRef(props, "shareOfPool");
    const firstToken = toRef(props, "firstToken");
    const secondToken = toRef(props, "secondToken");
    const firstTokenValue = toRef(props, "firstTokenValue");
    const secondTokenValue = toRef(props, "secondTokenValue");
    const price = toRef(props, "price");
    const priceReversed = toRef(props, "priceReversed");
    const slippageTolerance = toRef(props, "slippageTolerance");
    const insufficientBalanceTokenSymbol = toRef(props, "insufficientBalanceTokenSymbol");
    const parentLoading = toRef(props, "parentLoading");
    const formattedFirstTokenValue = computed(
      () => firstToken.value ? formatStringValue(firstTokenValue.value, firstToken.value.decimals) : "0"
    );
    const formattedSecondTokenValue = computed(
      () => secondToken.value ? formatStringValue(secondTokenValue.value, secondToken.value.decimals) : "0"
    );
    const fiatFirstAmount = computed(
      () => firstToken.value ? getFiatAmount(firstTokenValue.value, firstToken.value) : null
    );
    const fiatSecondAmount = computed(
      () => secondToken.value ? getFiatAmount(secondTokenValue.value, secondToken.value) : null
    );
    const formattedPrice = computed(() => formatStringValue(price.value));
    const formattedPriceReversed = computed(() => formatStringValue(priceReversed.value));
    const formattedSlippageTolerance = computed(() => formatStringValue(slippageTolerance.value));
    const strategicBonusApy = computed(() => {
      const apy = getPoolApy(firstToken.value?.address ?? null, secondToken.value?.address ?? null);
      if (!apy) return null;
      return `${getFPNumberFromCodec(apy).mul(Hundred).toLocaleString()}%`;
    });
    const closeDialog = () => {
      emit("close");
      isVisible.value = false;
    };
    const handleConfirm = () => {
      emit("confirm");
      closeDialog();
    };
    const DialogBase = components.DialogBase;
    const TokenLogo = components.TokenLogo;
    const InfoLine = components.InfoLine;
    const AccountConfirmationOption = components.AccountConfirmationOption;
    const PairTokenLogo = lazyComponent(Components.PairTokenLogo);
    return (_ctx, _cache) => {
      const _component_s_row = resolveComponent("s-row");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_s_button = resolveComponent("s-button");
      return firstToken.value && secondToken.value ? (openBlock(), createBlock(unref(DialogBase), {
        key: 0,
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event),
        title: unref(t)("confirmSupply.title"),
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
            loading: parentLoading.value,
            disabled: !!insufficientBalanceTokenSymbol.value,
            onClick: handleConfirm
          }, {
            default: withCtx(() => [
              insufficientBalanceTokenSymbol.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: insufficientBalanceTokenSymbol.value })), 1)
              ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                createTextVNode(toDisplayString(unref(t)("confirmText")), 1)
              ], 64))
            ]),
            _: 1
          }, 8, ["loading", "disabled"])
        ]),
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, toDisplayString(shareOfPool.value) + "%", 1),
          firstToken.value && secondToken.value ? (openBlock(), createBlock(_component_s_row, {
            key: 0,
            flex: "",
            align: "middle",
            class: "pool-tokens"
          }, {
            default: withCtx(() => [
              createVNode(unref(PairTokenLogo), {
                "first-token": firstToken.value,
                "second-token": secondToken.value,
                size: "small"
              }, null, 8, ["first-token", "second-token"]),
              createTextVNode(" " + toDisplayString(unref(t)("createPair.firstSecondPoolTokens", { first: firstToken.value.symbol, second: secondToken.value.symbol })), 1)
            ]),
            _: 1
          })) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_2, toDisplayString(unref(t)("confirmSupply.outputDescription", { slippageTolerance: formattedSlippageTolerance.value })), 1),
          createVNode(_component_s_divider),
          createVNode(unref(InfoLine), {
            label: `${firstToken.value.symbol} ${unref(t)("createPair.deposit")}`,
            value: formattedFirstTokenValue.value,
            "fiat-value": fiatFirstAmount.value,
            "is-formatted": ""
          }, {
            "info-line-prefix": withCtx(() => [
              createVNode(unref(TokenLogo), {
                class: "token-logo",
                token: firstToken.value,
                size: "small"
              }, null, 8, ["token"])
            ]),
            _: 1
          }, 8, ["label", "value", "fiat-value"]),
          createVNode(unref(InfoLine), {
            label: `${secondToken.value.symbol} ${unref(t)("createPair.deposit")}`,
            value: formattedSecondTokenValue.value,
            "fiat-value": fiatSecondAmount.value,
            "is-formatted": ""
          }, {
            "info-line-prefix": withCtx(() => [
              createVNode(unref(TokenLogo), {
                class: "token-logo",
                token: secondToken.value,
                size: "small"
              }, null, 8, ["token"])
            ]),
            _: 1
          }, 8, ["label", "value", "fiat-value"]),
          createVNode(unref(InfoLine), {
            label: unref(t)("priceText"),
            value: `1 ${firstToken.value.symbol} = ${formattedPriceReversed.value}`,
            "asset-symbol": secondToken.value.symbol
          }, null, 8, ["label", "value", "asset-symbol"]),
          createVNode(unref(InfoLine), {
            value: `1 ${secondToken.value.symbol} = ${formattedPrice.value}`,
            "asset-symbol": firstToken.value.symbol
          }, null, 8, ["value", "asset-symbol"]),
          strategicBonusApy.value ? (openBlock(), createBlock(unref(InfoLine), {
            key: 1,
            label: unref(t)("pool.strategicBonusApy"),
            value: strategicBonusApy.value
          }, null, 8, ["label", "value"])) : createCommentVNode("", true)
        ]),
        _: 1
      }, 8, ["visible", "title"])) : createCommentVNode("", true);
    };
  }
});
const Confirm = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e21809c8"]]);
export {
  Confirm as default
};
