import { z as defineComponent, ak as lazyComponent, aZ as components, aI as WALLET_CONSTS, a9 as ref, u as useTranslation, U as useLoading, G as useInternalConnect, s as store, a4 as onMounted, aA as watch, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, ap as createVNode, ao as withCtx, D as createBaseVNode, bA as withDirectives, aj as unref, aN as toDisplayString, aO as createTextVNode, bb as normalizeClass, bQ as Fragment, bP as renderList, am as createBlock, aM as createCommentVNode, h as computed, al as Components, X as XOR, bl as VXOR, aw as KUSD, dQ as convertFPNumberToNumber, aP as _export_sfc } from "./index-73GArslZ.js";
import { P as POINTS_PER_PERCENT, c as categoriesPointSystem, p as pointSystemCategory } from "./pointSystem-B9fONsCS.js";
import { b as fetchAccountMeta } from "./pointSystem-CMl5Ycuh.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import "./tabs-xjDSPYBb.js";
class PointsService {
  findLevel(levels, value, maxPercentage) {
    const matchedLevelIndex = levels.findIndex((level, index) => {
      const nextLevelThreshold = levels[index + 1]?.threshold ?? Infinity;
      return value >= level.threshold && value < nextLevelThreshold;
    });
    const finalIndex = matchedLevelIndex !== -1 ? matchedLevelIndex : levels.length - 1;
    const matchedLevel = levels[finalIndex];
    const nextLevel = levels[finalIndex + 1] ?? null;
    const nextLevelRewardPoints = nextLevel ? parseFloat((nextLevel.multiplier * maxPercentage * POINTS_PER_PERCENT).toFixed(0)) : null;
    const currentProgress = value;
    const minimumAmountForNextLevel = nextLevel ? nextLevel.threshold : null;
    return {
      levelCurrent: finalIndex + 1,
      threshold: matchedLevel.threshold,
      multiplier: matchedLevel.multiplier,
      nextLevelRewardPoints,
      currentProgress,
      minimumAmountForNextLevel
    };
  }
  getEraCoefficient(era) {
    if (era === 1) {
      return 0.5;
    }
    return 1;
  }
  calculateCategoryPoints(categoryValues) {
    const results = {};
    const firstTxAccountResult = {};
    Object.entries(categoryValues).forEach(([categoryName, value]) => {
      const category = categoriesPointSystem[categoryName];
      if (!category) {
        throw new Error(`Category "${categoryName}" was not found.`);
      }
      const { levelCurrent, threshold, multiplier, nextLevelRewardPoints, currentProgress, minimumAmountForNextLevel } = this.findLevel(category.levels, value, category.maxPercentage);
      const points = parseFloat((multiplier * category.maxPercentage * POINTS_PER_PERCENT).toFixed(0));
      const categoryData = {
        levelCurrent,
        threshold,
        points,
        nextLevelRewardPoints,
        currentProgress,
        minimumAmountForNextLevel,
        titleProgress: category.titleProgress,
        titleTask: category.titleTask,
        descriptionTask: category.descriptionTask,
        imageName: category.imageName
      };
      if (categoryName === "firstTxAccount") {
        firstTxAccountResult[categoryName] = categoryData;
      } else {
        results[categoryName] = categoryData;
      }
    });
    return { ...results, ...firstTxAccountResult };
  }
}
const pointsService = new PointsService();
const _hoisted_1 = { class: "points__container" };
const _hoisted_2 = { class: "points__header" };
const _hoisted_3 = { key: 0 };
const _hoisted_4 = { class: "points__main s-flex-row" };
const _hoisted_5 = {
  key: 0,
  class: "points__connect s-flex-column"
};
const _hoisted_6 = { class: "points__connect-title d2" };
const _hoisted_7 = {
  class: "points__soratopia s-flex",
  rel: "nofollow noopener",
  target: "_blank",
  href: "https://t.me/soratopia_bot/app"
};
const _hoisted_8 = { class: "points__soratopia-container s-flex" };
const _hoisted_9 = { class: "points__soratopia-action" };
const _hoisted_10 = { class: "points__soratopia-text" };
const _hoisted_11 = { class: "points__cards" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      FormattedAmount: components.FormattedAmount,
      TokenLogo: components.TokenLogo,
      PointCard: lazyComponent(Components.PointCard),
      TaskCard: lazyComponent(Components.TaskCard),
      FirstTxCard: lazyComponent(Components.FirstTxCard)
    }
  },
  __name: "PointSystemV2",
  setup(__props) {
    WALLET_CONSTS.LogoSize;
    const categoryPoints = ref(pointSystemCategory.tasks);
    const pointsForCards = ref(null);
    const { t } = useTranslation();
    const { loading, withApi, withLoading } = useLoading();
    const { getFiatAmountByCodecString, getFiatBalance } = useFormattedAmount();
    const { connectSoraWallet, isLoggedIn } = useInternalConnect();
    const referralRewards = computed(() => store.state.referrals.referralRewards);
    const accountAssets = computed(() => store.state.wallet.account.accountAssets ?? []);
    const accountLiquidity = computed(() => store.state.pool.accountLiquidity ?? []);
    const account = computed(() => store.getters.wallet.account.account);
    const getAsset = store.getters.assets.assetDataByAddress;
    const totalPoints = computed(() => {
      if (!pointsForCards.value) return 0;
      return Object.values(pointsForCards.value).reduce((sum, category) => sum + (category.points || 0), 0);
    });
    const parseFiat = (value) => {
      if (!value) return 0;
      return parseFloat(value.replace(",", "."));
    };
    const getTotalLiquidityFiatValue = () => accountLiquidity.value.reduce((total, liquidity) => {
      const firstAsset = getAsset(liquidity.firstAddress);
      const secondAsset = getAsset(liquidity.secondAddress);
      const firstValue = firstAsset != null ? parseFiat(getFiatAmountByCodecString(liquidity.firstBalance, firstAsset)) : 0;
      const secondValue = secondAsset != null ? parseFiat(getFiatAmountByCodecString(liquidity.secondBalance, secondAsset)) : 0;
      return total + firstValue + secondValue;
    }, 0);
    const getCurrentFiatBalanceForToken = (assetSymbol) => {
      const asset = accountAssets.value.find((value) => value.symbol === assetSymbol);
      return parseFiat(getFiatBalance(asset));
    };
    const getPointsForCategories = (pointSystems) => {
      const firstTxAccount = pointSystems.createdAt.timestamp ?? 0;
      const liquidityProvision = getTotalLiquidityFiatValue();
      const XORHoldings = getCurrentFiatBalanceForToken(XOR.symbol);
      const VXORHoldings = getCurrentFiatBalanceForToken(VXOR.symbol);
      const KUSDHoldings = getCurrentFiatBalanceForToken(KUSD.symbol);
      const referralRewardsValue = convertFPNumberToNumber(referralRewards.value?.rewards);
      const points = pointSystems.points.reduce(
        (acc, era) => {
          const eraCoefficient = pointsService.getEraCoefficient(era.version);
          const depositVolumeBridges = convertFPNumberToNumber(era.bridge.incomingUSD) + convertFPNumberToNumber(era.bridge.outgoingUSD);
          const networkFeeSpent = convertFPNumberToNumber(era.fees.amountUSD);
          const XORBurned = convertFPNumberToNumber(era.burned.amountUSD);
          const kensetsuVolumeRepaid = convertFPNumberToNumber(era.kensetsu.amountUSD);
          const orderbookVolume = convertFPNumberToNumber(era.orderBook.amountUSD);
          const governanceLockedXOR = convertFPNumberToNumber(era.governance.amountUSD);
          const nativeXorStaking = convertFPNumberToNumber(era.staking.amountUSD);
          acc.depositVolumeBridges += depositVolumeBridges * eraCoefficient;
          acc.networkFeeSpent += networkFeeSpent * eraCoefficient;
          acc.XORBurned += XORBurned * eraCoefficient;
          acc.kensetsuVolumeRepaid += kensetsuVolumeRepaid * eraCoefficient;
          acc.orderbookVolume += orderbookVolume * eraCoefficient;
          acc.governanceLockedXOR += governanceLockedXOR * eraCoefficient;
          acc.nativeXorStaking += nativeXorStaking * eraCoefficient;
          return acc;
        },
        {
          depositVolumeBridges: 0,
          networkFeeSpent: 0,
          XORBurned: 0,
          kensetsuVolumeRepaid: 0,
          orderbookVolume: 0,
          governanceLockedXOR: 0,
          nativeXorStaking: 0
        }
      );
      return {
        firstTxAccount,
        liquidityProvision,
        XORHoldings,
        VXORHoldings,
        KUSDHoldings,
        referralRewards: referralRewardsValue,
        ...points
      };
    };
    const initData = async () => {
      if (!isLoggedIn.value) {
        pointsForCards.value = null;
        return;
      }
      await store.dispatch.referrals.getAccountReferralRewards();
      const accountAddress = account.value?.address;
      if (!accountAddress) {
        pointsForCards.value = null;
        return;
      }
      const accountMeta = await fetchAccountMeta(accountAddress);
      pointsForCards.value = accountMeta ? pointsService.calculateCategoryPoints(getPointsForCategories(accountMeta)) : null;
    };
    onMounted(() => {
      void withApi(async () => {
        await store.dispatch.pool.subscribeOnAccountLiquidityList();
        await store.dispatch.pool.subscribeOnAccountLiquidityUpdates();
        await initData();
      });
    });
    watch(isLoggedIn, async (value) => {
      if (!value) {
        pointsForCards.value = null;
        return;
      }
      await withLoading(initData);
    });
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_task_card = resolveComponent("task-card");
      const _component_s_scrollbar = resolveComponent("s-scrollbar");
      const _component_s_tab = resolveComponent("s-tab");
      const _component_point_card = resolveComponent("point-card");
      const _component_first_tx_card = resolveComponent("first-tx-card");
      const _component_s_tabs = resolveComponent("s-tabs");
      const _component_s_card = resolveComponent("s-card");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_s_card, {
          "border-radius": "small",
          shadow: "always",
          size: "medium",
          pressed: "",
          class: normalizeClass(["points", { "points-loading": unref(loading) }])
        }, {
          header: withCtx(() => [
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("div", null, [
                createBaseVNode("h2", null, toDisplayString(unref(t)("points.title")), 1),
                !unref(loading) && unref(isLoggedIn) ? (openBlock(), createElementBlock("h3", _hoisted_3, toDisplayString(totalPoints.value), 1)) : createCommentVNode("", true)
              ]),
              createBaseVNode("p", null, toDisplayString(unref(t)("points.airdrop")), 1)
            ])
          ]),
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_4, [
              !unref(isLoggedIn) ? (openBlock(), createElementBlock("div", _hoisted_5, [
                createBaseVNode("span", _hoisted_6, toDisplayString(unref(t)("points.loginText")), 1),
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
              ])) : withDirectives((openBlock(), createElementBlock("div", {
                key: 1,
                class: normalizeClass(["points__cards", "s-flex-column", { loading: unref(loading) }])
              }, [
                createVNode(_component_s_tabs, {
                  modelValue: categoryPoints.value,
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => categoryPoints.value = $event),
                  type: "rounded",
                  class: "points__tabs"
                }, {
                  default: withCtx(() => [
                    createVNode(_component_s_tab, {
                      label: unref(t)("points.yourTasks").toUpperCase(),
                      name: "tasks"
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_s_scrollbar, {
                          class: "points__cards-scrollbar",
                          "wrap-style": { padding: "0", margin: "0", overflowY: "auto" }
                        }, {
                          default: withCtx(() => [
                            createBaseVNode("a", _hoisted_7, [
                              createBaseVNode("div", _hoisted_8, [
                                createBaseVNode("button", _hoisted_9, toDisplayString(unref(t)("points.openTelegram")), 1),
                                createBaseVNode("span", _hoisted_10, toDisplayString(unref(t)("points.toEarnPoints")), 1)
                              ])
                            ]),
                            (openBlock(true), createElementBlock(Fragment, null, renderList(pointsForCards.value, (pointsForCategory, categoryName) => {
                              return openBlock(), createBlock(_component_task_card, {
                                key: categoryName,
                                "points-for-category": pointsForCategory,
                                "category-name": categoryName,
                                class: "points__card-task"
                              }, null, 8, ["points-for-category", "category-name"]);
                            }), 128))
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }, 8, ["label"]),
                    createVNode(_component_s_tab, {
                      label: unref(t)("points.progress").toUpperCase(),
                      name: "progress"
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_s_scrollbar, {
                          class: "points__cards-scrollbar",
                          "wrap-style": { padding: "0", margin: "0", overflowY: "auto" }
                        }, {
                          default: withCtx(() => [
                            createBaseVNode("div", _hoisted_11, [
                              (openBlock(true), createElementBlock(Fragment, null, renderList(Object.entries(pointsForCards.value ?? {}).slice(0, -1), ([categoryName, pointsForCategory]) => {
                                return openBlock(), createBlock(_component_point_card, {
                                  key: categoryName,
                                  "points-for-category": pointsForCategory,
                                  "category-name": categoryName,
                                  class: "points__card"
                                }, null, 8, ["points-for-category", "category-name"]);
                              }), 128)),
                              createVNode(_component_first_tx_card, {
                                class: "points__first-tx-card",
                                date: pointsForCards.value?.firstTxAccount?.currentProgress ?? 0
                              }, null, 8, ["date"])
                            ])
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }, 8, ["label"])
                  ]),
                  _: 1
                }, 8, ["modelValue"])
              ], 2)), [
                [_directive_loading, unref(loading)]
              ])
            ])
          ]),
          _: 1
        }, 8, ["class"])
      ]);
    };
  }
});
const PointSystemV2 = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7e72bd0a"]]);
export {
  PointSystemV2 as default
};
