import { z as defineComponent, bt as mergeModels, aZ as components, ak as lazyComponent, cG as demeterStakingLazyComponent, bu as useModel, bm as toRefs, e as useSettingsStore, H as useAssetsStore, u as useTranslation, aA as watch, dH as Links, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, h as computed, aj as unref, A as createElementBlock, aM as createCommentVNode, bQ as Fragment, a9 as ref, bP as renderList, aN as toDisplayString, F as FPNumber, al as Components, cH as DemeterStakingComponents, M as getMaxValue, O as Operation, g as getAssetBalance, cu as isMaxButtonAvailable, aU as formatDecimalPlaces, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useDemeterPoolStatus } from "./useDemeterPoolStatus-2sPwJr2b.js";
import { u as useDemeterPoolCard } from "./useDemeterPoolCard-B9FeKKhi.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "calculator-dialog" };
const _hoisted_2 = { class: "duration" };
const _hoisted_3 = { class: "results" };
const _hoisted_4 = { class: "results-title" };
const _hoisted_5 = ["href"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogTitle: demeterStakingLazyComponent(DemeterStakingComponents.DialogTitle),
      TokenInput: lazyComponent(Components.TokenInput),
      DialogBase: components.DialogBase,
      InfoLine: components.InfoLine
    }
  },
  __name: "CalculatorDialog",
  props: /* @__PURE__ */ mergeModels({
    parentLoading: { type: Boolean, default: false },
    liquidity: { type: Object, default: null },
    baseAsset: { type: Object, default: null },
    pool: { type: Object, default: null },
    accountPool: { type: Object, default: null },
    poolAsset: { type: Object, default: null },
    rewardAsset: { type: Object, default: null },
    emission: { type: Object, default: () => FPNumber.ZERO }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["close"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const props = __props;
    const isVisible = useModel(__props, "visible");
    const { baseAsset, poolAsset, rewardAsset, liquidity, pool, accountPool } = toRefs(props);
    const settingsStore = useSettingsStore();
    const assetsStore = useAssetsStore();
    const networkFees = computed(() => settingsStore.networkFees);
    const xorAsset = computed(() => assetsStore.xor);
    const { t, TranslationConsts } = useTranslation();
    const statusApi = useDemeterPoolStatus({
      liquidity,
      pool,
      accountPool,
      poolAsset,
      rewardAsset
    });
    const cardApi = useDemeterPoolCard(statusApi);
    const baseAssetValue = ref("");
    const poolAssetValue = ref("");
    watch(
      isVisible,
      () => {
        baseAssetValue.value = "";
        poolAssetValue.value = "";
      }
    );
    const intervals = [1, 7, 30, 90];
    const interval = ref(1);
    const link = Links.demeterFarmingPlatform;
    const isFarm = computed(() => statusApi.isFarm.value);
    const lpBalance = computed(() => statusApi.lpBalance.value);
    const networkFee = computed(() => networkFees.value?.[Operation.DemeterFarmingDepositLiquidity] ?? "0");
    const selectedPeriod = computed(() => String(interval.value));
    const rewardsText = computed(() => t("demeterFarming.rewards", { symbol: cardApi.rewardAssetSymbol.value }));
    const baseAssetDecimals = computed(() => baseAsset.value?.decimals ?? FPNumber.DEFAULT_PRECISION);
    const baseAssetBalance = computed(
      () => baseAsset.value ? FPNumber.fromCodecValue(getAssetBalance(baseAsset.value) ?? 0, baseAssetDecimals.value) : FPNumber.ZERO
    );
    const poolAssetBalance = computed(
      () => poolAsset.value ? FPNumber.fromCodecValue(
        getAssetBalance(poolAsset.value) ?? 0,
        poolAsset.value.decimals ?? FPNumber.DEFAULT_PRECISION
      ) : FPNumber.ZERO
    );
    const isBaseAssetMaxButtonAvailable = computed(() => {
      if (!baseAsset.value) return false;
      return isMaxButtonAvailable(baseAsset.value, baseAssetValue.value, networkFee.value, xorAsset.value);
    });
    const isPoolAssetMaxButtonAvailable = computed(() => {
      if (!poolAsset.value) return false;
      return isMaxButtonAvailable(poolAsset.value, poolAssetValue.value, networkFee.value, xorAsset.value);
    });
    const userTokensDeposit = computed(() => {
      if (!poolAsset.value) return FPNumber.ZERO;
      const poolValue = new FPNumber(poolAssetValue.value || 0);
      if (!isFarm.value) return poolValue;
      const secondBalance = FPNumber.fromCodecValue(statusApi.liquidity.value?.secondBalance ?? 0);
      if (secondBalance.isZero()) return FPNumber.ZERO;
      return lpBalance.value.mul(poolValue).div(secondBalance);
    });
    const userTokensDepositWithFee = computed(() => {
      const depositFee = new FPNumber(cardApi.depositFee.value);
      return userTokensDeposit.value.mul(FPNumber.ONE.sub(depositFee));
    });
    const calculatedRewards = computed(() => {
      const currentPool = statusApi.pool.value;
      if (!currentPool) return FPNumber.ZERO;
      const totalDeposit = currentPool.totalTokensInPool.add(userTokensDepositWithFee.value);
      if (totalDeposit.isZero()) return FPNumber.ZERO;
      const period = new FPNumber(interval.value);
      const blocksPerDay = new FPNumber(14400);
      const blocksProduced = period.mul(blocksPerDay);
      return props.emission.mul(blocksProduced).mul(userTokensDepositWithFee.value).div(totalDeposit);
    });
    const calculatedRewardsFormatted = computed(() => calculatedRewards.value.toLocaleString());
    const calculatedRewardsFiat = computed(() => {
      if (!rewardAsset.value) return null;
      return statusApi.getFiatAmountByFPNumber(calculatedRewards.value, rewardAsset.value);
    });
    const calculatedRoiPercent = computed(() => {
      if (!poolAsset.value) return FPNumber.ZERO;
      const deposit = new FPNumber(poolAssetValue.value || 0);
      if (deposit.isZero() || cardApi.poolAssetPrice.value.isZero()) return FPNumber.ZERO;
      const multiplier = isFarm.value ? 2 : 1;
      const valueOfDepositUSD = deposit.mul(new FPNumber(multiplier)).mul(cardApi.poolAssetPrice.value);
      const costOfDepositFeeUSD = valueOfDepositUSD.mul(new FPNumber(cardApi.depositFee.value));
      const costOfNetworkFeeUSD = FPNumber.fromCodecValue(networkFee.value).mul(
        FPNumber.fromCodecValue(statusApi.getAssetFiatPrice(xorAsset.value) ?? 0)
      );
      const costOfInvestmentUSD = costOfDepositFeeUSD.add(costOfNetworkFeeUSD);
      const valueOfInvestmentUSD = calculatedRewards.value.mul(cardApi.rewardAssetPrice.value);
      return valueOfInvestmentUSD.sub(costOfInvestmentUSD).div(valueOfDepositUSD).mul(FPNumber.HUNDRED);
    });
    const calculatedRoiPercentFormatted = computed(() => formatDecimalPlaces(calculatedRoiPercent.value, true));
    const selectPeriod = (name) => {
      interval.value = Number(name);
    };
    const syncPoolValueFromBase = () => {
      if (!liquidity.value) return;
      const second = FPNumber.fromCodecValue(liquidity.value.secondBalance ?? 0);
      const first = FPNumber.fromCodecValue(liquidity.value.firstBalance ?? 0);
      if (first.isZero()) return;
      poolAssetValue.value = new FPNumber(baseAssetValue.value || 0).mul(second).div(first).toString();
    };
    const syncBaseValueFromPool = () => {
      if (!liquidity.value) return;
      const second = FPNumber.fromCodecValue(liquidity.value.secondBalance ?? 0);
      const first = FPNumber.fromCodecValue(liquidity.value.firstBalance ?? 0);
      if (second.isZero()) return;
      baseAssetValue.value = new FPNumber(poolAssetValue.value || 0).mul(first).div(second).toString();
    };
    const handleBaseAssetValue = (value) => {
      baseAssetValue.value = value;
      if (!value) {
        poolAssetValue.value = "";
      } else {
        syncPoolValueFromBase();
      }
    };
    const handlePoolAssetValue = (value) => {
      poolAssetValue.value = value;
      if (!value) {
        baseAssetValue.value = "";
      } else {
        syncBaseValueFromPool();
      }
    };
    const handleBaseAssetMax = () => {
      if (!baseAsset.value) return;
      handleBaseAssetValue(getMaxValue(baseAsset.value, networkFee.value));
    };
    const handlePoolAssetMax = () => {
      if (!poolAsset.value) return;
      handlePoolAssetValue(getMaxValue(poolAsset.value, networkFee.value));
    };
    return (_ctx, _cache) => {
      const _component_dialog_title = resolveComponent("dialog-title");
      const _component_token_input = resolveComponent("token-input");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_form = resolveComponent("s-form");
      const _component_info_line = resolveComponent("info-line");
      const _component_s_tab = resolveComponent("s-tab");
      const _component_s_tabs = resolveComponent("s-tabs");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event),
        title: `${unref(TranslationConsts).APR} ${unref(t)("demeterFarming.calculator")}`
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(_component_dialog_title, {
              "base-asset": unref(baseAsset),
              "pool-asset": unref(poolAsset),
              "is-farm": isFarm.value
            }, null, 8, ["base-asset", "pool-asset", "is-farm"]),
            createVNode(_component_s_form, {
              class: "el-form--actions",
              "show-message": false
            }, {
              default: withCtx(() => [
                isFarm.value && unref(baseAsset) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createVNode(_component_token_input, {
                    balance: baseAssetBalance.value.toCodecString(),
                    "is-max-available": isBaseAssetMaxButtonAvailable.value,
                    title: unref(t)("demeterFarming.amountAdd"),
                    token: unref(baseAsset),
                    "model-value": baseAssetValue.value,
                    "onUpdate:modelValue": handleBaseAssetValue,
                    onMax: handleBaseAssetMax
                  }, null, 8, ["balance", "is-max-available", "title", "token", "model-value"]),
                  unref(poolAsset) ? (openBlock(), createBlock(_component_s_icon, {
                    key: 0,
                    class: "icon-divider",
                    name: "plus-16"
                  })) : createCommentVNode("", true)
                ], 64)) : createCommentVNode("", true),
                unref(poolAsset) ? (openBlock(), createBlock(_component_token_input, {
                  key: 1,
                  balance: poolAssetBalance.value.toCodecString(),
                  "is-max-available": isPoolAssetMaxButtonAvailable.value,
                  title: unref(t)("demeterFarming.amountAdd"),
                  token: unref(poolAsset),
                  "model-value": poolAssetValue.value,
                  "onUpdate:modelValue": handlePoolAssetValue,
                  onMax: handlePoolAssetMax
                }, null, 8, ["balance", "is-max-available", "title", "token", "model-value"])) : createCommentVNode("", true)
              ]),
              _: 1
            }),
            createBaseVNode("div", _hoisted_2, [
              createVNode(_component_info_line, {
                label: "Duration",
                class: "duration-title"
              }),
              createVNode(_component_s_tabs, {
                type: "rounded",
                value: selectedPeriod.value,
                onInput: selectPeriod,
                class: "duration-tabs"
              }, {
                default: withCtx(() => [
                  (openBlock(), createElementBlock(Fragment, null, renderList(intervals, (period) => {
                    return createVNode(_component_s_tab, {
                      key: period,
                      name: String(period),
                      label: `${period}D`
                    }, null, 8, ["name", "label"]);
                  }), 64))
                ]),
                _: 1
              }, 8, ["value"])
            ]),
            createBaseVNode("div", _hoisted_3, [
              createBaseVNode("div", _hoisted_4, toDisplayString(unref(TranslationConsts).APR) + " " + toDisplayString(unref(t)("demeterFarming.results")), 1),
              createVNode(_component_info_line, {
                label: unref(TranslationConsts).ROI,
                "label-tooltip": unref(t)("tooltips.roi"),
                value: calculatedRoiPercentFormatted.value
              }, null, 8, ["label", "label-tooltip", "value"]),
              createVNode(_component_info_line, {
                label: rewardsText.value,
                value: calculatedRewardsFormatted.value,
                "fiat-value": calculatedRewardsFiat.value
              }, null, 8, ["label", "value", "fiat-value"])
            ]),
            createBaseVNode("a", {
              href: unref(link),
              target: "_blank",
              rel: "nofollow noopener",
              class: "demeter-copyright"
            }, toDisplayString(unref(t)("demeterFarming.poweredBy")), 9, _hoisted_5)
          ])
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const CalculatorDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-0716ccd1"]]);
export {
  CalculatorDialog as default
};
