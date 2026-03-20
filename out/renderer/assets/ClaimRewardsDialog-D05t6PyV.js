import { z as defineComponent, bt as mergeModels, bu as useModel, u as useTranslation, c2 as useTransaction, aZ as components, aA as watch, a9 as ref, a_ as resolveComponent, bz as resolveDirective, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aM as createCommentVNode, bA as withDirectives, A as createElementBlock, aj as unref, bQ as Fragment, aN as toDisplayString, h as computed, aO as createTextVNode } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useSoraStaking } from "./useSoraStaking-B7oKU4Xa.js";
const _hoisted_1 = { class: "claim-rewards-dialog" };
const _hoisted_2 = { class: "reward" };
const _hoisted_3 = { class: "reward-symbol" };
const _hoisted_4 = { class: "info" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ClaimRewardsDialog",
  props: /* @__PURE__ */ mergeModels({
    parentLoading: { type: Boolean }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["close", "show-rewards"], ["update:visible"]),
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const isVisible = useModel(__props, "visible");
    const { t } = useTranslation();
    const { getFiatAmountByCodecString } = useFormattedAmount();
    const {
      payee,
      controller,
      stash,
      pendingRewards,
      rewardedFunds,
      rewardedFundsFiat,
      rewardedFundsFormatted,
      rewardAsset,
      xor,
      isInsufficientXorForFee,
      payout,
      getPayoutNetworkFee,
      getPendingRewards
    } = useSoraStaking();
    const { loading, withNotifications } = useTransaction({ parentLoading: () => Boolean(props.parentLoading) });
    const DialogBase = components.DialogBase;
    const InfoLine = components.InfoLine;
    const TokenLogo = components.TokenLogo;
    const FormattedAmountWithFiatValue = components.FormattedAmountWithFiatValue;
    const rewardsDestination = ref("");
    const payoutNetworkFee = ref(null);
    const closeDialog = () => {
      emit("close");
      isVisible.value = false;
    };
    const payeeAddress = computed(() => {
      switch (payee.value) {
        case "Stash":
          return stash.value ?? "";
        case "Controller":
          return controller.value ?? "";
        default:
          return payee.value ?? "";
      }
    });
    const title = computed(() => t("soraStaking.claimRewardsDialog.title"));
    const payouts = computed(
      () => (pendingRewards.value ?? []).map((reward) => ({
        era: reward.era,
        validators: reward.validators.map((validator) => validator.address)
      }))
    );
    const payeeOverride = computed(
      () => rewardsDestination.value && rewardsDestination.value !== payeeAddress.value ? rewardsDestination.value : void 0
    );
    const networkFee = computed(() => payoutNetworkFee.value ?? "0");
    const networkFeeFormatted = computed(() => networkFee.value);
    const networkFeeFiat = computed(
      () => xor.value ? getFiatAmountByCodecString(networkFee.value, xor.value) : null
    );
    const valueFundsEmpty = computed(() => rewardedFunds.value.isZero());
    const isInsufficientBalance = computed(() => false);
    const confirmDisabled = computed(
      () => isInsufficientXorForFee.value || valueFundsEmpty.value || isInsufficientBalance.value
    );
    const buttonLoading = computed(() => Boolean(props.parentLoading) || loading.value);
    const syncRewardsDestination = () => {
      if (isVisible.value) {
        rewardsDestination.value = payeeAddress.value;
      }
    };
    watch([isVisible, payeeAddress], syncRewardsDestination, { immediate: true });
    let feeRequestId = 0;
    const updatePayoutFee = async () => {
      if (!isVisible.value) return;
      if (!payouts.value.length) {
        payoutNetworkFee.value = "0";
        return;
      }
      const currentId = ++feeRequestId;
      try {
        const fee = await getPayoutNetworkFee({
          payouts: payouts.value,
          payee: payeeOverride.value
        });
        if (currentId === feeRequestId) {
          payoutNetworkFee.value = fee;
        }
      } catch (error) {
        console.error("Failed to fetch payout fee", error);
        if (currentId === feeRequestId) {
          payoutNetworkFee.value = null;
        }
      }
    };
    watch([payouts, payeeOverride, isVisible], updatePayoutFee, { immediate: true });
    const handleConfirm = async () => {
      if (confirmDisabled.value) return;
      await withNotifications(async () => {
        await payout({
          payouts: payouts.value,
          payee: payeeOverride.value
        });
        await getPendingRewards();
        closeDialog();
      });
    };
    const checkPendingRewards = () => emit("show-rewards");
    __expose({
      rewardsDestination,
      payoutNetworkFee,
      handleConfirm,
      checkPendingRewards
    });
    return (_ctx, _cache) => {
      const _component_s_input = resolveComponent("s-input");
      const _component_s_button = resolveComponent("s-button");
      const _directive_button = resolveDirective("button");
      return openBlock(), createBlock(unref(DialogBase), {
        visible: isVisible.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => isVisible.value = $event),
        title: title.value
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", _hoisted_2, [
              createVNode(unref(FormattedAmountWithFiatValue), {
                class: "reward-amount",
                "symbol-as-decimal": "",
                "value-can-be-hidden": "",
                value: unref(rewardedFundsFormatted),
                "fiat-value": unref(rewardedFundsFiat)
              }, null, 8, ["value", "fiat-value"]),
              unref(rewardAsset) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                createVNode(unref(TokenLogo), {
                  class: "reward-logo",
                  "token-symbol": unref(rewardAsset).symbol
                }, null, 8, ["token-symbol"]),
                createBaseVNode("span", _hoisted_3, toDisplayString(unref(rewardAsset).symbol), 1)
              ], 64)) : createCommentVNode("", true)
            ]),
            createVNode(_component_s_input, {
              modelValue: rewardsDestination.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => rewardsDestination.value = $event),
              placeholder: unref(t)("soraStaking.claimRewardsDialog.rewardsDestination"),
              suffix: "s-icon-basic-user-24",
              disabled: true
            }, null, 8, ["modelValue", "placeholder"]),
            createBaseVNode("div", _hoisted_4, [
              createVNode(unref(InfoLine), {
                label: unref(t)("networkFeeText"),
                "label-tooltip": unref(t)("networkFeeTooltipText"),
                value: networkFeeFormatted.value,
                "asset-symbol": unref(xor)?.symbol,
                "fiat-value": networkFeeFiat.value,
                "is-formatted": ""
              }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])
            ]),
            unref(xor) && unref(rewardAsset) ? (openBlock(), createBlock(_component_s_button, {
              key: 0,
              type: "primary",
              class: "s-typography-button--large action-button",
              loading: buttonLoading.value,
              disabled: confirmDisabled.value,
              onClick: handleConfirm
            }, {
              default: withCtx(() => [
                isInsufficientBalance.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(rewardAsset).symbol })), 1)
                ], 64)) : unref(isInsufficientXorForFee) ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(xor).symbol })), 1)
                ], 64)) : valueFundsEmpty.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(unref(t)("buttons.enterAmount")), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 3 }, [
                  createTextVNode(toDisplayString(unref(t)("confirmText")), 1)
                ], 64))
              ]),
              _: 1
            }, 8, ["loading", "disabled"])) : createCommentVNode("", true),
            unref(pendingRewards) ? withDirectives((openBlock(), createElementBlock("div", {
              key: 1,
              class: "check-pending-rewards",
              onClick: checkPendingRewards
            }, [
              createTextVNode(toDisplayString(unref(t)("soraStaking.claimRewardsDialog.checkRewards")) + " (" + toDisplayString(unref(pendingRewards)?.length ?? 0) + ") ", 1)
            ])), [
              [_directive_button]
            ]) : createCommentVNode("", true)
          ])
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
export {
  _sfc_main as default
};
