import { z as defineComponent, ak as lazyComponent, al as Components, aZ as components, H as useAssetsStore, u as useTranslation, X as XOR, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, A as createElementBlock, ap as createVNode, aM as createCommentVNode, bQ as Fragment, bP as renderList, h as computed, aj as unref, as as mergeProps, aO as createTextVNode, aN as toDisplayString, aJ as renderSlot, O as Operation, s as store, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useSwapStore } from "./swap-DtWqRzUD.js";
const _hoisted_1 = { class: "swap-info-container" };
const _hoisted_2 = { class: "swap-route" };
const _hoisted_3 = { class: "swap-route-paths s-flex" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "TransactionDetails",
  props: {
    full: { type: Boolean, default: false },
    expanded: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
  },
  setup(__props) {
    const ValueStatusWrapper = lazyComponent(Components.ValueStatusWrapper);
    const TransactionDetails2 = lazyComponent(Components.TransactionDetails);
    const FormattedAmount = components.FormattedAmount;
    const InfoLine = components.InfoLine;
    const swapStore = useSwapStore();
    const assetsStore = useAssetsStore();
    const { t } = useTranslation();
    const { formatCodecNumber, formatStringValue, getFiatAmountByString, getFiatAmountByCodecString } = useFormattedAmount();
    const networkFees = computed(() => store.state.wallet.settings.networkFees);
    const networkFee = computed(() => networkFees.value[Operation.Swap]);
    const liquidityProviderFee = computed(() => swapStore.liquidityProviderFee);
    const rewards = computed(() => swapStore.rewards);
    const route = computed(() => swapStore.route);
    const isExchangeB = computed(() => swapStore.isExchangeB);
    const tokenFrom = computed(() => swapStore.tokenFrom);
    const tokenTo = computed(() => swapStore.tokenTo);
    const minMaxReceived = computed(() => swapStore.minMaxReceived);
    const priceImpact = computed(() => swapStore.priceImpact);
    const price = computed(() => swapStore.price);
    const priceReversed = computed(() => swapStore.priceReversed);
    const getAsset = (addr) => assetsStore.assetDataByAddress(addr);
    const priceValues = computed(() => {
      const fromSymbol = tokenFrom.value?.symbol ?? "";
      const toSymbol = tokenTo.value?.symbol ?? "";
      return [
        {
          id: "from",
          label: t("firstPerSecond", { first: fromSymbol, second: toSymbol }),
          value: formatStringValue(price.value ?? "")
        },
        {
          id: "to",
          label: t("firstPerSecond", { first: toSymbol, second: fromSymbol }),
          value: formatStringValue(priceReversed.value ?? "")
        }
      ];
    });
    const liquidityProviderFeeTooltipText = computed(
      () => t("swap.liquidityProviderFeeTooltip", { liquidityProviderFee: formatStringValue("0.6") })
    );
    const swapRoute = computed(() => route.value.map((address) => getAsset(address)?.symbol ?? "?"));
    const rewardsValues = computed(
      () => rewards.value.map((reward, index) => {
        const asset = getAsset(reward.currency);
        const value = formatCodecNumber(reward.amount);
        return {
          value,
          fiatValue: asset ? getFiatAmountByString(value, asset) : null,
          assetSymbol: asset?.symbol ?? "",
          label: index === 0 ? t("swap.rewardsForSwap") : ""
        };
      })
    );
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const formattedLiquidityProviderFee = computed(() => formatCodecNumber(liquidityProviderFee.value));
    const priceImpactFormatted = computed(() => formatStringValue(priceImpact.value ?? "0"));
    const formattedMinMaxReceived = computed(() => {
      const decimals = (isExchangeB.value ? tokenFrom.value : tokenTo.value)?.decimals;
      return formatCodecNumber(minMaxReceived.value, decimals);
    });
    const xorSymbol = ` ${XOR.symbol}`;
    const assetSymbol = computed(() => (isExchangeB.value ? tokenFrom.value : tokenTo.value)?.symbol ?? "");
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      return openBlock(), createBlock(unref(TransactionDetails2), {
        "info-only": __props.expanded,
        disabled: __props.disabled
      }, {
        reference: withCtx(() => [
          renderSlot(_ctx.$slots, "reference", {}, void 0, true)
        ]),
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(priceValues.value, ({ id, label, value }) => {
              return openBlock(), createBlock(unref(InfoLine), {
                key: id,
                label,
                value
              }, null, 8, ["label", "value"]);
            }), 128)),
            createVNode(unref(InfoLine), {
              label: unref(t)(`swap.${isExchangeB.value ? "maxSold" : "minReceived"}`),
              "label-tooltip": unref(t)("swap.minReceivedTooltip"),
              value: formattedMinMaxReceived.value,
              "asset-symbol": assetSymbol.value,
              "fiat-value": unref(getFiatAmountByCodecString)(minMaxReceived.value, isExchangeB.value ? tokenFrom.value : tokenTo.value),
              "is-formatted": ""
            }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"]),
            (openBlock(true), createElementBlock(Fragment, null, renderList(rewardsValues.value, (reward, index) => {
              return openBlock(), createBlock(unref(InfoLine), mergeProps({ key: index }, { ref_for: true }, reward), null, 16);
            }), 128)),
            createVNode(unref(InfoLine), {
              label: unref(t)("swap.priceImpact"),
              "label-tooltip": unref(t)("swap.priceImpactTooltip")
            }, {
              default: withCtx(() => [
                createVNode(unref(ValueStatusWrapper), { value: priceImpact.value }, {
                  default: withCtx(() => [
                    createVNode(unref(FormattedAmount), {
                      class: "swap-value",
                      value: priceImpactFormatted.value
                    }, {
                      default: withCtx(() => [..._cache[0] || (_cache[0] = [
                        createTextVNode("%", -1)
                      ])]),
                      _: 1
                    }, 8, ["value"])
                  ]),
                  _: 1
                }, 8, ["value"])
              ]),
              _: 1
            }, 8, ["label", "label-tooltip"]),
            __props.full ? (openBlock(), createBlock(unref(InfoLine), {
              key: 0,
              label: unref(t)("swap.route")
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_2, [
                  createBaseVNode("div", _hoisted_3, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(swapRoute.value, (token, index) => {
                      return openBlock(), createElementBlock("div", {
                        class: "swap-route-value",
                        key: token
                      }, [
                        createBaseVNode("span", null, toDisplayString(token), 1),
                        index !== swapRoute.value.length - 1 ? (openBlock(), createBlock(_component_s_icon, {
                          key: 0,
                          name: "el-icon el-icon-arrow-right swap-route-icon"
                        })) : createCommentVNode("", true)
                      ]);
                    }), 128))
                  ])
                ])
              ]),
              _: 1
            }, 8, ["label"])) : createCommentVNode("", true),
            createVNode(unref(InfoLine), {
              label: unref(t)("swap.liquidityProviderFee"),
              "label-tooltip": liquidityProviderFeeTooltipText.value,
              value: formattedLiquidityProviderFee.value,
              "asset-symbol": xorSymbol,
              "is-formatted": ""
            }, null, 8, ["label", "label-tooltip", "value"]),
            __props.full ? (openBlock(), createBlock(unref(InfoLine), {
              key: 1,
              label: unref(t)("networkFeeText"),
              "label-tooltip": unref(t)("networkFeeTooltipText"),
              value: networkFeeFormatted.value,
              "asset-symbol": xorSymbol,
              "fiat-value": unref(getFiatAmountByCodecString)(networkFee.value),
              "is-formatted": ""
            }, null, 8, ["label", "label-tooltip", "value", "fiat-value"])) : createCommentVNode("", true)
          ])
        ]),
        _: 3
      }, 8, ["info-only", "disabled"]);
    };
  }
});
const TransactionDetails = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-a18feeeb"]]);
export {
  TransactionDetails as default
};
