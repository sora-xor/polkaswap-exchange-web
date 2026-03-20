import { z as defineComponent, bt as mergeModels, aZ as components, ak as lazyComponent, cG as demeterStakingLazyComponent, bu as useModel, bm as toRefs, e as useSettingsStore, H as useAssetsStore, u as useTranslation, aA as watch, X as XOR, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, A as createElementBlock, aM as createCommentVNode, h as computed, aj as unref, bQ as Fragment, a9 as ref, bb as normalizeClass, aN as toDisplayString, aq as withModifiers, aO as createTextVNode, Z as ZeroStringValue, al as Components, cH as DemeterStakingComponents, O as Operation, aS as hasInsufficientXorForFee, F as FPNumber, dr as isXorAccountAsset, M as getMaxValue, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useDemeterPoolCard } from "./useDemeterPoolCard-B9FeKKhi.js";
import { u as useDemeterPoolStatus } from "./useDemeterPoolStatus-2sPwJr2b.js";
import "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "stake-dialog" };
const _hoisted_2 = {
  key: 0,
  class: "stake-dialog-info"
};
const _hoisted_3 = {
  slot: "top",
  class: "input-title"
};
const _hoisted_4 = {
  slot: "right",
  class: "el-buttons el-buttons--between"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogTitle: demeterStakingLazyComponent(DemeterStakingComponents.DialogTitle),
      TokenInput: lazyComponent(Components.TokenInput),
      DialogBase: components.DialogBase,
      InfoLine: components.InfoLine
    }
  },
  __name: "StakeDialog",
  props: /* @__PURE__ */ mergeModels({
    parentLoading: { type: Boolean, default: false },
    isAdding: { type: Boolean, default: true },
    liquidity: { type: Object, default: null },
    baseAsset: { type: Object, default: null },
    pool: { type: Object, default: null },
    accountPool: { type: Object, default: null },
    poolAsset: { type: Object, default: null },
    rewardAsset: { type: Object, default: null },
    apr: { type: String, default: ZeroStringValue },
    tvl: { type: String, default: ZeroStringValue }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["close", "add", "remove"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const isVisible = useModel(__props, "visible");
    const { liquidity, pool, accountPool, poolAsset, rewardAsset, baseAsset, apr, tvl } = toRefs(props);
    const settingsStore = useSettingsStore();
    const assetsStore = useAssetsStore();
    const networkFees = computed(() => settingsStore.networkFees);
    const shouldBalanceBeHidden = computed(() => settingsStore.shouldBalanceBeHidden);
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
    const value = ref("");
    watch(
      isVisible,
      () => {
        value.value = "";
      }
    );
    const isAdding = computed(() => props.isAdding);
    const isFarm = computed(() => statusApi.isFarm.value);
    const pricesAvailable = computed(() => statusApi.pricesAvailable.value);
    const hasStake = computed(() => statusApi.hasStake.value);
    const networkFee = computed(() => {
      const operation = isAdding.value ? Operation.DemeterFarmingDepositLiquidity : Operation.DemeterFarmingWithdrawLiquidity;
      return networkFees.value?.[operation] ?? ZeroStringValue;
    });
    const networkFeeFormatted = computed(() => statusApi.formatCodecNumber(networkFee.value));
    const xorSymbol = XOR.symbol;
    const isInsufficientXorForFee = computed(() => hasInsufficientXorForFee(xorAsset.value, networkFee.value));
    const rewardAssetSymbol = computed(() => cardApi.rewardAssetSymbol.value);
    const poolAssetSymbol = computed(() => cardApi.poolAssetSymbol.value);
    const depositFee = computed(() => cardApi.depositFee.value);
    const depositFeeFormatted = computed(() => cardApi.depositFeeFormatted.value);
    const poolShareFormatted = computed(() => cardApi.poolShareFormatted.value);
    const poolShareFiat = computed(() => cardApi.poolShareFiat.value);
    const poolShareText = computed(
      () => isFarm.value ? t("demeterFarming.info.poolShare") : t("demeterFarming.info.stake", { symbol: poolAssetSymbol.value })
    );
    const part = computed(() => new FPNumber(value.value || "0").div(FPNumber.HUNDRED));
    const valueFunds = computed(() => {
      const asset = poolAsset.value;
      if (!asset) return FPNumber.ZERO;
      if (!isFarm.value) return new FPNumber(value.value || "0");
      if (isAdding.value) {
        const fee = FPNumber.fromCodecValue(networkFee.value);
        const amount = isXorAccountAsset(asset) ? statusApi.availableFunds.value.sub(fee) : statusApi.availableFunds.value;
        return amount.mul(part.value);
      }
      return statusApi.lockedFunds.value.mul(part.value);
    });
    const poolShareAfter = computed(() => {
      if (isAdding.value) {
        const fee = new FPNumber(depositFee.value);
        const feeFromValue = valueFunds.value.mul(fee);
        const fundsAfter2 = statusApi.lockedFunds.value.add(valueFunds.value.sub(feeFromValue));
        return isFarm.value ? fundsAfter2.div(statusApi.funds.value.sub(feeFromValue)).mul(FPNumber.HUNDRED) : fundsAfter2;
      }
      const funds = FPNumber.max(statusApi.lockedFunds.value, statusApi.funds.value);
      const fundsAfter = FPNumber.max(statusApi.lockedFunds.value.sub(valueFunds.value), FPNumber.ZERO);
      return isFarm.value ? fundsAfter.div(funds).mul(FPNumber.HUNDRED) : fundsAfter;
    });
    const poolShareAfterFiat = computed(() => {
      if (isFarm.value || !statusApi.poolAsset.value) return null;
      return statusApi.getFiatAmountByFPNumber(poolShareAfter.value, statusApi.poolAsset.value);
    });
    const poolShareAfterFormatted = computed(() => `${poolShareAfter.value.toLocaleString()}${isFarm.value ? "%" : ""}`);
    const poolShareAfterText = computed(
      () => isFarm.value ? t("demeterFarming.info.poolShareWillBe") : t("demeterFarming.info.stakeWillBe", { symbol: poolAssetSymbol.value })
    );
    const valueFundsEmpty = computed(() => valueFunds.value.isZero());
    const stakingBalance = computed(() => isAdding.value ? statusApi.availableFunds.value : statusApi.lockedFunds.value);
    const stakingBalanceCodec = computed(() => stakingBalance.value.toCodecString());
    const isMaxButtonAvailable = computed(() => {
      if (shouldBalanceBeHidden.value) return false;
      const asset = poolAsset.value;
      if (!asset) return false;
      const fee = FPNumber.fromCodecValue(networkFee.value);
      const amount = isAdding.value && isXorAccountAsset(asset) ? stakingBalance.value.sub(fee) : stakingBalance.value;
      return !FPNumber.eq(valueFunds.value, amount);
    });
    const maxStake = computed(() => {
      const asset = poolAsset.value;
      if (!asset) return ZeroStringValue;
      return isAdding.value ? getMaxValue(asset, networkFee.value) : statusApi.lockedFunds.value.toString();
    });
    const isInsufficientBalance = computed(() => {
      if (isFarm.value) return false;
      const asset = poolAsset.value;
      if (!asset) return false;
      const availableBalance = new FPNumber(maxStake.value, asset.decimals);
      return FPNumber.lt(availableBalance, valueFunds.value);
    });
    const valuePartCharClass = computed(() => {
      const charClassName = {
        3: "three",
        2: "two"
      }[value.value.length] ?? "one";
      return `${charClassName}-char`;
    });
    const title = computed(() => {
      const actionKey = isAdding.value ? hasStake.value ? "add" : "start" : "remove";
      return t(`demeterFarming.actions.${actionKey}`);
    });
    const inputTitle = computed(() => {
      const key = isAdding.value ? "amountAdd" : "amountRemove";
      return t(`demeterFarming.${key}`);
    });
    const getFiatAmountByCodecString = statusApi.getFiatAmountByCodecString;
    const handleValue = (val) => {
      value.value = String(val ?? "");
    };
    const handleMaxValue = () => {
      handleValue(maxStake.value);
    };
    const handleConfirm = () => {
      if (!statusApi.pool.value || !statusApi.accountPool.value) return;
      const params = {
        pool: statusApi.pool.value,
        accountPool: statusApi.accountPool.value,
        value: valueFunds.value
      };
      const event = isAdding.value ? "add" : "remove";
      emit(event, params);
    };
    const combinedLoading = computed(() => props.parentLoading);
    return (_ctx, _cache) => {
      const _component_dialog_title = resolveComponent("dialog-title");
      const _component_info_line = resolveComponent("info-line");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_slider = resolveComponent("s-slider");
      const _component_s_float_input = resolveComponent("s-float-input");
      const _component_token_input = resolveComponent("token-input");
      const _component_s_form = resolveComponent("s-form");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: isVisible.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => isVisible.value = $event),
        title: title.value
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(_component_dialog_title, {
              "base-asset": unref(baseAsset),
              "pool-asset": unref(poolAsset),
              "is-farm": isFarm.value
            }, null, 8, ["base-asset", "pool-asset", "is-farm"]),
            isAdding.value ? (openBlock(), createElementBlock("div", _hoisted_2, [
              pricesAvailable.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                createVNode(_component_info_line, {
                  label: unref(TranslationConsts).APR,
                  value: unref(apr)
                }, null, 8, ["label", "value"]),
                createVNode(_component_info_line, {
                  label: unref(t)("demeterFarming.info.totalLiquidityLocked"),
                  value: unref(tvl)
                }, null, 8, ["label", "value"])
              ], 64)) : createCommentVNode("", true),
              createVNode(_component_info_line, {
                label: unref(t)("demeterFarming.info.rewardToken"),
                value: rewardAssetSymbol.value
              }, null, 8, ["label", "value"])
            ])) : createCommentVNode("", true),
            createVNode(_component_s_form, {
              class: "el-form--actions",
              "show-message": false
            }, {
              default: withCtx(() => [
                isFarm.value ? (openBlock(), createBlock(_component_s_float_input, {
                  key: "farm-input",
                  size: "medium",
                  class: normalizeClass(["s-input--stake-part", valuePartCharClass.value]),
                  value: value.value,
                  decimals: 0,
                  max: 100,
                  onInput: handleValue
                }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_3, toDisplayString(inputTitle.value), 1),
                    createBaseVNode("div", _hoisted_4, [
                      _cache[2] || (_cache[2] = createBaseVNode("span", { class: "percent" }, "%", -1)),
                      isMaxButtonAvailable.value ? (openBlock(), createBlock(_component_s_button, {
                        key: 0,
                        class: "el-button--max s-typography-button--small",
                        type: "primary",
                        alternative: "",
                        size: "mini",
                        "border-radius": "mini",
                        onClick: _cache[0] || (_cache[0] = withModifiers(($event) => handleValue(100), ["stop"]))
                      }, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(unref(t)("buttons.max")), 1)
                        ]),
                        _: 1
                      })) : createCommentVNode("", true)
                    ]),
                    createVNode(_component_s_slider, {
                      slot: "bottom",
                      class: "slider-container",
                      value: Number(value.value),
                      "show-tooltip": false,
                      onInput: handleValue
                    }, null, 8, ["value"])
                  ]),
                  _: 1
                }, 8, ["class", "value"])) : (openBlock(), createBlock(_component_token_input, {
                  key: "stake-input",
                  balance: stakingBalanceCodec.value,
                  "is-max-available": isMaxButtonAvailable.value,
                  title: inputTitle.value,
                  token: unref(poolAsset),
                  "model-value": value.value,
                  "onUpdate:modelValue": handleValue,
                  onMax: handleMaxValue
                }, null, 8, ["balance", "is-max-available", "title", "token", "model-value"]))
              ]),
              _: 1
            }),
            hasStake.value ? (openBlock(), createBlock(_component_info_line, {
              key: 1,
              "value-can-be-hidden": "",
              label: poolShareText.value,
              value: poolShareFormatted.value,
              "fiat-value": poolShareFiat.value
            }, null, 8, ["label", "value", "fiat-value"])) : createCommentVNode("", true),
            createVNode(_component_info_line, {
              "value-can-be-hidden": "",
              label: poolShareAfterText.value,
              value: poolShareAfterFormatted.value,
              "fiat-value": poolShareAfterFiat.value
            }, null, 8, ["label", "value", "fiat-value"]),
            isAdding.value ? (openBlock(), createBlock(_component_info_line, {
              key: 2,
              label: unref(t)("demeterFarming.info.fee"),
              "label-tooltip": unref(t)("demeterFarming.info.feeTooltip"),
              value: depositFeeFormatted.value
            }, null, 8, ["label", "label-tooltip", "value"])) : createCommentVNode("", true),
            createVNode(_component_info_line, {
              label: unref(t)("networkFeeText"),
              "label-tooltip": unref(t)("networkFeeTooltipText"),
              value: networkFeeFormatted.value,
              "asset-symbol": unref(xorSymbol),
              "fiat-value": unref(getFiatAmountByCodecString)(networkFee.value),
              "is-formatted": ""
            }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"]),
            createVNode(_component_s_button, {
              type: "primary",
              class: "s-typography-button--large action-button",
              loading: combinedLoading.value,
              disabled: isInsufficientXorForFee.value || valueFundsEmpty.value || isInsufficientBalance.value,
              onClick: handleConfirm
            }, {
              default: withCtx(() => [
                isInsufficientXorForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(xorSymbol) })), 1)
                ], 64)) : isInsufficientBalance.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: poolAssetSymbol.value })), 1)
                ], 64)) : valueFundsEmpty.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(unref(t)("buttons.enterAmount")), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 3 }, [
                  createTextVNode(toDisplayString(unref(t)("confirmText")), 1)
                ], 64))
              ]),
              _: 1
            }, 8, ["loading", "disabled"])
          ])
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const StakeDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-1483a207"]]);
export {
  StakeDialog as default
};
