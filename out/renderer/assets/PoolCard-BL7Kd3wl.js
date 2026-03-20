import { z as defineComponent, Z as ZeroStringValue, aZ as components, ak as lazyComponent, cG as demeterStakingLazyComponent, bm as toRefs, u as useTranslation, G as useInternalConnect, dH as Links, h as computed, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, an as createSlots, aM as createCommentVNode, aj as unref, D as createBaseVNode, aN as toDisplayString, A as createElementBlock, bQ as Fragment, aO as createTextVNode, bb as normalizeClass, al as Components, cH as DemeterStakingComponents, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useDemeterPoolStatus } from "./useDemeterPoolStatus-2sPwJr2b.js";
import { u as useDemeterPoolCard } from "./useDemeterPoolCard-B9FeKKhi.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "demeter-pool-card-status" };
const _hoisted_2 = { class: "demeter-pool-card-status-title" };
const _hoisted_3 = { class: "apr" };
const _hoisted_4 = { class: "apr-label" };
const _hoisted_5 = ["href"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    inheritAttrs: false,
    components: {
      CalculatorButton: demeterStakingLazyComponent(DemeterStakingComponents.CalculatorButton),
      PoolInfo: lazyComponent(Components.PoolInfo),
      InfoLine: components.InfoLine
    }
  },
  __name: "PoolCard",
  props: {
    border: { type: Boolean, default: false },
    showBalance: { type: Boolean, default: false },
    liquidity: { type: Object, default: null },
    pool: { type: Object, default: null },
    accountPool: { type: Object, default: null },
    poolAsset: { type: Object, default: null },
    rewardAsset: { type: Object, default: null },
    apr: { type: String, default: ZeroStringValue },
    tvl: { type: String, default: ZeroStringValue }
  },
  emits: ["add", "remove", "claim", "calculator"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { border, showBalance, liquidity, pool, accountPool, poolAsset, rewardAsset, apr, tvl } = toRefs(props);
    const { t, TranslationConsts } = useTranslation();
    const { connectSoraWallet, isLoggedIn } = useInternalConnect();
    const statusApi = useDemeterPoolStatus({
      liquidity,
      pool,
      accountPool,
      poolAsset,
      rewardAsset
    });
    const cardApi = useDemeterPoolCard(statusApi);
    const link = Links.demeterFarmingPlatform;
    const title = computed(() => {
      const key = statusApi.activeStatus.value ? statusApi.hasStake.value ? "active" : "inactive" : "stopped";
      return t(`demeterFarming.staking.${key}`);
    });
    const primaryButtonText = computed(() => t(`demeterFarming.actions.${statusApi.hasStake.value ? "add" : "start"}`));
    const pricesAvailable = computed(() => statusApi.pricesAvailable.value);
    const hasStake = computed(() => statusApi.hasStake.value);
    const hasRewards = computed(() => cardApi.hasRewards.value);
    const depositDisabled = computed(() => statusApi.depositDisabled.value);
    const poolAssetBalanceFormatted = computed(() => statusApi.poolAssetBalance.value.toLocaleString());
    const poolAssetBalanceFiat = computed(() => {
      const asset = statusApi.poolAsset.value;
      if (!asset) return null;
      return statusApi.getFiatAmountByFPNumber(statusApi.poolAssetBalance.value, asset);
    });
    const rewardAssetSymbol = computed(() => cardApi.rewardAssetSymbol.value);
    const poolAssetSymbol = computed(() => cardApi.poolAssetSymbol.value);
    const rewardsFormatted = computed(() => cardApi.rewardsFormatted.value);
    const rewardsFiat = computed(() => cardApi.rewardsFiat.value);
    const poolShareFormatted = computed(() => cardApi.poolShareFormatted.value);
    const poolShareFiat = computed(() => cardApi.poolShareFiat.value);
    const depositFeeFormatted = computed(() => cardApi.depositFeeFormatted.value);
    const poolShareText = computed(() => t("demeterFarming.info.poolShare", cardApi.poolShareTextArgs.value));
    const add = () => emit("add", statusApi.emitParams.value);
    const remove = () => emit("remove", statusApi.emitParams.value);
    const claim = () => emit("claim", statusApi.emitParams.value);
    const calculator = () => emit("calculator", statusApi.emitParams.value);
    __expose({
      border,
      showBalance,
      title,
      primaryButtonText,
      poolAssetBalanceFormatted,
      poolAssetBalanceFiat,
      connectSoraWallet,
      isLoggedIn,
      pricesAvailable,
      hasStake,
      hasRewards,
      depositDisabled,
      rewardAssetSymbol,
      poolAssetSymbol,
      rewardsFormatted,
      rewardsFiat,
      poolShareFormatted,
      poolShareFiat,
      depositFeeFormatted,
      poolShareText,
      add,
      remove,
      claim,
      calculator,
      statusApi,
      cardApi,
      link,
      apr,
      tvl
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_info_line = resolveComponent("info-line");
      const _component_calculator_button = resolveComponent("calculator-button");
      const _component_s_button = resolveComponent("s-button");
      const _component_pool_info = resolveComponent("pool-info");
      const _component_s_card = resolveComponent("s-card");
      return openBlock(), createBlock(_component_s_card, {
        class: normalizeClass(["demeter-pool-card", { border: unref(border) }])
      }, {
        default: withCtx(() => [
          createVNode(_component_pool_info, null, createSlots({
            prepend: withCtx(() => [
              createBaseVNode("div", _hoisted_1, [
                hasStake.value ? (openBlock(), createBlock(_component_s_icon, {
                  key: 0,
                  name: "basic-placeholder-24",
                  size: "12",
                  class: normalizeClass(["demeter-pool-card-status-icon", { active: _ctx.activeStatus }])
                }, null, 8, ["class"])) : createCommentVNode("", true),
                createBaseVNode("span", _hoisted_2, toDisplayString(title.value), 1)
              ])
            ]),
            append: withCtx(() => [
              _ctx.activeStatus ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                unref(isLoggedIn) ? (openBlock(), createBlock(_component_s_button, {
                  key: "connected",
                  type: "primary",
                  class: "s-typography-button--large action-button",
                  disabled: depositDisabled.value,
                  onClick: add
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(primaryButtonText.value), 1)
                  ]),
                  _: 1
                }, 8, ["disabled"])) : (openBlock(), createBlock(_component_s_button, {
                  type: "primary",
                  key: "disconnected",
                  class: "s-typography-button--large action-button",
                  onClick: unref(connectSoraWallet)
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(unref(t)("connectWalletText")), 1)
                  ]),
                  _: 1
                }, 8, ["onClick"]))
              ], 64)) : createCommentVNode("", true),
              createBaseVNode("a", {
                href: unref(link),
                target: "_blank",
                rel: "nofollow noopener",
                class: "demeter-pool-card-copyright"
              }, toDisplayString(unref(t)("demeterFarming.poweredBy")), 9, _hoisted_5)
            ]),
            default: withCtx(() => [
              unref(isLoggedIn) && unref(showBalance) ? (openBlock(), createBlock(_component_info_line, {
                key: 0,
                "value-can-be-hidden": "",
                label: unref(t)("demeterFarming.info.owned", { symbol: poolAssetSymbol.value }),
                value: poolAssetBalanceFormatted.value,
                "fiat-value": poolAssetBalanceFiat.value
              }, null, 8, ["label", "value", "fiat-value"])) : createCommentVNode("", true),
              pricesAvailable.value ? (openBlock(), createBlock(_component_info_line, {
                key: 1,
                value: unref(apr)
              }, {
                "info-line-prefix": withCtx(() => [
                  createBaseVNode("div", _hoisted_3, [
                    createBaseVNode("span", _hoisted_4, toDisplayString(unref(TranslationConsts).APR), 1),
                    createVNode(_component_calculator_button, { onClick: calculator }, {
                      default: withCtx(() => [
                        createBaseVNode("span", null, toDisplayString(unref(t)("demeterFarming.calculator")), 1)
                      ]),
                      _: 1
                    })
                  ])
                ]),
                _: 1
              }, 8, ["value"])) : createCommentVNode("", true),
              pricesAvailable.value ? (openBlock(), createBlock(_component_info_line, {
                key: 2,
                label: unref(t)("demeterFarming.info.totalLiquidityLocked"),
                value: unref(tvl)
              }, null, 8, ["label", "value"])) : createCommentVNode("", true),
              createVNode(_component_info_line, {
                label: unref(t)("demeterFarming.info.rewardToken"),
                value: rewardAssetSymbol.value
              }, null, 8, ["label", "value"]),
              hasStake.value || hasRewards.value ? (openBlock(), createBlock(_component_info_line, {
                key: 3,
                "value-can-be-hidden": "",
                label: unref(t)("demeterFarming.info.earned", { symbol: rewardAssetSymbol.value }),
                value: rewardsFormatted.value,
                "fiat-value": rewardsFiat.value
              }, null, 8, ["label", "value", "fiat-value"])) : createCommentVNode("", true),
              hasStake.value ? (openBlock(), createBlock(_component_info_line, {
                key: "has-stake",
                "value-can-be-hidden": "",
                label: poolShareText.value,
                value: poolShareFormatted.value,
                "fiat-value": poolShareFiat.value
              }, null, 8, ["label", "value", "fiat-value"])) : (openBlock(), createBlock(_component_info_line, {
                key: "no-stake",
                label: unref(t)("demeterFarming.info.fee"),
                "label-tooltip": unref(t)("demeterFarming.info.feeTooltip"),
                value: depositFeeFormatted.value
              }, null, 8, ["label", "label-tooltip", "value"]))
            ]),
            _: 2
          }, [
            hasStake.value || hasRewards.value ? {
              name: "buttons",
              fn: withCtx(() => [
                createVNode(_component_s_button, {
                  type: "secondary",
                  class: "s-typography-button--medium",
                  onClick: claim,
                  disabled: !hasRewards.value
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(unref(t)("demeterFarming.actions.claim")), 1)
                  ]),
                  _: 1
                }, 8, ["disabled"]),
                createVNode(_component_s_button, {
                  type: "secondary",
                  class: "s-typography-button--medium",
                  onClick: remove,
                  disabled: !hasStake.value
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(unref(t)("demeterFarming.actions.remove")), 1)
                  ]),
                  _: 1
                }, 8, ["disabled"])
              ]),
              key: "0"
            } : void 0
          ]), 1024)
        ]),
        _: 1
      }, 8, ["class"]);
    };
  }
});
const PoolCard = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-bd75eea4"]]);
export {
  PoolCard as default
};
