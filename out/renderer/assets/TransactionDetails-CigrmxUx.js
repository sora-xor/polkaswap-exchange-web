import { z as defineComponent, ak as lazyComponent, al as Components, aZ as components, u as useTranslation, v as useWalletStore, X as XOR, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aM as createCommentVNode, aj as unref, bb as normalizeClass, h as computed, Z as ZeroStringValue, O as Operation, a7 as PriceVariant, d as dayjs } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useSwapAmounts } from "./useSwapAmounts-COuMA7gl.js";
import { u as useOrderBook } from "./useOrderBook-BhgjjoQG.js";
import "./swap-DtWqRzUD.js";
import "./index-BDxnS5Vu.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "TransactionDetails",
  props: {
    infoOnly: { type: Boolean, default: true },
    isMarketType: { type: Boolean, default: false }
  },
  setup(__props) {
    const TransactionDetails = lazyComponent(Components.TransactionDetails);
    const InfoLine = components.InfoLine;
    const props = __props;
    const { t } = useTranslation();
    const { getFPNumber, formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();
    const { toValue } = useSwapAmounts();
    const walletStore = useWalletStore();
    const { baseValue, quoteValue, side, baseAsset, quoteAsset } = useOrderBook();
    const networkFees = computed(() => walletStore.networkFees ?? {});
    const xorSymbol = XOR.symbol;
    const networkFee = computed(
      () => networkFees.value[Operation.OrderBookPlaceLimitOrder] ?? ZeroStringValue
    );
    const baseSymbol = computed(() => baseAsset.value.symbol);
    const quoteSymbol = computed(() => quoteAsset.value.symbol);
    const sideText = computed(() => side.value === PriceVariant.Buy ? t("orderBook.Buy") : t("orderBook.Sell"));
    const total = computed(() => getFPNumber(baseValue.value).mul(getFPNumber(quoteValue.value)));
    const isBuy = computed(() => side.value === PriceVariant.Buy);
    const locked = computed(() => isBuy.value ? total.value.toString() : baseValue.value);
    const lockedCodec = computed(
      () => isBuy.value ? total.value.toCodecString() : getFPNumber(baseValue.value).toCodecString()
    );
    const lockedAsset = computed(() => isBuy.value ? quoteAsset.value : baseAsset.value);
    const lockedAssetSymbol = computed(() => isBuy.value ? quoteSymbol.value : baseSymbol.value);
    const limitOrderExpiryDate = computed(() => {
      if (props.isMarketType) return null;
      const now = /* @__PURE__ */ new Date();
      const oneMonthAhead = now.setMonth(now.getMonth() + 1);
      return dayjs(oneMonthAhead).format("LL");
    });
    const formattedNetworkFee = computed(() => formatCodecNumber(networkFee.value));
    const computedClass = computed(() => {
      if (!props.infoOnly) return void 0;
      return side.value === PriceVariant.Buy ? "limit-order-type--buy" : "limit-order-type--sell";
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(TransactionDetails), {
        class: "s-flex-column",
        "info-only": __props.infoOnly
      }, {
        default: withCtx(() => [
          createVNode(unref(InfoLine), {
            label: unref(t)("orderBook.txDetails.orderType"),
            "label-tooltip": unref(t)("orderBook.tooltip.txDetails.orderType"),
            value: sideText.value,
            class: normalizeClass(computedClass.value)
          }, null, 8, ["label", "label-tooltip", "value", "class"]),
          createVNode(unref(InfoLine), {
            label: unref(t)("orderBook.txDetails.limitPrice"),
            "label-tooltip": unref(t)("orderBook.tooltip.txDetails.limit"),
            "asset-symbol": quoteSymbol.value,
            value: unref(quoteValue) || unref(toValue) || "0",
            "is-formatted": ""
          }, null, 8, ["label", "label-tooltip", "asset-symbol", "value"]),
          createVNode(unref(InfoLine), {
            label: unref(t)("orderBook.amount"),
            "label-tooltip": unref(t)("orderBook.tooltip.txDetails.amount"),
            "asset-symbol": baseSymbol.value,
            value: unref(baseValue) || "0",
            "is-formatted": ""
          }, null, 8, ["label", "label-tooltip", "asset-symbol", "value"]),
          createVNode(unref(InfoLine), {
            label: unref(t)(`assets.balance.locked`),
            "label-tooltip": unref(t)("orderBook.tooltip.txDetails.locked"),
            value: locked.value,
            "asset-symbol": lockedAssetSymbol.value,
            "fiat-value": unref(getFiatAmountByCodecString)(lockedCodec.value, lockedAsset.value),
            "is-formatted": ""
          }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"]),
          !__props.isMarketType ? (openBlock(), createBlock(unref(InfoLine), {
            key: 0,
            label: unref(t)("orderBook.txDetails.expiryDate"),
            "label-tooltip": unref(t)("orderBook.tooltip.txDetails.expiryDate"),
            value: limitOrderExpiryDate.value
          }, null, 8, ["label", "label-tooltip", "value"])) : createCommentVNode("", true),
          createVNode(unref(InfoLine), {
            label: unref(t)("networkFeeText"),
            "label-tooltip": unref(t)("networkFeeTooltipText"),
            value: formattedNetworkFee.value,
            "asset-symbol": unref(xorSymbol),
            "fiat-value": unref(getFiatAmountByCodecString)(networkFee.value),
            "is-formatted": ""
          }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])
        ]),
        _: 1
      }, 8, ["info-only"]);
    };
  }
});
export {
  _sfc_main as default
};
