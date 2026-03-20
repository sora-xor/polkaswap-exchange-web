import { z as defineComponent, aZ as components, aI as WALLET_CONSTS, u as useTranslation, U as useLoading, G as useInternalConnect, X as XOR, a4 as onMounted, aA as watch, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, ap as createVNode, ao as withCtx, D as createBaseVNode, bA as withDirectives, aj as unref, aN as toDisplayString, aO as createTextVNode, cd as normalizeStyle, h as computed, a9 as ref, s as store, bp as formatAmountWithSuffix, Z as ZeroStringValue, b1 as resolveLibraryTheme, aP as _export_sfc } from "./index-73GArslZ.js";
import { f as fetchData } from "./burnXor-CuYTXNGC.js";
import { f as fetchBridgeData, a as fetchCount, C as CountType } from "./pointSystem-CMl5Ycuh.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "points__container" };
const _hoisted_2 = { class: "points__header" };
const _hoisted_3 = { class: "points__main s-flex-column" };
const _hoisted_4 = {
  key: 0,
  class: "points__connect s-flex-column"
};
const _hoisted_5 = { class: "points__connect-title d2" };
const _hoisted_6 = { key: 1 };
const _hoisted_7 = { class: "points__card-header s-flex-column" };
const _hoisted_8 = { class: "points__card-title" };
const _hoisted_9 = { class: "points__card points__card-xor" };
const _hoisted_10 = { class: "item s-flex" };
const _hoisted_11 = { class: "item-title" };
const _hoisted_12 = { class: "item-value s-flex" };
const _hoisted_13 = { class: "s-flex-column" };
const _hoisted_14 = { class: "item s-flex" };
const _hoisted_15 = { class: "item-title" };
const _hoisted_16 = { class: "item-value s-flex" };
const _hoisted_17 = { class: "s-flex-column" };
const _hoisted_18 = { class: "points__txs s-flex" };
const _hoisted_19 = { class: "points__block swap s-flex-column" };
const _hoisted_20 = { class: "points__block-value" };
const _hoisted_21 = { class: "points__block bridge s-flex-column" };
const _hoisted_22 = { class: "points__block-value" };
const _hoisted_23 = { class: "points__block pool s-flex-column" };
const _hoisted_24 = { class: "points__block-value" };
const _hoisted_25 = { class: "points__card-header s-flex-column" };
const _hoisted_26 = { class: "points__card-title" };
const _hoisted_27 = { class: "points__card-value s-flex" };
const _hoisted_28 = { class: "item s-flex" };
const _hoisted_29 = { class: "item-title" };
const _hoisted_30 = { class: "item-value s-flex" };
const _hoisted_31 = { class: "s-flex-column" };
const _hoisted_32 = {
  class: "points__soratopia s-flex",
  rel: "nofollow noopener",
  target: "_blank",
  href: "https://t.me/soratopia_bot/app"
};
const _hoisted_33 = { class: "points__soratopia-container s-flex" };
const _hoisted_34 = { class: "points__soratopia-action" };
const _hoisted_35 = { class: "points__soratopia-text" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      FormattedAmount: components.FormattedAmount,
      TokenLogo: components.TokenLogo
    }
  },
  __name: "PointSystem",
  setup(__props) {
    const LogoSize = WALLET_CONSTS.LogoSize;
    const FontWeightRate = WALLET_CONSTS.FontWeightRate;
    const FontSizeRate = WALLET_CONSTS.FontSizeRate;
    const { t } = useTranslation();
    const { loading, withApi, withLoading } = useLoading();
    const { Zero, getFPNumberFromCodec, getFiatAmountByFPNumber, getFPNumberFiatAmountByFPNumber } = useFormattedAmount();
    const { connectSoraWallet, isLoggedIn } = useInternalConnect();
    const referralRewards = computed(() => store.state.referrals.referralRewards);
    const blockNumber = computed(() => store.state.wallet.settings.blockNumber);
    const networkFees = computed(() => store.state.wallet.settings.networkFees);
    const libraryTheme = computed(() => resolveLibraryTheme(store));
    const account = computed(() => store.getters.wallet.account.account);
    const xor = computed(() => store.getters.assets.xor);
    const currencySymbol = computed(() => store.getters.wallet.settings.currencySymbol);
    const burnData = ref(null);
    const bridgeData = ref([]);
    const poolDepositCount = ref(0);
    const poolWithdrawCount = ref(0);
    const totalSwapTxs = ref(0);
    const xorSymbol = XOR.symbol;
    const referralsCardStyles = computed(() => ({
      backgroundImage: `url('/points/${libraryTheme.value}/referrals.png')`
    }));
    const bridgeCardStyles = computed(() => ({
      backgroundImage: `url('/points/${libraryTheme.value}/bridge.png')`
    }));
    const totalReferrals = computed(
      () => referralRewards.value ? Object.keys(referralRewards.value.invitedUserRewards).length : 0
    );
    const bridgeVolume = computed(
      () => bridgeData.value.reduce((acc, { amount, assetId }) => {
        const fiat = getFPNumberFiatAmountByFPNumber(amount, { address: assetId });
        return fiat ? acc.add(fiat) : acc;
      }, Zero)
    );
    const totalBridgeVolume = computed(() => formatAmountWithSuffix(bridgeVolume.value));
    const xorBurned = computed(() => formatAmountWithSuffix(burnData.value ?? Zero));
    const xorBurnedFiat = computed(
      () => burnData.value ? getFiatAmountByFPNumber(burnData.value) || ZeroStringValue : ZeroStringValue
    );
    const totalBridgeTxs = computed(() => bridgeData.value.length);
    const totalPoolTxs = computed(() => poolDepositCount.value + poolWithdrawCount.value);
    const totalOutgoingBridgeTxs = computed(() => bridgeData.value.filter(({ type }) => type === "outgoing").length);
    const totalFees = computed(() => {
      let fees = Zero;
      const currentFees = networkFees.value;
      if (!currentFees) return fees;
      if (totalSwapTxs.value && currentFees.Swap) {
        fees = fees.add(getFPNumberFromCodec(currentFees.Swap).mul(totalSwapTxs.value));
      }
      if (totalOutgoingBridgeTxs.value && currentFees.EthBridgeOutgoing) {
        fees = fees.add(getFPNumberFromCodec(currentFees.EthBridgeOutgoing).mul(totalOutgoingBridgeTxs.value));
      }
      if (poolDepositCount.value && currentFees.AddLiquidity) {
        fees = fees.add(getFPNumberFromCodec(currentFees.AddLiquidity).mul(poolDepositCount.value));
      }
      if (poolWithdrawCount.value && currentFees.RemoveLiquidity) {
        fees = fees.add(getFPNumberFromCodec(currentFees.RemoveLiquidity).mul(poolWithdrawCount.value));
      }
      return fees;
    });
    const feesSpent = computed(() => formatAmountWithSuffix(totalFees.value));
    const feesSpentFiat = computed(() => getFiatAmountByFPNumber(totalFees.value) || ZeroStringValue);
    const totalReferralRewards = computed(
      () => formatAmountWithSuffix(referralRewards.value?.rewards ?? Zero)
    );
    const totalReferralRewardsFiat = computed(() => {
      const rewards = referralRewards.value?.rewards;
      return rewards ? getFiatAmountByFPNumber(rewards) || ZeroStringValue : ZeroStringValue;
    });
    const resetStats = () => {
      burnData.value = null;
      bridgeData.value = [];
      poolDepositCount.value = 0;
      poolWithdrawCount.value = 0;
      totalSwapTxs.value = 0;
    };
    const initData = async () => {
      if (!isLoggedIn.value) {
        resetStats();
        return;
      }
      await store.dispatch.referrals.getAccountReferralRewards();
      const accountAddress = account.value?.address;
      const endBlock = blockNumber.value;
      if (!accountAddress || !endBlock) {
        resetStats();
        return;
      }
      const burnEntries = await fetchData(0, endBlock, accountAddress);
      burnData.value = burnEntries.reduce((acc, { amount }) => acc.add(amount), Zero);
      bridgeData.value = await fetchBridgeData(0, endBlock, accountAddress);
      totalSwapTxs.value = await fetchCount(0, endBlock, accountAddress, CountType.Swap);
      poolDepositCount.value = await fetchCount(0, endBlock, accountAddress, CountType.PoolDeposit);
      poolWithdrawCount.value = await fetchCount(0, endBlock, accountAddress, CountType.PoolWithdraw);
    };
    onMounted(() => {
      void withApi(initData);
    });
    watch(isLoggedIn, async (value) => {
      if (!value) {
        resetStats();
        return;
      }
      await withLoading(initData);
    });
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_formatted_amount = resolveComponent("formatted-amount");
      const _component_token_logo = resolveComponent("token-logo");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_s_card = resolveComponent("s-card");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_s_card, {
          "border-radius": "small",
          shadow: "always",
          size: "medium",
          pressed: "",
          class: "points"
        }, {
          header: withCtx(() => [
            createBaseVNode("h3", _hoisted_2, toDisplayString(unref(t)("points.title")), 1)
          ]),
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_3, [
              !unref(isLoggedIn) ? (openBlock(), createElementBlock("div", _hoisted_4, [
                createBaseVNode("span", _hoisted_5, toDisplayString(unref(t)("points.loginText")), 1),
                createVNode(_component_s_button, {
                  class: "points__connect-action s-typography-button--medium",
                  type: "primary",
                  onClick: unref(connectSoraWallet)
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(unref(t)("connectWalletText")), 1)
                  ]),
                  _: 1
                }, 8, ["onClick"])
              ])) : withDirectives((openBlock(), createElementBlock("div", _hoisted_6, [
                createBaseVNode("div", {
                  class: "points__card points__card-bridge",
                  style: normalizeStyle(bridgeCardStyles.value)
                }, [
                  createBaseVNode("div", _hoisted_7, [
                    createBaseVNode("span", _hoisted_8, toDisplayString(unref(t)("points.bridgeVolume")), 1),
                    createVNode(_component_formatted_amount, {
                      class: "points__card-value",
                      "font-weight-rate": unref(FontWeightRate).MEDIUM,
                      "font-size-rate": unref(FontSizeRate).MEDIUM,
                      value: totalBridgeVolume.value.amount,
                      "asset-symbol": totalBridgeVolume.value.suffix,
                      "symbol-as-decimal": ""
                    }, {
                      prefix: withCtx(() => [
                        createTextVNode(toDisplayString(currencySymbol.value), 1)
                      ]),
                      _: 1
                    }, 8, ["font-weight-rate", "font-size-rate", "value", "asset-symbol"])
                  ])
                ], 4),
                createBaseVNode("div", _hoisted_9, [
                  createBaseVNode("div", _hoisted_10, [
                    createBaseVNode("span", _hoisted_11, toDisplayString(unref(t)("points.feesSpent")), 1),
                    createBaseVNode("div", _hoisted_12, [
                      createBaseVNode("div", _hoisted_13, [
                        createVNode(_component_formatted_amount, {
                          class: "item-value__tokens",
                          value: feesSpent.value.amount
                        }, {
                          prefix: withCtx(() => [
                            createTextVNode(toDisplayString(unref(xorSymbol)), 1)
                          ]),
                          default: withCtx(() => [
                            createTextVNode(" " + toDisplayString(feesSpent.value.suffix), 1)
                          ]),
                          _: 1
                        }, 8, ["value"]),
                        createVNode(_component_formatted_amount, {
                          class: "item-value__fiat",
                          "is-fiat-value": "",
                          "fiat-default-rounding": "",
                          "value-can-be-hidden": "",
                          "font-size-rate": unref(FontSizeRate).MEDIUM,
                          value: feesSpentFiat.value,
                          "is-formatted": ""
                        }, null, 8, ["font-size-rate", "value"])
                      ]),
                      createVNode(_component_token_logo, {
                        class: "item-value__icon",
                        token: xor.value,
                        size: unref(LogoSize).SMALL
                      }, null, 8, ["token", "size"])
                    ])
                  ]),
                  createVNode(_component_s_divider, { class: "points__card-divider" }),
                  createBaseVNode("div", _hoisted_14, [
                    createBaseVNode("span", _hoisted_15, toDisplayString(unref(t)("points.xorBurned")), 1),
                    createBaseVNode("div", _hoisted_16, [
                      createBaseVNode("div", _hoisted_17, [
                        createVNode(_component_formatted_amount, {
                          class: "item-value__tokens",
                          value: xorBurned.value.amount
                        }, {
                          prefix: withCtx(() => [
                            createTextVNode(toDisplayString(unref(xorSymbol)), 1)
                          ]),
                          default: withCtx(() => [
                            createTextVNode(" " + toDisplayString(xorBurned.value.suffix), 1)
                          ]),
                          _: 1
                        }, 8, ["value"]),
                        createVNode(_component_formatted_amount, {
                          class: "item-value__fiat",
                          "is-fiat-value": "",
                          "fiat-default-rounding": "",
                          "value-can-be-hidden": "",
                          "font-size-rate": unref(FontSizeRate).MEDIUM,
                          value: xorBurnedFiat.value,
                          "is-formatted": ""
                        }, null, 8, ["font-size-rate", "value"])
                      ]),
                      createVNode(_component_token_logo, {
                        class: "item-value__icon",
                        token: xor.value,
                        size: unref(LogoSize).SMALL
                      }, null, 8, ["token", "size"])
                    ])
                  ])
                ]),
                createBaseVNode("div", _hoisted_18, [
                  createBaseVNode("div", _hoisted_19, [
                    _cache[0] || (_cache[0] = createBaseVNode("span", { class: "points__block-header" }, "SWAP TXNS", -1)),
                    createBaseVNode("span", _hoisted_20, toDisplayString(totalSwapTxs.value), 1)
                  ]),
                  createBaseVNode("div", _hoisted_21, [
                    _cache[1] || (_cache[1] = createBaseVNode("span", { class: "points__block-header" }, "BRIDGE TXNS", -1)),
                    createBaseVNode("span", _hoisted_22, toDisplayString(totalBridgeTxs.value), 1)
                  ]),
                  createBaseVNode("div", _hoisted_23, [
                    _cache[2] || (_cache[2] = createBaseVNode("span", { class: "points__block-header" }, "POOL TXNS", -1)),
                    createBaseVNode("span", _hoisted_24, toDisplayString(totalPoolTxs.value), 1)
                  ])
                ]),
                createBaseVNode("div", {
                  class: "points__card points__card-referrals",
                  style: normalizeStyle(referralsCardStyles.value)
                }, [
                  createBaseVNode("div", _hoisted_25, [
                    createBaseVNode("span", _hoisted_26, toDisplayString(unref(t)("points.yourReferrals")), 1),
                    createBaseVNode("span", _hoisted_27, [
                      _cache[3] || (_cache[3] = createBaseVNode("span", { class: "account-icon" }, null, -1)),
                      createTextVNode(" " + toDisplayString(unref(t)("points.accountsText", { amount: totalReferrals.value })), 1)
                    ])
                  ]),
                  createVNode(_component_s_divider, { class: "points__card-divider" }),
                  createBaseVNode("div", _hoisted_28, [
                    createBaseVNode("span", _hoisted_29, toDisplayString(unref(t)("points.yourRewards")), 1),
                    createBaseVNode("div", _hoisted_30, [
                      createBaseVNode("div", _hoisted_31, [
                        createVNode(_component_formatted_amount, {
                          class: "item-value__tokens",
                          value: totalReferralRewards.value.amount
                        }, {
                          prefix: withCtx(() => [
                            createTextVNode(toDisplayString(unref(xorSymbol)), 1)
                          ]),
                          default: withCtx(() => [
                            createTextVNode(" " + toDisplayString(totalReferralRewards.value.suffix), 1)
                          ]),
                          _: 1
                        }, 8, ["value"]),
                        createVNode(_component_formatted_amount, {
                          class: "item-value__fiat",
                          "is-fiat-value": "",
                          "fiat-default-rounding": "",
                          "value-can-be-hidden": "",
                          "font-size-rate": unref(FontSizeRate).MEDIUM,
                          value: totalReferralRewardsFiat.value,
                          "is-formatted": ""
                        }, null, 8, ["font-size-rate", "value"])
                      ]),
                      createVNode(_component_token_logo, {
                        class: "item-value__icon",
                        token: xor.value,
                        size: unref(LogoSize).SMALL
                      }, null, 8, ["token", "size"])
                    ])
                  ])
                ], 4)
              ])), [
                [_directive_loading, unref(loading)]
              ]),
              createBaseVNode("a", _hoisted_32, [
                createBaseVNode("div", _hoisted_33, [
                  createBaseVNode("button", _hoisted_34, toDisplayString(unref(t)("points.openTelegram")), 1),
                  createBaseVNode("span", _hoisted_35, toDisplayString(unref(t)("points.toEarnPoints")), 1)
                ])
              ])
            ])
          ]),
          _: 1
        })
      ]);
    };
  }
});
const PointSystem = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e98fe5df"]]);
export {
  PointSystem as default
};
