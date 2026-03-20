import { z as defineComponent, aZ as components, ak as lazyComponent, al as Components, b9 as LiquiditySourceTypes, u as useTranslation, H as useAssetsStore, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, A as createElementBlock, h as computed, bQ as Fragment, bP as renderList, D as createBaseVNode, aM as createCommentVNode, ap as createVNode, aN as toDisplayString, aj as unref, aO as createTextVNode, as as mergeProps, F as FPNumber, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useSwapAmounts } from "./useSwapAmounts-COuMA7gl.js";
import { u as useSwapStore } from "./swap-DtWqRzUD.js";
import { c as calcFiatDifference } from "./swap-sOuQz5wL.js";
const _hoisted_1 = {
  key: 0,
  class: "distribution"
};
const _hoisted_2 = { class: "distribution-asset" };
const _hoisted_3 = { class: "distribution-asset-amount" };
const _hoisted_4 = {
  key: 0,
  class: "distribution-path"
};
const _hoisted_5 = { class: "distribution-path-sources" };
const _hoisted_6 = { class: "flex-cell" };
const _hoisted_7 = { class: "distribution-path-source-name" };
const _hoisted_8 = { class: "flex-cell" };
const _hoisted_9 = { class: "flex-cell" };
const _hoisted_10 = { class: "flex-cell" };
const _hoisted_11 = {
  key: 1,
  class: "distribution"
};
const _hoisted_12 = { class: "distribution-step" };
const _hoisted_13 = { class: "distribution-asset" };
const _hoisted_14 = { class: "distribution-asset-amount" };
const _hoisted_15 = { class: "distribution-step" };
const _hoisted_16 = { class: "distribution-asset" };
const _hoisted_17 = { class: "distribution-asset-amount" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "SwapDistributionWidget",
    components: {
      TokenLogo: components.TokenLogo,
      FormattedAmount: components.FormattedAmount
    }
  },
  __name: "Distribution",
  setup(__props) {
    const BaseWidget = lazyComponent(Components.BaseWidget);
    const ValueStatusWrapper = lazyComponent(Components.ValueStatusWrapper);
    const MARKETS = {
      [LiquiditySourceTypes.XYKPool]: "XYK Pool",
      [LiquiditySourceTypes.MulticollateralBondingCurvePool]: "TBC Pool",
      [LiquiditySourceTypes.XSTPool]: "XST Pool",
      [LiquiditySourceTypes.OrderBook]: "Order Book"
    };
    const { t } = useTranslation();
    const { formatStringValue, getFPNumberFiatAmountByFPNumber } = useFormattedAmount();
    const { tokenFrom, tokenTo, fromValue, toValue } = useSwapAmounts();
    const swapStore = useSwapStore();
    const assetsStore = useAssetsStore();
    const distribution = computed(() => swapStore.distribution);
    const getAsset = (address) => assetsStore.assetDataByAddress(address);
    const swapPaths = computed(() => {
      const paths = [];
      distribution.value.forEach((step, index, list) => {
        if (!step.length) return;
        const input = getAsset(step[0].input);
        const output = getAsset(step[0].output);
        if (!input || !output) return;
        let income = FPNumber.ZERO;
        let outcome = FPNumber.ZERO;
        const sources = [];
        step.forEach((path) => {
          const amountIn = path.income;
          const amountOut = path.outcome;
          const amountInFiat = getFPNumberFiatAmountByFPNumber(amountIn, input) ?? FPNumber.ZERO;
          const amountOutFiat = getFPNumberFiatAmountByFPNumber(amountOut, output) ?? FPNumber.ZERO;
          const fiatDifference = calcFiatDifference(amountInFiat, amountOutFiat).toFixed(2);
          income = income.add(amountIn);
          outcome = outcome.add(amountOut);
          sources.push({
            income: amountIn.toLocaleString(),
            outcome: amountOut.toLocaleString(),
            source: MARKETS[path.market] ?? path.market,
            fiatDifference
          });
        });
        paths.push({ input, output, amount: income.toLocaleString(), sources });
        if (index === list.length - 1 && output) {
          paths.push({ input: output, amount: outcome.toLocaleString(), sources: [] });
        }
      });
      return paths;
    });
    return (_ctx, _cache) => {
      const _component_token_logo = resolveComponent("token-logo");
      const _component_formatted_amount = resolveComponent("formatted-amount");
      return openBlock(), createBlock(unref(BaseWidget), mergeProps(_ctx.$attrs, {
        title: unref(t)("swap.route")
      }), {
        default: withCtx(() => [
          swapPaths.value.length ? (openBlock(), createElementBlock("ul", _hoisted_1, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(swapPaths.value, ({ input, output, amount, sources }) => {
              return openBlock(), createElementBlock("li", {
                key: input.address,
                class: "distribution-step"
              }, [
                createBaseVNode("div", _hoisted_2, [
                  createVNode(_component_token_logo, {
                    token: input,
                    size: "small",
                    class: "distribution-asset-logo"
                  }, null, 8, ["token"]),
                  createBaseVNode("span", _hoisted_3, toDisplayString(amount) + " " + toDisplayString(input.symbol), 1)
                ]),
                sources.length ? (openBlock(), createElementBlock("div", _hoisted_4, [
                  _cache[2] || (_cache[2] = createBaseVNode("span", { class: "distribution-path-line" }, null, -1)),
                  createBaseVNode("div", _hoisted_5, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(sources, ({ source, income, outcome, fiatDifference }) => {
                      return openBlock(), createElementBlock("div", {
                        key: source,
                        class: "distribution-path-source"
                      }, [
                        createBaseVNode("div", _hoisted_6, [
                          createBaseVNode("span", _hoisted_7, toDisplayString(source) + ":", 1),
                          createVNode(unref(ValueStatusWrapper), {
                            value: fiatDifference,
                            class: "distribution-path-source-change"
                          }, {
                            default: withCtx(() => [
                              createVNode(_component_formatted_amount, {
                                value: unref(formatStringValue)(fiatDifference)
                              }, {
                                default: withCtx(() => [..._cache[0] || (_cache[0] = [
                                  createTextVNode("%", -1)
                                ])]),
                                _: 1
                              }, 8, ["value"])
                            ]),
                            _: 2
                          }, 1032, ["value"])
                        ]),
                        createBaseVNode("div", _hoisted_8, [
                          createBaseVNode("div", _hoisted_9, [
                            createVNode(_component_token_logo, {
                              token: input,
                              size: "mini"
                            }, null, 8, ["token"]),
                            createTextVNode(toDisplayString(income), 1)
                          ]),
                          _cache[1] || (_cache[1] = createTextVNode(" → ", -1)),
                          createBaseVNode("div", _hoisted_10, [
                            createVNode(_component_token_logo, {
                              token: output,
                              size: "mini"
                            }, null, 8, ["token"]),
                            createTextVNode(toDisplayString(outcome), 1)
                          ])
                        ])
                      ]);
                    }), 128))
                  ])
                ])) : createCommentVNode("", true)
              ]);
            }), 128))
          ])) : (openBlock(), createElementBlock("div", _hoisted_11, [
            createBaseVNode("div", _hoisted_12, [
              createBaseVNode("div", _hoisted_13, [
                unref(tokenFrom) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createVNode(_component_token_logo, {
                    token: unref(tokenFrom),
                    size: "small",
                    class: "distribution-asset-logo"
                  }, null, 8, ["token"]),
                  createBaseVNode("span", _hoisted_14, toDisplayString(unref(fromValue)) + " " + toDisplayString(unref(tokenFrom).symbol), 1)
                ], 64)) : createCommentVNode("", true)
              ]),
              _cache[3] || (_cache[3] = createBaseVNode("div", { class: "distribution-path" }, [
                createBaseVNode("span", { class: "distribution-path-line" }),
                createBaseVNode("div", { class: "distribution-path-sources" }, [
                  createBaseVNode("div", { class: "distribution-path-source" }, [
                    createBaseVNode("div", { class: "flex-cell" }, [
                      createBaseVNode("div", { class: "distribution-path-source-name el-skeleton__item el-skeleton__rect" }),
                      createBaseVNode("div", { class: "distribution-path-source-change el-skeleton__item el-skeleton__rect" })
                    ]),
                    createBaseVNode("div", { class: "flex-cell" }, [
                      createBaseVNode("div", { class: "el-skeleton__item el-skeleton__circle" }),
                      createBaseVNode("div", { class: "el-skeleton__item el-skeleton__rect" }),
                      createBaseVNode("div", { class: "el-skeleton__item el-skeleton__circle" }),
                      createBaseVNode("div", { class: "el-skeleton__item el-skeleton__rect" })
                    ])
                  ])
                ])
              ], -1))
            ]),
            createBaseVNode("div", _hoisted_15, [
              createBaseVNode("div", _hoisted_16, [
                unref(tokenTo) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createVNode(_component_token_logo, {
                    token: unref(tokenTo),
                    size: "small",
                    class: "distribution-asset-logo"
                  }, null, 8, ["token"]),
                  createBaseVNode("span", _hoisted_17, toDisplayString(unref(toValue)) + " " + toDisplayString(unref(tokenTo).symbol), 1)
                ], 64)) : createCommentVNode("", true)
              ])
            ])
          ]))
        ]),
        _: 1
      }, 16, ["title"]);
    };
  }
});
const SwapDistributionWidget = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e3ed1156"]]);
export {
  SwapDistributionWidget as default
};
