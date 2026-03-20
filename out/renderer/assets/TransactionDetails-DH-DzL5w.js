import { z as defineComponent, u as useTranslation, ak as lazyComponent, al as Components, aZ as components, am as createBlock, C as openBlock, ao as withCtx, A as createElementBlock, aM as createCommentVNode, D as createBaseVNode, aj as unref, ap as createVNode, aN as toDisplayString, h as computed, c0 as toRef, s as store, F as FPNumber } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as usePoolTokenPair } from "./usePoolTokenPair-mkXLQGop.js";
import { u as usePoolApy } from "./usePoolApy-lSPKqmx4.js";
const _hoisted_1 = {
  key: 0,
  class: "info-line-container"
};
const _hoisted_2 = { class: "info-line-container__title" };
const _hoisted_3 = { class: "info-line-container" };
const _hoisted_4 = { class: "info-line-container__title" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "TransactionDetails",
  props: {
    infoOnly: { type: Boolean, default: true }
  },
  setup(__props) {
    const props = __props;
    const infoOnly = toRef(props, "infoOnly");
    const { t } = useTranslation();
    const poolTokenPair = usePoolTokenPair();
    const { getFiatAmountByCodecString, getFiatAmountByFPNumber, getFPNumberFromCodec, Hundred } = useFormattedAmount();
    const { getPoolApy } = usePoolApy();
    const liquidityInfo = computed(() => store.getters.addLiquidity.liquidityInfo);
    const shareOfPool = computed(() => store.getters.addLiquidity.shareOfPool);
    const getTokenPosition = (liquidityInfoBalance, tokenValue) => {
      const previousPosition = FPNumber.fromCodecValue(liquidityInfoBalance ?? 0);
      if (!poolTokenPair.emptyAssets.value) {
        return previousPosition.add(new FPNumber(tokenValue));
      }
      return previousPosition;
    };
    const firstTokenPosition = computed(
      () => getTokenPosition(liquidityInfo.value?.firstBalance, poolTokenPair.firstTokenValue.value)
    );
    const secondTokenPosition = computed(
      () => getTokenPosition(liquidityInfo.value?.secondBalance, poolTokenPair.secondTokenValue.value)
    );
    const strategicBonusApy = computed(() => {
      const apy = getPoolApy(
        poolTokenPair.firstToken.value?.address ?? null,
        poolTokenPair.secondToken.value?.address ?? null
      );
      if (!apy) return null;
      return `${getFPNumberFromCodec(apy).mul(Hundred).toLocaleString()}%`;
    });
    const formattedFirstTokenPosition = computed(() => firstTokenPosition.value.toLocaleString());
    const formattedSecondTokenPosition = computed(() => secondTokenPosition.value.toLocaleString());
    const fiatFirstTokenPosition = computed(
      () => poolTokenPair.firstToken.value ? getFiatAmountByFPNumber(firstTokenPosition.value, poolTokenPair.firstToken.value) : null
    );
    const fiatSecondTokenPosition = computed(
      () => poolTokenPair.secondToken.value ? getFiatAmountByFPNumber(secondTokenPosition.value, poolTokenPair.secondToken.value) : null
    );
    const firstTokenSymbol = computed(() => poolTokenPair.firstToken.value?.symbol ?? "");
    const secondTokenSymbol = computed(() => poolTokenPair.secondToken.value?.symbol ?? "");
    const TransactionDetails = lazyComponent(Components.TransactionDetails);
    const InfoLine = components.InfoLine;
    const {
      XOR_SYMBOL,
      formattedPrice,
      formattedPriceReversed,
      formattedFee,
      networkFee,
      emptyAssets
    } = poolTokenPair;
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(TransactionDetails), {
        "info-only": infoOnly.value,
        class: "info-line-container"
      }, {
        default: withCtx(() => [
          !unref(emptyAssets) ? (openBlock(), createElementBlock("div", _hoisted_1, [
            createBaseVNode("p", _hoisted_2, toDisplayString(unref(t)("createPair.pricePool")), 1),
            createVNode(unref(InfoLine), {
              label: unref(t)("firstPerSecond", { first: firstTokenSymbol.value, second: secondTokenSymbol.value }),
              value: unref(formattedPrice)
            }, null, 8, ["label", "value"]),
            createVNode(unref(InfoLine), {
              label: unref(t)("firstPerSecond", { first: secondTokenSymbol.value, second: firstTokenSymbol.value }),
              value: unref(formattedPriceReversed)
            }, null, 8, ["label", "value"]),
            strategicBonusApy.value ? (openBlock(), createBlock(unref(InfoLine), {
              key: 0,
              label: unref(t)("pool.strategicBonusApy"),
              value: strategicBonusApy.value
            }, null, 8, ["label", "value"])) : createCommentVNode("", true),
            createVNode(unref(InfoLine), {
              "is-formatted": "",
              label: unref(t)("networkFeeText"),
              "label-tooltip": unref(t)("networkFeeTooltipText"),
              value: unref(formattedFee),
              "asset-symbol": unref(XOR_SYMBOL),
              "fiat-value": unref(getFiatAmountByCodecString)(unref(networkFee))
            }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])
          ])) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("p", _hoisted_4, toDisplayString(unref(t)(`createPair.yourPosition${!unref(emptyAssets) ? "Estimated" : ""}`)), 1),
            createVNode(unref(InfoLine), {
              "is-formatted": "",
              "value-can-be-hidden": "",
              label: firstTokenSymbol.value,
              value: formattedFirstTokenPosition.value,
              "fiat-value": fiatFirstTokenPosition.value
            }, null, 8, ["label", "value", "fiat-value"]),
            createVNode(unref(InfoLine), {
              "is-formatted": "",
              "value-can-be-hidden": "",
              label: secondTokenSymbol.value,
              value: formattedSecondTokenPosition.value,
              "fiat-value": fiatSecondTokenPosition.value
            }, null, 8, ["label", "value", "fiat-value"]),
            createVNode(unref(InfoLine), {
              "value-can-be-hidden": "",
              label: unref(t)("createPair.shareOfPool"),
              value: `${shareOfPool.value}%`
            }, null, 8, ["label", "value"])
          ])
        ]),
        _: 1
      }, 8, ["info-only"]);
    };
  }
});
export {
  _sfc_main as default
};
