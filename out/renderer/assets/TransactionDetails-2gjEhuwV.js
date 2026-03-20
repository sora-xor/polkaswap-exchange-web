import { z as defineComponent, c1 as useI18n, X as XOR, aZ as components, ak as lazyComponent, al as Components, am as createBlock, C as openBlock, ao as withCtx, aM as createCommentVNode, A as createElementBlock, h as computed, aj as unref, bQ as Fragment, s as store, O as Operation } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "TransactionDetails",
  props: {
    infoOnly: { type: Boolean, default: true }
  },
  setup(__props) {
    const { t } = useI18n();
    const formattedAmount = useFormattedAmount();
    const { formatStringValue, formatCodecNumber, getFiatAmountByCodecString } = formattedAmount;
    const networkFees = computed(() => store.state.wallet.settings.networkFees);
    const shareOfPool = computed(() => store.getters.removeLiquidity.shareOfPool);
    const firstToken = computed(() => store.getters.removeLiquidity.firstToken);
    const secondToken = computed(() => store.getters.removeLiquidity.secondToken);
    const priceReversed = computed(() => store.getters.removeLiquidity.priceReversed);
    const price = computed(() => store.getters.removeLiquidity.price);
    const firstTokenSymbol = computed(() => firstToken.value?.symbol ?? null);
    const secondTokenSymbol = computed(() => secondToken.value?.symbol ?? null);
    const formattedPrice = computed(() => formatStringValue(price.value));
    const formattedPriceReversed = computed(() => formatStringValue(priceReversed.value));
    const networkFee = computed(() => networkFees.value?.[Operation.RemoveLiquidity] ?? "0");
    const formattedFee = computed(() => formatCodecNumber(networkFee.value));
    const formattedFeeFiatValue = computed(() => getFiatAmountByCodecString(networkFee.value));
    const XOR_SYMBOL = XOR.symbol;
    const InfoLine = components.InfoLine;
    const TransactionDetails = lazyComponent(Components.TransactionDetails);
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(TransactionDetails), {
        "info-only": __props.infoOnly,
        class: "info-line-container"
      }, {
        default: withCtx(() => [
          shareOfPool.value ? (openBlock(), createBlock(unref(InfoLine), {
            key: 0,
            "value-can-be-hidden": "",
            label: unref(t)("removeLiquidity.shareOfPool"),
            value: `${shareOfPool.value}%`
          }, null, 8, ["label", "value"])) : createCommentVNode("", true),
          firstTokenSymbol.value && secondTokenSymbol.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
            priceReversed.value ? (openBlock(), createBlock(unref(InfoLine), {
              key: 0,
              label: unref(t)("priceText"),
              value: `1 ${firstTokenSymbol.value} = ${formattedPriceReversed.value}`,
              "asset-symbol": secondTokenSymbol.value
            }, null, 8, ["label", "value", "asset-symbol"])) : createCommentVNode("", true),
            price.value ? (openBlock(), createBlock(unref(InfoLine), {
              key: 1,
              value: `1 ${secondTokenSymbol.value} = ${formattedPrice.value}`,
              "asset-symbol": firstTokenSymbol.value
            }, null, 8, ["value", "asset-symbol"])) : createCommentVNode("", true)
          ], 64)) : createCommentVNode("", true),
          networkFee.value ? (openBlock(), createBlock(unref(InfoLine), {
            key: 2,
            label: unref(t)("networkFeeText"),
            "label-tooltip": unref(t)("networkFeeTooltipText"),
            value: formattedFee.value,
            "asset-symbol": unref(XOR_SYMBOL),
            "fiat-value": formattedFeeFiatValue.value,
            "is-formatted": ""
          }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])) : createCommentVNode("", true)
        ]),
        _: 1
      }, 8, ["info-only"]);
    };
  }
});
export {
  _sfc_main as default
};
