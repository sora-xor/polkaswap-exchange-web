import { z as defineComponent, aZ as components, h as computed, a_ as resolveComponent, A as createElementBlock, C as openBlock, am as createBlock, aM as createCommentVNode, bQ as Fragment, bP as renderList, ap as createVNode, aj as unref, aI as WALLET_CONSTS, x as useNumberFormatter, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "amount-header" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "RewardsAmountHeader",
    components: {
      FormattedAmount: components.FormattedAmount
    }
  },
  __name: "AmountHeader",
  props: {
    items: { default: () => [] }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const FontSizeRate = WALLET_CONSTS.FontSizeRate;
    const { getFPNumberFiatAmountByFPNumber, getFPNumber, Zero } = useFormattedAmount();
    const { formatStringValue } = useNumberFormatter();
    const totalFiatValue = computed(() => {
      const value = props.items.reduce((result, item) => {
        if (!item.amount || !item.asset) return result;
        const fpAmount = getFPNumber(item.amount);
        if (!fpAmount) return result;
        const fpFiatAmount = getFPNumberFiatAmountByFPNumber(fpAmount, item.asset);
        if (!fpFiatAmount) return result;
        const accumulator = result ?? Zero;
        return accumulator.add(fpFiatAmount);
      }, null);
      return value?.toLocaleString();
    });
    __expose({
      totalFiatValue
    });
    return (_ctx, _cache) => {
      const _component_formatted_amount = resolveComponent("formatted-amount");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(__props.items, ({ asset, amount }) => {
          return openBlock(), createElementBlock("div", {
            key: asset.symbol,
            class: "amount-block"
          }, [
            createVNode(_component_formatted_amount, {
              class: "amount-block__amount",
              "symbol-as-decimal": "",
              "value-can-be-hidden": "",
              value: unref(formatStringValue)(amount, asset.decimals),
              "font-size-rate": unref(FontSizeRate).MEDIUM,
              "asset-symbol": asset.symbol
            }, null, 8, ["value", "font-size-rate", "asset-symbol"])
          ]);
        }), 128)),
        totalFiatValue.value ? (openBlock(), createBlock(_component_formatted_amount, {
          key: 0,
          "is-fiat-value": "",
          "value-can-be-hidden": "",
          value: totalFiatValue.value
        }, null, 8, ["value"])) : createCommentVNode("", true)
      ]);
    };
  }
});
const AmountHeader = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-965a7f29"]]);
export {
  AmountHeader as default
};
