import { z as defineComponent, bt as mergeModels, bu as useModel, u as useTranslation, e as useSettingsStore, c2 as useTransaction, aZ as components, a_ as resolveComponent, bz as resolveDirective, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, bA as withDirectives, A as createElementBlock, aM as createCommentVNode, aj as unref, bQ as Fragment, aN as toDisplayString, h as computed, aO as createTextVNode, aS as hasInsufficientXorForFee, O as Operation, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useSoraStaking } from "./useSoraStaking-B7oKU4Xa.js";
const _hoisted_1 = { class: "withdraw-dialog" };
const _hoisted_2 = { class: "reward" };
const _hoisted_3 = { class: "reward-symbol" };
const _hoisted_4 = { class: "info" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "WithdrawDialog",
  props: /* @__PURE__ */ mergeModels({
    parentLoading: { type: Boolean }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["close", "show-all-withdraws"], ["update:visible"]),
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const isVisible = useModel(__props, "visible");
    const { t } = useTranslation();
    const { getFiatAmountByCodecString } = useFormattedAmount();
    const settingsStore = useSettingsStore();
    const {
      stakingAsset,
      xor,
      withdrawableFunds,
      withdrawableFundsFiat,
      withdrawableFundsFormatted,
      formatCodecNumber,
      withdraw
    } = useSoraStaking();
    const { loading, withNotifications } = useTransaction({
      parentLoading: () => Boolean(props.parentLoading)
    });
    const DialogBase = components.DialogBase;
    const InfoLine = components.InfoLine;
    const TokenLogo = components.TokenLogo;
    const FormattedAmountWithFiatValue = components.FormattedAmountWithFiatValue;
    const networkFees = computed(() => settingsStore.networkFees);
    const networkFee = computed(
      () => networkFees.value?.[Operation.StakingWithdrawUnbonded] ?? "0"
    );
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const networkFeeFiat = computed(() => xor.value ? getFiatAmountByCodecString(networkFee.value, xor.value) : null);
    const insufficientXorForFee = computed(
      () => xor.value ? hasInsufficientXorForFee(xor.value, networkFee.value) : false
    );
    const insufficientBalance = computed(() => withdrawableFunds.value.isZero());
    const confirmDisabled = computed(() => insufficientXorForFee.value || insufficientBalance.value);
    const buttonLoading = computed(() => Boolean(props.parentLoading) || loading.value);
    const title = computed(() => t("soraStaking.withdrawDialog.title"));
    const closeDialog = () => {
      emit("close");
      isVisible.value = false;
    };
    const handleConfirm = async () => {
      if (confirmDisabled.value) return;
      await withNotifications(async () => {
        await withdraw(withdrawableFunds.value.toNumber());
      });
      closeDialog();
    };
    __expose({
      isVisible,
      handleConfirm
    });
    return (_ctx, _cache) => {
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
                value: unref(withdrawableFundsFormatted),
                "fiat-value": unref(withdrawableFundsFiat)
              }, null, 8, ["value", "fiat-value"]),
              unref(stakingAsset) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                createVNode(unref(TokenLogo), {
                  class: "reward-logo",
                  "token-symbol": unref(stakingAsset).symbol
                }, null, 8, ["token-symbol"]),
                createBaseVNode("span", _hoisted_3, toDisplayString(unref(stakingAsset).symbol), 1)
              ], 64)) : createCommentVNode("", true)
            ]),
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
            createVNode(_component_s_button, {
              type: "primary",
              class: "s-typography-button--large action-button",
              loading: buttonLoading.value,
              disabled: confirmDisabled.value,
              onClick: handleConfirm
            }, {
              default: withCtx(() => [
                insufficientXorForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(xor)?.symbol ?? "" })), 1)
                ], 64)) : insufficientBalance.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("buttons.enterAmount")), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(unref(t)("confirmText")), 1)
                ], 64))
              ]),
              _: 1
            }, 8, ["loading", "disabled"]),
            withDirectives((openBlock(), createElementBlock("div", {
              class: "check-all-withdraws",
              onClick: _cache[0] || (_cache[0] = ($event) => emit("show-all-withdraws"))
            }, [
              createTextVNode(toDisplayString(unref(t)("soraStaking.withdrawDialog.showAllWithdraws")), 1)
            ])), [
              [_directive_button]
            ])
          ])
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const WithdrawDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-ab36a3e0"]]);
export {
  WithdrawDialog as default
};
