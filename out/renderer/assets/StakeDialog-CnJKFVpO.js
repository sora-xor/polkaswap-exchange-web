import { z as defineComponent, bt as mergeModels, bu as useModel, u as useTranslation, c2 as useTransaction, e as useSettingsStore, ak as lazyComponent, al as Components, aZ as components, aA as watch, a4 as onMounted, b5 as nextTick, a9 as ref, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aM as createCommentVNode, aj as unref, h as computed, d1 as StakeDialogMode, aN as toDisplayString, A as createElementBlock, bQ as Fragment, aO as createTextVNode, aS as hasInsufficientXorForFee, F as FPNumber, s as store, O as Operation, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useSoraStaking } from "./useSoraStaking-B7oKU4Xa.js";
const _hoisted_1 = { class: "info" };
const _hoisted_2 = { class: "information-content" };
const _hoisted_3 = { class: "information-text" };
const _hoisted_4 = { class: "information-icon" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "StakeDialog",
  props: /* @__PURE__ */ mergeModels({
    mode: {},
    parentLoading: { type: Boolean }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["close", "confirm"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const isVisible = useModel(__props, "visible");
    const { t } = useTranslation();
    const { getFiatAmountByCodecString } = useFormattedAmount();
    const {
      stakingAsset,
      rewardAsset,
      xor,
      validators,
      selectedValidators,
      unbondPeriodFormatted,
      lockedFunds,
      availableFunds,
      stakeAmount,
      formatCodecNumber,
      bondAndNominate,
      bondExtra,
      unbond,
      getBondAndNominateNetworkFee
    } = useSoraStaking();
    const { loading, withNotifications, withApi } = useTransaction({
      parentLoading: () => Boolean(props.parentLoading)
    });
    const settingsStore = useSettingsStore();
    const TokenInput = lazyComponent(Components.TokenInput);
    const DialogBase = components.DialogBase;
    const InfoLine = components.InfoLine;
    const value = ref("");
    const bondAndNominateNetworkFee = ref(null);
    const feeRequestId = ref(0);
    const dialogRoot = ref(null);
    const networkFees = computed(() => settingsStore.networkFees);
    const shouldBalanceBeHidden = computed(() => Boolean(store.state.wallet.settings.shouldBalanceBeHidden));
    const networkFee = computed(() => {
      switch (props.mode) {
        case StakeDialogMode.NEW:
          return bondAndNominateNetworkFee.value ?? "0";
        case StakeDialogMode.ADD:
          return networkFees.value?.[Operation.StakingBondExtra] ?? "0";
        default:
          return networkFees.value?.[Operation.StakingUnbond] ?? "0";
      }
    });
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const networkFeeFiat = computed(() => xor.value ? getFiatAmountByCodecString(networkFee.value, xor.value) : null);
    const insufficientXorForFee = computed(
      () => xor.value ? hasInsufficientXorForFee(xor.value, networkFee.value) : false
    );
    const stakingBalance = computed(
      () => props.mode !== StakeDialogMode.REMOVE ? availableFunds.value : lockedFunds.value
    );
    const stakingBalanceCodec = computed(() => stakingBalance.value.toCodecString());
    const valueFunds = computed(() => value.value ? new FPNumber(value.value) : FPNumber.ZERO);
    const valueFundsEmpty = computed(() => valueFunds.value.isZero());
    const maxStake = computed(() => {
      if (!stakingAsset.value) return FPNumber.ZERO;
      const fee = FPNumber.fromCodecValue(networkFee.value);
      return props.mode !== StakeDialogMode.REMOVE ? stakingBalance.value.sub(fee) : stakingBalance.value;
    });
    const isMaxButtonAvailable = computed(() => {
      if (shouldBalanceBeHidden.value) return false;
      return !FPNumber.eq(valueFunds.value, maxStake.value) && !FPNumber.lte(maxStake.value, FPNumber.ZERO);
    });
    const insufficientBalance = computed(() => {
      const availableBalance = new FPNumber(maxStake.value, stakingAsset.value?.decimals);
      return FPNumber.lt(availableBalance, valueFunds.value);
    });
    const selectedValidatorsFormatted = computed(
      () => t("soraStaking.selectedValidators", {
        count: selectedValidators.value.length,
        max: validators.value.length
      })
    );
    const title = computed(() => {
      switch (props.mode) {
        case StakeDialogMode.NEW:
          return t("soraStaking.actions.confirm");
        case StakeDialogMode.ADD:
          return lockedFunds.value.isZero() ? t("soraStaking.newStake.title") : t("soraStaking.actions.more");
        default:
          return t("soraStaking.actions.remove");
      }
    });
    const inputTitle = computed(
      () => props.mode !== StakeDialogMode.REMOVE ? t("soraStaking.stakeDialog.toStake") : t("soraStaking.stakeDialog.toRemove")
    );
    const confirmDisabled = computed(
      () => insufficientXorForFee.value || valueFundsEmpty.value || insufficientBalance.value
    );
    const buttonLoading = computed(() => Boolean(props.parentLoading) || loading.value);
    const updateBondNetworkFee = async () => {
      const currentId = ++feeRequestId.value;
      if (props.mode !== StakeDialogMode.NEW) {
        bondAndNominateNetworkFee.value = null;
        return;
      }
      try {
        await withApi(async () => {
          const fee = await getBondAndNominateNetworkFee();
          if (currentId === feeRequestId.value) {
            bondAndNominateNetworkFee.value = fee;
          }
        });
      } catch (error) {
        console.error("Failed to fetch bond and nominate fee", error);
        if (currentId === feeRequestId.value) {
          bondAndNominateNetworkFee.value = null;
        }
      }
    };
    watch([selectedValidators, () => props.mode], updateBondNetworkFee, { immediate: true });
    watch(isVisible, (visible) => {
      if (visible) {
        value.value = props.mode === StakeDialogMode.NEW ? stakeAmount.value : "";
      }
    });
    const handleValue = (nextValue) => {
      value.value = String(nextValue ?? "");
    };
    const handleMaxValue = () => {
      handleValue(maxStake.value.toString());
    };
    const handleConfirm = async () => {
      if (!stakingAsset.value || confirmDisabled.value) return;
      stakeAmount.value = value.value;
      let extrinsic = unbond;
      if (props.mode === StakeDialogMode.NEW) {
        extrinsic = bondAndNominate;
      } else if (props.mode === StakeDialogMode.ADD) {
        extrinsic = bondExtra;
      }
      await withNotifications(async () => {
        await extrinsic();
      });
      emit("confirm");
    };
    onMounted(async () => {
      await nextTick();
      const input = dialogRoot.value?.querySelector(".s-input .el-input__inner");
      input?.focus();
    });
    return (_ctx, _cache) => {
      const _component_s_form = resolveComponent("s-form");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_card = resolveComponent("s-card");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(unref(DialogBase), {
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event),
        title: title.value
      }, {
        default: withCtx(() => [
          createBaseVNode("div", {
            class: "stake-dialog",
            ref_key: "dialogRoot",
            ref: dialogRoot
          }, [
            createVNode(_component_s_form, {
              class: "el-form--actions",
              "show-message": false
            }, {
              default: withCtx(() => [
                createVNode(unref(TokenInput), {
                  key: "stake-input",
                  balance: stakingBalanceCodec.value,
                  "is-max-available": isMaxButtonAvailable.value,
                  title: inputTitle.value,
                  token: unref(stakingAsset),
                  "model-value": value.value,
                  "onUpdate:modelValue": handleValue,
                  onMax: handleMaxValue
                }, null, 8, ["balance", "is-max-available", "title", "token", "model-value"])
              ]),
              _: 1
            }),
            createBaseVNode("div", _hoisted_1, [
              __props.mode === unref(StakeDialogMode).NEW ? (openBlock(), createBlock(unref(InfoLine), {
                key: 0,
                label: unref(t)("soraStaking.info.selectedValidators"),
                value: selectedValidatorsFormatted.value
              }, null, 8, ["label", "value"])) : createCommentVNode("", true),
              __props.mode === unref(StakeDialogMode).NEW ? (openBlock(), createBlock(unref(InfoLine), {
                key: 1,
                label: unref(t)("soraStaking.info.rewardToken"),
                value: unref(rewardAsset)?.symbol
              }, null, 8, ["label", "value"])) : createCommentVNode("", true),
              __props.mode === unref(StakeDialogMode).REMOVE ? (openBlock(), createBlock(unref(InfoLine), {
                key: 2,
                label: unref(t)("soraStaking.info.unstakingPeriod"),
                value: unref(unbondPeriodFormatted)
              }, null, 8, ["label", "value"])) : createCommentVNode("", true),
              createVNode(unref(InfoLine), {
                label: unref(t)("networkFeeText"),
                "label-tooltip": unref(t)("networkFeeTooltipText"),
                value: networkFeeFormatted.value,
                "asset-symbol": unref(xor)?.symbol,
                "fiat-value": networkFeeFiat.value,
                "is-formatted": ""
              }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])
            ]),
            __props.mode === unref(StakeDialogMode).REMOVE ? (openBlock(), createBlock(_component_s_card, {
              key: 0,
              class: "information",
              shadow: "always",
              primary: ""
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_2, [
                  createBaseVNode("div", _hoisted_3, toDisplayString(unref(t)("soraStaking.allWithdrawsDialog.information")), 1),
                  createBaseVNode("div", _hoisted_4, [
                    createVNode(_component_s_icon, {
                      name: "notifications-alert-triangle-24",
                      size: "20px"
                    })
                  ])
                ])
              ]),
              _: 1
            })) : createCommentVNode("", true),
            unref(stakingAsset) ? (openBlock(), createBlock(_component_s_button, {
              key: 1,
              type: "primary",
              class: "s-typography-button--large action-button",
              loading: buttonLoading.value,
              disabled: confirmDisabled.value,
              onClick: handleConfirm
            }, {
              default: withCtx(() => [
                confirmDisabled.value && (insufficientBalance.value || insufficientXorForFee.value) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(stakingAsset).symbol })), 1)
                ], 64)) : valueFundsEmpty.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("buttons.enterAmount")), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(unref(t)("confirmText")), 1)
                ], 64))
              ]),
              _: 1
            }, 8, ["loading", "disabled"])) : createCommentVNode("", true)
          ], 512)
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const StakeDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-bdb1746a"]]);
export {
  StakeDialog as default
};
