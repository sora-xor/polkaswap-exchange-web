import { z as defineComponent, Z as ZeroStringValue, aZ as components, ak as lazyComponent, u as useTranslation, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aM as createCommentVNode, aj as unref, X as XOR, h as computed, al as Components } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      TransactionDetails: lazyComponent(Components.TransactionDetails),
      InfoLine: components.InfoLine
    }
  },
  __name: "TransactionDetails",
  props: {
    asset: { default: null },
    nativeToken: { default: null },
    externalTransferFee: { default: ZeroStringValue },
    externalNetworkFee: { default: ZeroStringValue },
    externalMinBalance: { default: ZeroStringValue },
    soraNetworkFee: { default: ZeroStringValue },
    networkName: { default: "" }
  },
  setup(__props) {
    const props = __props;
    const { t, TranslationConsts } = useTranslation();
    const { formatStringValue, getFiatAmountByString } = useFormattedAmount();
    const assetSymbol = computed(() => props.asset?.symbol ?? "");
    const nativeTokenSymbol = computed(() => props.nativeToken?.symbol ?? "");
    const formattedNetworkFeeLabel = computed(() => `${TranslationConsts.Max} ${props.networkName} ${t("networkFeeText")}`);
    const isNotZero = (value) => value !== ZeroStringValue;
    return (_ctx, _cache) => {
      const _component_info_line = resolveComponent("info-line");
      const _component_transaction_details = resolveComponent("transaction-details", true);
      return openBlock(), createBlock(_component_transaction_details, null, {
        default: withCtx(() => [
          createVNode(_component_info_line, {
            label: unref(t)("bridge.soraNetworkFee"),
            "label-tooltip": unref(t)("networkFeeTooltipText"),
            value: unref(formatStringValue)(__props.soraNetworkFee, unref(XOR).decimals),
            "asset-symbol": unref(XOR).symbol,
            "fiat-value": unref(getFiatAmountByString)(__props.soraNetworkFee, unref(XOR)),
            "is-formatted": ""
          }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"]),
          createVNode(_component_info_line, {
            label: formattedNetworkFeeLabel.value,
            "label-tooltip": unref(t)("ethNetworkFeeTooltipText", { network: __props.networkName }),
            value: unref(formatStringValue)(__props.externalNetworkFee, __props.nativeToken.externalDecimals),
            "asset-symbol": nativeTokenSymbol.value,
            "fiat-value": unref(getFiatAmountByString)(__props.externalNetworkFee, __props.nativeToken),
            "is-formatted": ""
          }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"]),
          isNotZero(__props.externalTransferFee) ? (openBlock(), createBlock(_component_info_line, {
            key: 0,
            label: unref(t)("bridge.externalTransferFee", { network: __props.networkName }),
            "label-tooltip": unref(t)("bridge.externalTransferFeeTooltip", { network: __props.networkName }),
            value: unref(formatStringValue)(__props.externalTransferFee, __props.asset.externalDecimals),
            "asset-symbol": assetSymbol.value,
            "fiat-value": unref(getFiatAmountByString)(__props.externalTransferFee, __props.asset),
            "is-formatted": ""
          }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])) : createCommentVNode("", true),
          isNotZero(__props.externalMinBalance) ? (openBlock(), createBlock(_component_info_line, {
            key: 1,
            label: unref(t)("bridge.externalMinDeposit", { network: __props.networkName }),
            "label-tooltip": unref(t)("bridge.externalMinDepositTooltip", { network: __props.networkName, symbol: assetSymbol.value }),
            value: unref(formatStringValue)(__props.externalMinBalance, __props.asset.externalDecimals),
            "asset-symbol": assetSymbol.value,
            "fiat-value": unref(getFiatAmountByString)(__props.externalMinBalance, __props.asset),
            "is-formatted": ""
          }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])) : createCommentVNode("", true)
        ]),
        _: 1
      });
    };
  }
});
export {
  _sfc_main as default
};
