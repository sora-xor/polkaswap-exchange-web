import { z as defineComponent, cY as HundredNumber, F as FPNumber, c4 as ObjectInit, aZ as components, ak as lazyComponent, al as Components, d3 as vaultLazyComponent, d4 as VaultComponents, u as useTranslation, c2 as useTransaction, a9 as ref, X as XOR, $ as getCurrentInstance, aA as watch, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aj as unref, h as computed, aM as createCommentVNode, aO as createTextVNode, aN as toDisplayString, A as createElementBlock, bQ as Fragment, ay as api, s as store, Z as ZeroStringValue, O as Operation, d7 as LtvTranslations, b5 as nextTick, ad as asZeroValue, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { g as getLtvStatus } from "./util-BnzJdZIz.js";
const _hoisted_1 = { class: "borrow-more" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "BorrowMoreDialog",
  props: {
    visible: { type: Boolean, default: false },
    vault: { default: ObjectInit },
    debtAsset: { default: ObjectInit },
    collateral: { default: ObjectInit },
    prevLtv: { default: () => FPNumber.ZERO },
    available: { default: () => FPNumber.ZERO },
    maxSafeDebt: { default: () => FPNumber.ZERO },
    maxLtv: { default: HundredNumber },
    borrowTax: { default: 0 }
  },
  emits: ["update:visible", "confirm"],
  setup(__props, { emit: __emit }) {
    const DialogBase = components.DialogBase;
    const InfoLine = components.InfoLine;
    const TokenInput = lazyComponent(Components.TokenInput);
    const ValueStatus = lazyComponent(Components.ValueStatusWrapper);
    const PrevNextInfoLine = vaultLazyComponent(VaultComponents.PrevNextInfoLine);
    const SlippageTolerance = lazyComponent(Components.SlippageTolerance);
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const { loading, withNotifications } = useTransaction();
    const { Zero, getFPNumber, getFPNumberFromCodec, formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();
    const isVisible = ref(props.visible);
    const borrowValue = ref("");
    const debtInput = ref(null);
    const xorSymbol = XOR.symbol;
    const percentFormat = computed(() => store.state.settings.percentFormat);
    const networkFees = computed(() => store.state.wallet.settings.networkFees);
    const slippageTolerance = computed(() => store.state.settings.slippageTolerance);
    const accountXor = computed(() => store.getters.assets.xor);
    const shouldBalanceBeHidden = computed(() => store.state.wallet.settings.shouldBalanceBeHidden ?? false);
    const networkFee = computed(() => networkFees.value?.[Operation.CreateVault] ?? ZeroStringValue);
    const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
    const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));
    const isBorrowZero = computed(() => asZeroValue(borrowValue.value));
    const borrowFp = computed(
      () => isBorrowZero.value ? Zero : getFPNumber(borrowValue.value, props.debtAsset?.decimals)
    );
    const debtAvailable = computed(() => props.collateral?.riskParams.hardCap.sub(props.collateral.debtSupply) ?? Zero);
    const availableOrTotal = computed(
      () => props.available.gt(debtAvailable.value) ? debtAvailable.value : props.available
    );
    const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());
    const isBorrowMoreThanAvailable = computed(() => borrowFp.value.gt(availableOrTotal.value));
    const disabled = computed(
      () => loading.value || isInsufficientXorForFee.value || isBorrowZero.value || isBorrowMoreThanAvailable.value
    );
    const availableCodec = computed(() => availableOrTotal.value.dp(FPNumber.DEFAULT_PRECISION).codec);
    const isMaxBorrowAvailable = computed(() => {
      if (shouldBalanceBeHidden.value || isBorrowZero.value) return true;
      if (!availableOrTotal.value.isFinity() || availableOrTotal.value.isLteZero()) return false;
      return !borrowFp.value.isEqualTo(availableOrTotal.value);
    });
    const debtSymbol = computed(() => props.debtAsset?.symbol ?? "");
    const formattedPrevBorrow = computed(() => props.vault?.debt.toLocaleString() ?? ZeroStringValue);
    const nextBorrow = computed(() => {
      const debt = props.vault?.debt;
      if (isBorrowZero.value) return debt ?? null;
      return debt?.add(borrowFp.value);
    });
    const formattedNextBorrow = computed(() => nextBorrow.value?.toLocaleString() ?? ZeroStringValue);
    const formattedPrevLtv = computed(() => props.prevLtv?.toLocaleString(2) ?? ZeroStringValue);
    const ltvCoeff = computed(() => {
      if (!nextBorrow.value || props.maxSafeDebt.isZero()) return null;
      return nextBorrow.value.div(props.maxSafeDebt);
    });
    const ltv = computed(() => ltvCoeff.value?.isFinity() ? ltvCoeff.value.mul(HundredNumber) : null);
    const ltvNumber = computed(() => ltv.value?.toNumber() ?? 0);
    const formattedLtv = computed(
      () => ltvCoeff.value ? ltvCoeff.value.mul(props.maxLtv).toLocaleString(2) : ZeroStringValue
    );
    const ltvText = computed(() => LtvTranslations[getLtvStatus(ltvNumber.value)]);
    const borrowTaxPercent = computed(
      () => percentFormat.value?.format?.(props.borrowTax) ?? `${props.borrowTax * HundredNumber}%`
    );
    const formattedBorrowTax = computed(() => borrowFp.value.mul(props.borrowTax ?? 0).toLocaleString() ?? ZeroStringValue);
    const borrowValuePercent = computed(() => {
      if (!borrowValue.value) return 0;
      if (availableOrTotal.value.isZero()) return 0;
      const percent = borrowFp.value.div(availableOrTotal.value).mul(HundredNumber).toNumber(0);
      return percent > HundredNumber ? HundredNumber : percent;
    });
    const title = computed(() => t("kensetsu.borrowMore"));
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const errorMessage = computed(() => {
      if (isInsufficientXorForFee.value) {
        return t("insufficientBalanceText", { tokenSymbol: xorSymbol });
      }
      if (isBorrowZero.value) {
        return t("kensetsu.error.enterBorrow");
      }
      if (isBorrowMoreThanAvailable.value) {
        return t("kensetsu.error.borrowMoreThanAvailable");
      }
      return "";
    });
    const handleMaxBorrowValue = () => {
      borrowValue.value = availableOrTotal.value.toString();
    };
    const handleBorrowPercentChange = (percent) => {
      borrowValue.value = availableOrTotal.value.mul(percent / HundredNumber).toString();
    };
    const instance = getCurrentInstance();
    const alert = instance?.proxy?.$alert;
    const handleBorrowMore = async () => {
      if (disabled.value) {
        if (errorMessage.value) {
          alert?.(errorMessage.value, { title: t("errorText") });
        }
        return;
      }
      try {
        await withNotifications(async () => {
          if (!(props.vault && props.debtAsset)) {
            throw new Error("[api.kensetsu.borrow]: vault is null");
          }
          await api.kensetsu.borrow(props.vault, borrowValue.value, props.debtAsset, slippageTolerance.value);
        });
        emit("confirm");
      } catch (error) {
        console.error(error);
      } finally {
        isVisible.value = false;
      }
    };
    watch(
      () => props.visible,
      async (value) => {
        isVisible.value = value;
        if (value) {
          await nextTick();
          borrowValue.value = "";
          debtInput.value?.focus();
        }
      },
      { immediate: true }
    );
    watch(isVisible, (value) => {
      emit("update:visible", value);
    });
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(unref(DialogBase), {
        title: title.value,
        visible: isVisible.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => isVisible.value = $event),
        tooltip: unref(t)("kensetsu.borrowMoreDescription")
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(unref(TokenInput), {
              ref_key: "debtInput",
              ref: debtInput,
              class: "borrow-more__debt-input borrow-more__token-input",
              "with-slider": "",
              "is-fiat-editable": "",
              modelValue: borrowValue.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => borrowValue.value = $event),
              title: title.value,
              "balance-text": unref(t)("kensetsu.available"),
              "is-max-available": isMaxBorrowAvailable.value,
              token: __props.debtAsset,
              balance: availableCodec.value,
              "slider-value": borrowValuePercent.value,
              disabled: unref(loading),
              onMax: handleMaxBorrowValue,
              onSlide: handleBorrowPercentChange
            }, null, 8, ["modelValue", "title", "balance-text", "is-max-available", "token", "balance", "slider-value", "disabled"]),
            createVNode(unref(SlippageTolerance), { class: "slippage-tolerance-settings borrow-more__slippage" }),
            createVNode(unref(PrevNextInfoLine), {
              label: unref(t)("kensetsu.outstandingDebt"),
              tooltip: unref(t)("kensetsu.outstandingDebtDescription"),
              symbol: debtSymbol.value,
              prev: formattedPrevBorrow.value,
              next: formattedNextBorrow.value
            }, null, 8, ["label", "tooltip", "symbol", "prev", "next"]),
            createVNode(unref(PrevNextInfoLine), {
              symbol: "%",
              label: unref(t)("kensetsu.ltv"),
              tooltip: unref(t)("kensetsu.ltvDescription"),
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
              class: "s-typography-button--large action-button borrow-more__button",
              type: "primary",
              disabled: disabled.value,
              onClick: handleBorrowMore
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
              label: unref(t)("kensetsu.borrowTax"),
              "label-tooltip": unref(t)("kensetsu.borrowTaxDescription", { value: borrowTaxPercent.value }),
              value: formattedBorrowTax.value,
              "asset-symbol": debtSymbol.value,
              "is-formatted": ""
            }, null, 8, ["label", "label-tooltip", "value", "asset-symbol"]),
            createVNode(unref(InfoLine), {
              "is-formatted": "",
              label: unref(t)("networkFeeText"),
              "label-tooltip": unref(t)("networkFeeTooltipText"),
              value: networkFeeFormatted.value,
              "asset-symbol": unref(xorSymbol),
              "fiat-value": unref(getFiatAmountByCodecString)(networkFee.value)
            }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])
          ])
        ]),
        _: 1
      }, 8, ["title", "visible", "tooltip"]);
    };
  }
});
const BorrowMoreDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e8111098"]]);
export {
  BorrowMoreDialog as default
};
