import { z as defineComponent, cY as HundredNumber, F as FPNumber, c4 as ObjectInit, aZ as components, ak as lazyComponent, al as Components, d3 as vaultLazyComponent, d4 as VaultComponents, u as useTranslation, c2 as useTransaction, c3 as useNotification, X as XOR, aA as watch, h as computed, a9 as ref, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aj as unref, aM as createCommentVNode, aO as createTextVNode, aN as toDisplayString, A as createElementBlock, bQ as Fragment, ay as api, Z as ZeroStringValue, O as Operation, g as getAssetBalance, d7 as LtvTranslations, b5 as nextTick, s as store, ad as asZeroValue, cv as hasInsufficientBalance, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { g as getLtvStatus } from "./util-BnzJdZIz.js";
const _hoisted_1 = { class: "repay-debt" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "RepayDebtDialog",
  props: {
    visible: { type: Boolean, default: false },
    vault: { default: ObjectInit },
    debtAsset: { default: ObjectInit },
    prevLtv: { default: () => FPNumber.ZERO },
    maxSafeDebt: { default: () => FPNumber.ZERO },
    maxLtv: { default: HundredNumber }
  },
  emits: ["update:visible", "confirm"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const DialogBase = components.DialogBase;
    const InfoLine = components.InfoLine;
    const TokenInput = lazyComponent(Components.TokenInput);
    const ValueStatus = lazyComponent(Components.ValueStatusWrapper);
    const PrevNextInfoLine = vaultLazyComponent(VaultComponents.PrevNextInfoLine);
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const { withNotifications, loading } = useTransaction();
    const { showAppAlert } = useNotification();
    const { Zero, Hundred, getFPNumber, getFPNumberFromCodec, formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();
    const xorSymbol = XOR.symbol;
    const debtInput = ref(null);
    const repayDebtValue = ref("");
    const isVisible = computed({
      get: () => props.visible,
      set: (value) => emit("update:visible", value)
    });
    const networkFees = computed(() => store.state.wallet.settings.networkFees);
    const accountXor = computed(() => store.getters.assets.xor);
    const shouldBalanceBeHidden = computed(() => store.state.wallet.settings.shouldBalanceBeHidden ?? false);
    const vault = computed(() => props.vault);
    const debtAsset = computed(() => props.debtAsset);
    const prevLtv = computed(() => props.prevLtv);
    const maxSafeDebt = computed(() => props.maxSafeDebt ?? Zero);
    const maxLtv = computed(() => props.maxLtv ?? HundredNumber);
    const networkFee = computed(() => networkFees.value?.[Operation.CreateVault] ?? ZeroStringValue);
    const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
    const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());
    const title = computed(() => t("kensetsu.repayDebt"));
    const isRepayDebtZero = computed(() => asZeroValue(repayDebtValue.value));
    const repayDebtFp = computed(() => {
      if (isRepayDebtZero.value) return Zero;
      return getFPNumber(repayDebtValue.value, debtAsset.value?.decimals);
    });
    const debt = computed(() => vault.value?.debt ?? Zero);
    const debtAssetBalance = computed(() => getAssetBalance(debtAsset.value));
    const debtAssetBalanceFp = computed(() => getFPNumberFromCodec(debtAssetBalance.value, debtAsset.value?.decimals));
    const isRepayMoreThanDebt = computed(() => debt.value.lt(repayDebtFp.value));
    const isInsufficientBalance = computed(() => {
      if (!debtAsset.value) return true;
      return hasInsufficientBalance(debtAsset.value, repayDebtValue.value, networkFee.value);
    });
    const disabled = computed(
      () => loading.value || isInsufficientXorForFee.value || isRepayDebtZero.value || isRepayMoreThanDebt.value || isInsufficientBalance.value
    );
    const isMaxRepayAvailable = computed(() => {
      if (shouldBalanceBeHidden.value || isRepayDebtZero.value) return true;
      if (!debt.value.isFinity() || debt.value.isLteZero()) return false;
      return !repayDebtFp.value.isEqualTo(debt.value);
    });
    const debtSymbol = computed(() => debtAsset.value?.symbol ?? "");
    const formattedPrevBorrow = computed(() => vault.value?.debt.toLocaleString() ?? ZeroStringValue);
    const nextBorrow = computed(() => {
      const debtValue = vault.value?.debt;
      if (!debtValue) return null;
      if (isRepayDebtZero.value) return debtValue;
      const diff = debtValue.sub(repayDebtFp.value);
      return diff.isGteZero() ? diff : Zero;
    });
    const formattedNextBorrow = computed(() => nextBorrow.value?.toLocaleString() ?? ZeroStringValue);
    const formattedPrevLtv = computed(() => prevLtv.value?.toLocaleString(2) ?? ZeroStringValue);
    const ltvCoeff = computed(() => {
      if (!nextBorrow.value || maxSafeDebt.value.isZero()) return null;
      return nextBorrow.value.div(maxSafeDebt.value);
    });
    const ltv = computed(() => ltvCoeff.value?.isFinity() ? ltvCoeff.value.mul(HundredNumber) : null);
    const ltvNumber = computed(() => ltv.value?.toNumber() ?? 0);
    const formattedLtv = computed(
      () => ltvCoeff.value ? ltvCoeff.value.mul(maxLtv.value).toLocaleString(2) : ZeroStringValue
    );
    const ltvText = computed(() => LtvTranslations[getLtvStatus(ltvNumber.value)]);
    const maxInputRepay = computed(() => debt.value.gt(debtAssetBalanceFp.value) ? debtAssetBalanceFp.value : debt.value);
    const repayDebtValuePercent = computed(() => {
      if (!repayDebtValue.value) return 0;
      const percent = repayDebtFp.value.div(maxInputRepay.value).mul(HundredNumber).toNumber(0);
      return percent > HundredNumber ? HundredNumber : percent;
    });
    const errorMessage = computed(() => {
      if (isInsufficientXorForFee.value) {
        return t("insufficientBalanceText", { tokenSymbol: xorSymbol });
      }
      if (isRepayDebtZero.value) {
        return t("kensetsu.error.enterRepayDebt");
      }
      if (isRepayMoreThanDebt.value) {
        return t("kensetsu.error.repayMoreThanDebt");
      }
      if (isInsufficientBalance.value) {
        return t("insufficientBalanceText", { tokenSymbol: debtSymbol.value });
      }
      return "";
    });
    const handleMaxRepayDebtValue = () => {
      repayDebtValue.value = maxInputRepay.value.toString();
    };
    const handleRepayPercentChange = (percent) => {
      repayDebtValue.value = maxInputRepay.value.mul(percent / HundredNumber).toString();
    };
    const handleRepayDebt = async () => {
      if (disabled.value) {
        if (errorMessage.value) {
          showAppAlert(errorMessage.value, t("errorText"));
        }
      } else {
        try {
          await withNotifications(async () => {
            if (!(vault.value && debtAsset.value)) {
              throw new Error("[api.kensetsu.repayVaultDebt]: vault or asset is null");
            }
            await api.kensetsu.repayVaultDebt(vault.value, repayDebtValue.value, debtAsset.value);
          });
          emit("confirm");
        } catch (error) {
          console.error(error);
        }
      }
      isVisible.value = false;
    };
    watch(
      () => props.visible,
      async (value) => {
        await nextTick();
        repayDebtValue.value = "";
        if (value) {
          const focus = debtInput.value && typeof debtInput.value.focus === "function" ? debtInput.value.focus : void 0;
          focus?.();
        }
      },
      { immediate: true }
    );
    __expose({
      handleRepayDebt,
      handleMaxRepayDebtValue,
      handleRepayPercentChange,
      repayDebtValue,
      disabled,
      errorMessage,
      isInsufficientXorForFee,
      isVisible
    });
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(unref(DialogBase), {
        title: title.value,
        visible: isVisible.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => isVisible.value = $event),
        tooltip: unref(t)("kensetsu.repayDebtDescription")
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(unref(TokenInput), {
              ref_key: "debtInput",
              ref: debtInput,
              class: "repay-debt__debt-input repay-debt__token-input",
              "with-slider": "",
              title: title.value,
              modelValue: repayDebtValue.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => repayDebtValue.value = $event),
              "is-fiat-editable": "",
              "is-max-available": isMaxRepayAvailable.value,
              token: debtAsset.value,
              balance: debtAssetBalance.value,
              "slider-value": repayDebtValuePercent.value,
              disabled: unref(loading),
              onMax: handleMaxRepayDebtValue,
              onSlide: handleRepayPercentChange
            }, null, 8, ["title", "modelValue", "is-max-available", "token", "balance", "slider-value", "disabled"]),
            createVNode(unref(PrevNextInfoLine), {
              label: unref(t)("kensetsu.outstandingDebt"),
              tooltip: unref(t)("kensetsu.outstandingDebtDescription"),
              symbol: debtSymbol.value,
              prev: formattedPrevBorrow.value,
              next: formattedNextBorrow.value
            }, null, 8, ["label", "tooltip", "symbol", "prev", "next"]),
            createVNode(unref(PrevNextInfoLine), {
              label: unref(t)("kensetsu.ltv"),
              tooltip: unref(t)("kensetsu.ltvDescription"),
              symbol: "%",
              prev: formattedPrevLtv.value,
              next: formattedLtv.value
            }, {
              default: withCtx(() => [
                ltv.value ? (openBlock(), createBlock(unref(ValueStatus), {
                  key: 0,
                  class: "ltv-badge-status",
                  badge: "",
                  value: ltvNumber.value,
                  "get-status": unref(getLtvStatus)
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(ltvText.value), 1)
                  ]),
                  _: 1
                }, 8, ["value", "get-status"])) : createCommentVNode("", true)
              ]),
              _: 1
            }, 8, ["label", "tooltip", "prev", "next"]),
            createVNode(_component_s_button, {
              type: "primary",
              class: "s-typography-button--large action-button repay-debt__button",
              disabled: disabled.value,
              onClick: handleRepayDebt
            }, {
              default: withCtx(() => [
                disabled.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(errorMessage.value), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(title.value), 1)
                ], 64))
              ]),
              _: 1
            }, 8, ["disabled"]),
            createVNode(unref(InfoLine), {
              label: unref(t)("networkFeeText"),
              "label-tooltip": unref(t)("networkFeeTooltipText"),
              value: networkFeeFormatted.value,
              "asset-symbol": unref(xorSymbol),
              "fiat-value": unref(getFiatAmountByCodecString)(networkFee.value),
              "is-formatted": ""
            }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])
          ])
        ]),
        _: 1
      }, 8, ["title", "visible", "tooltip"]);
    };
  }
});
const RepayDebtDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7d24c683"]]);
export {
  RepayDebtDialog as default
};
