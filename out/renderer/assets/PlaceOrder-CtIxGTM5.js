import { z as defineComponent, bt as mergeModels, aZ as components, ak as lazyComponent, al as Components, bu as useModel, u as useTranslation, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aN as toDisplayString, h as computed, aj as unref, aO as createTextVNode, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useSwapAmounts } from "./useSwapAmounts-COuMA7gl.js";
import { u as useOrderBook } from "./useOrderBook-BhgjjoQG.js";
import "./swap-DtWqRzUD.js";
import "./useFormattedAmount-D-xkdlPs.js";
import "./index-BDxnS5Vu.js";
const _hoisted_1 = { class: "tokens" };
const _hoisted_2 = { class: "tokens-info-container" };
const _hoisted_3 = { class: "token-value" };
const _hoisted_4 = { class: "tokens-info-container" };
const _hoisted_5 = { class: "token-value" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "PlaceOrder",
  props: /* @__PURE__ */ mergeModels({
    isMarketType: { type: Boolean, default: false },
    isInsufficientBalance: { type: Boolean, default: false },
    isBuySide: { type: Boolean, default: true }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["confirm"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const DialogBase = components.DialogBase;
    const TokenLogo = components.TokenLogo;
    const AccountConfirmationOption = components.AccountConfirmationOption;
    const PlaceTransactionDetails = lazyComponent(Components.PlaceTransactionDetails);
    const props = __props;
    const isVisible = useModel(__props, "visible");
    const emit = __emit;
    const { t } = useTranslation();
    const { toValue } = useSwapAmounts();
    const { baseValue, quoteValue, baseAsset, quoteAsset } = useOrderBook();
    const title = computed(
      () => props.isMarketType ? t("orderBook.dialog.placeMarket") : t("orderBook.dialog.placeLimit")
    );
    const upperText = computed(() => {
      const symbol = baseAsset.value?.symbol;
      if (props.isMarketType) {
        return props.isBuySide ? t("orderBook.dialog.buy", { amount: toValue.value, symbol }) : t("orderBook.dialog.sell", { amount: baseValue.value, symbol });
      }
      return props.isBuySide ? t("orderBook.dialog.buy", { amount: baseValue.value, symbol }) : t("orderBook.dialog.sell", { amount: baseValue.value, symbol });
    });
    const lowerText = computed(
      () => t("orderBook.dialog.at", { price: quoteValue.value, symbol: quoteAsset.value?.symbol })
    );
    const handleConfirm = async () => {
      emit("confirm");
      isVisible.value = false;
    };
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(unref(DialogBase), {
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event),
        title: title.value,
        "custom-class": "dialog--confirm-swap"
      }, {
        footer: withCtx(() => [
          createVNode(unref(AccountConfirmationOption), {
            "with-hint": "",
            class: "confirmation-option"
          }),
          createVNode(_component_s_button, {
            type: "primary",
            class: "s-typography-button--large",
            disabled: __props.isInsufficientBalance,
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
              createBaseVNode("span", _hoisted_3, toDisplayString(upperText.value), 1),
              createVNode(unref(TokenLogo), {
                class: "token-logo",
                token: unref(baseAsset)
              }, null, 8, ["token"])
            ]),
            createBaseVNode("div", _hoisted_4, [
              createBaseVNode("span", _hoisted_5, toDisplayString(lowerText.value), 1),
              createVNode(unref(TokenLogo), {
                class: "token-logo",
                token: unref(quoteAsset)
              }, null, 8, ["token"])
            ])
          ]),
          createVNode(unref(PlaceTransactionDetails), {
            class: "transaction-details",
            "is-market-type": __props.isMarketType
          }, null, 8, ["is-market-type"])
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const PlaceOrder = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2bbdadbc"]]);
export {
  PlaceOrder as default
};
