import { z as defineComponent, bt as mergeModels, bu as useModel, u as useTranslation, c2 as useTransaction, aZ as components, c_ as soraStakingLazyComponent, c$ as SoraStakingComponents, aA as watch, a9 as ref, h as computed, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, A as createElementBlock, aN as toDisplayString, aj as unref, bQ as Fragment, bP as renderList, aM as createCommentVNode, bb as normalizeClass, aO as createTextVNode, dI as ERA_HOURS, F as FPNumber, aU as formatDecimalPlaces, aS as hasInsufficientXorForFee, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useSoraStaking } from "./useSoraStaking-B7oKU4Xa.js";
import { u as useValidatorsFormatting } from "./useValidatorsFormatting-Ay5wVxnl.js";
const _hoisted_1 = { class: "pending-rewards-dialog" };
const _hoisted_2 = { class: "information-content" };
const _hoisted_3 = { class: "information-text" };
const _hoisted_4 = { class: "information-icon" };
const _hoisted_5 = { class: "reward-content" };
const _hoisted_6 = { class: "reward-lines" };
const _hoisted_7 = { class: "reward-line" };
const _hoisted_8 = { class: "name" };
const _hoisted_9 = { class: "value" };
const _hoisted_10 = { class: "reward-line" };
const _hoisted_11 = { class: "info" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "PendingRewardsDialog",
  props: /* @__PURE__ */ mergeModels({
    parentLoading: { type: Boolean }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["close"], ["update:visible"]),
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const isVisible = useModel(__props, "visible");
    const { t } = useTranslation();
    const { getFiatAmountByFPNumber, getFiatAmountByCodecString } = useFormattedAmount();
    const validatorsFormatting = useValidatorsFormatting();
    const {
      pendingRewards,
      rewardAsset,
      stakingAsset,
      validators,
      currentEra,
      formatCodecNumber,
      xor,
      getPayoutNetworkFee,
      getPendingRewards,
      payout
    } = useSoraStaking();
    const { loading, withNotifications, withApi } = useTransaction({
      parentLoading: () => Boolean(props.parentLoading)
    });
    const historyDepth = validatorsFormatting.historyDepth;
    const DialogBase = components.DialogBase;
    const InfoLine = components.InfoLine;
    const FormattedAmount = components.FormattedAmount;
    const ValidatorAvatar = soraStakingLazyComponent(SoraStakingComponents.ValidatorAvatar);
    const selectedRewards = ref([]);
    const payoutNetworkFee = ref(null);
    const feeRequestToken = ref(0);
    const closeDialog = () => {
      emit("close");
      isVisible.value = false;
    };
    const title = computed(() => t("soraStaking.pendingRewardsDialog.title"));
    const payouts = computed(
      () => selectedRewards.value.map((reward) => ({
        era: reward.era,
        validators: reward.validators.map((validator) => validator.address)
      }))
    );
    const rewards = computed(() => {
      if (!pendingRewards.value || !rewardAsset.value) return [];
      return pendingRewards.value.map(
        (element) => element.validators.map((validator) => {
          const validatorInfo = validators.value.find((item) => item.address === validator.address);
          if (!validatorInfo) {
            throw new Error(`There is no validator "${validator.address}" in the list`);
          }
          const name = validatorsFormatting.formatName(validatorInfo);
          const hoursLeft = ((historyDepth.value ?? 0) - ((currentEra.value ?? 0) - Number(element.era))) * ERA_HOURS;
          const daysLeft = Math.floor(hoursLeft / 24);
          const daysLeftFormatted = daysLeft < 1 ? "less then 1 day left" : `${daysLeft} days left`;
          const alert = daysLeft < 5;
          const value = validator.value;
          const rewardValue = new FPNumber(value, rewardAsset.value?.decimals);
          const valueFormatted = `${formatDecimalPlaces(rewardValue)} ${rewardAsset.value?.symbol ?? ""}`;
          const valueFiat = rewardAsset.value ? getFiatAmountByFPNumber(rewardValue, rewardAsset.value) : null;
          return {
            id: `${validator.address}-${element.era}`,
            era: element.era,
            validators: element.validators,
            name,
            daysLeft,
            daysLeftFormatted,
            alert,
            value,
            valueFormatted,
            valueFiat,
            validator: validatorInfo
          };
        })
      ).flat();
    });
    const noReward = computed(() => !rewards.value.length);
    const noSelectedRewards = computed(() => !selectedRewards.value.length);
    const networkFee = computed(() => payoutNetworkFee.value ?? "0");
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const networkFeeFiat = computed(() => xor.value ? getFiatAmountByCodecString(networkFee.value, xor.value) : null);
    const insufficientXorForFee = computed(
      () => xor.value ? hasInsufficientXorForFee(xor.value, networkFee.value) : false
    );
    const confirmDisabled = computed(() => insufficientXorForFee.value || noReward.value || noSelectedRewards.value);
    const buttonLoading = computed(() => Boolean(props.parentLoading) || loading.value);
    const isRewardSelected = (reward) => selectedRewards.value.some((item) => item.id === reward.id);
    const toggleRewardSelection = (reward) => {
      const index = selectedRewards.value.findIndex((item) => item.id === reward.id);
      if (index > -1) {
        const next = [...selectedRewards.value];
        next.splice(index, 1);
        selectedRewards.value = next;
      } else {
        selectedRewards.value = [...selectedRewards.value, reward];
      }
    };
    const computedClassDaysLeft = (alert) => {
      return ["days-left", alert ? "days-left--alert" : ""].filter(Boolean).join(" ");
    };
    const updatePayoutFee = async () => {
      const currentToken = feeRequestToken.value + 1;
      feeRequestToken.value = currentToken;
      if (!payouts.value.length) {
        payoutNetworkFee.value = "0";
        return;
      }
      try {
        await withApi(async () => {
          const fee = await getPayoutNetworkFee({
            payouts: payouts.value
          });
          if (currentToken === feeRequestToken.value) {
            payoutNetworkFee.value = fee;
          }
        });
      } catch (error) {
        console.error("Failed to fetch payout fee", error);
        if (currentToken === feeRequestToken.value) {
          payoutNetworkFee.value = null;
        }
      }
    };
    watch(
      isVisible,
      (visible) => {
        if (visible) {
          selectedRewards.value = [];
        }
      },
      { immediate: true }
    );
    watch(payouts, updatePayoutFee, { immediate: true });
    const handleConfirm = async () => {
      if (confirmDisabled.value) return;
      await withNotifications(async () => {
        await payout({
          payouts: payouts.value
        });
        await getPendingRewards();
        closeDialog();
      });
    };
    __expose({
      rewards,
      selectedRewards,
      payoutNetworkFee,
      handleConfirm
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_card = resolveComponent("s-card");
      const _component_s_scrollbar = resolveComponent("s-scrollbar");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(unref(DialogBase), {
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event),
        title: title.value
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(_component_s_scrollbar, { class: "pending-rewards-scrollbar" }, {
              default: withCtx(() => [
                createVNode(_component_s_card, {
                  class: "information",
                  shadow: "always",
                  primary: ""
                }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_2, [
                      createBaseVNode("div", _hoisted_3, toDisplayString(unref(t)("soraStaking.pendingRewardsDialog.information")), 1),
                      createBaseVNode("div", _hoisted_4, [
                        createVNode(_component_s_icon, {
                          name: "notifications-alert-triangle-24",
                          size: "20px"
                        })
                      ])
                    ])
                  ]),
                  _: 1
                }),
                (openBlock(true), createElementBlock(Fragment, null, renderList(rewards.value, (reward) => {
                  return openBlock(), createBlock(_component_s_card, {
                    key: reward.id,
                    class: "reward",
                    "border-radius": "medium",
                    shadow: "always",
                    size: "mini",
                    onClick: ($event) => toggleRewardSelection(reward)
                  }, {
                    default: withCtx(() => [
                      createBaseVNode("div", _hoisted_5, [
                        createVNode(unref(ValidatorAvatar), {
                          class: "avatar",
                          validator: reward.validator
                        }, {
                          icon: withCtx(() => [
                            reward.alert ? (openBlock(), createBlock(_component_s_icon, {
                              key: 0,
                              class: "alert-icon",
                              name: "notifications-alert-triangle-24",
                              size: "16px"
                            })) : createCommentVNode("", true)
                          ]),
                          _: 2
                        }, 1032, ["validator"]),
                        createBaseVNode("div", _hoisted_6, [
                          createBaseVNode("div", _hoisted_7, [
                            createBaseVNode("div", _hoisted_8, toDisplayString(reward.name), 1),
                            createBaseVNode("div", _hoisted_9, toDisplayString(reward.valueFormatted), 1)
                          ]),
                          createBaseVNode("div", _hoisted_10, [
                            createBaseVNode("div", {
                              class: normalizeClass(computedClassDaysLeft(reward.alert))
                            }, toDisplayString(reward.daysLeftFormatted), 3),
                            createVNode(unref(FormattedAmount), {
                              class: "value-fiat",
                              "is-fiat-value": "",
                              "with-left-shift": "",
                              value: reward.valueFiat
                            }, null, 8, ["value"])
                          ])
                        ]),
                        createBaseVNode("div", {
                          class: normalizeClass({ ["reward-check"]: true, ["reward-check--selected"]: isRewardSelected(reward) })
                        }, [
                          createVNode(_component_s_icon, {
                            name: "basic-check-mark-24",
                            size: "18px"
                          })
                        ], 2)
                      ])
                    ]),
                    _: 2
                  }, 1032, ["onClick"]);
                }), 128))
              ]),
              _: 1
            }),
            createBaseVNode("div", _hoisted_11, [
              createVNode(unref(InfoLine), {
                label: unref(t)("networkFeeText"),
                "label-tooltip": unref(t)("networkFeeTooltipText"),
                value: networkFeeFormatted.value,
                "asset-symbol": unref(xor)?.symbol,
                "fiat-value": networkFeeFiat.value,
                "is-formatted": ""
              }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])
            ]),
            createVNode(_component_s_button, {
              type: "primary",
              class: "s-typography-button--large action-button",
              loading: buttonLoading.value,
              disabled: confirmDisabled.value,
              onClick: handleConfirm
            }, {
              default: withCtx(() => [
                insufficientXorForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(stakingAsset)?.symbol ?? "" })), 1)
                ], 64)) : noReward.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("soraStaking.pendingRewardsDialog.noPendingRewards")), 1)
                ], 64)) : noSelectedRewards.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(unref(t)("soraStaking.pendingRewardsDialog.noSelectedRewards")), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 3 }, [
                  createTextVNode(toDisplayString(unref(t)("soraStaking.pendingRewardsDialog.payout")) + " (" + toDisplayString(selectedRewards.value.length) + ") ", 1)
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
const PendingRewardsDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-1f651f7e"]]);
export {
  PendingRewardsDialog as default
};
