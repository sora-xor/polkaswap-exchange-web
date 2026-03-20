import { u as useSwapAmounts } from "./useSwapAmounts-COuMA7gl.js";
import { z as defineComponent, ak as lazyComponent, al as Components, u as useTranslation, am as createBlock, C as openBlock, ao as withCtx, A as createElementBlock, h as computed, aN as toDisplayString, aj as unref, as as mergeProps, aP as _export_sfc } from "./index-73GArslZ.js";
import "./swap-DtWqRzUD.js";
const _hoisted_1 = {
  key: 0,
  class: "transaction-details-preview"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "TransactionDetails",
  setup(__props) {
    const BaseWidget = lazyComponent(Components.BaseWidget);
    const SwapTransactionDetails = lazyComponent(Components.SwapTransactionDetails);
    const { t } = useTranslation();
    const { areTokensSelected, areZeroAmounts, hasZeroAmount } = useSwapAmounts();
    const previewText = computed(() => {
      if (!areTokensSelected.value) return t("buttons.chooseTokens");
      if (areZeroAmounts.value) return t("buttons.enterAmount");
      if (hasZeroAmount.value) return t("selectToken.emptyListMessage");
      return "";
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(BaseWidget), mergeProps(_ctx.$attrs, {
        title: unref(t)("transaction.title")
      }), {
        default: withCtx(() => [
          previewText.value ? (openBlock(), createElementBlock("div", _hoisted_1, toDisplayString(previewText.value), 1)) : (openBlock(), createBlock(unref(SwapTransactionDetails), {
            key: 1,
            expanded: ""
          }))
        ]),
        _: 1
      }, 16, ["title"]);
    };
  }
});
const SwapTransactionDetailsWidget = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e8c9b92b"]]);
export {
  SwapTransactionDetailsWidget as default
};
