import { z as defineComponent, cY as HundredNumber, F as FPNumber, c4 as ObjectInit, aZ as components, ak as lazyComponent, al as Components, d3 as vaultLazyComponent, d4 as VaultComponents, u as useTranslation, c2 as useTransaction, a9 as ref, X as XOR, $ as getCurrentInstance, aA as watch, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aj as unref, h as computed, aM as createCommentVNode, aO as createTextVNode, aN as toDisplayString, A as createElementBlock, bQ as Fragment, ay as api, Z as ZeroStringValue, O as Operation, g as getAssetBalance, d7 as LtvTranslations, b5 as nextTick, s as store, ad as asZeroValue, cv as hasInsufficientBalance, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { g as getLtvStatus } from "./util-BnzJdZIz.js";
const _hoisted_1 = { class: "add-collateral" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AddCollateralDialog",
  props: {
    visible: { type: Boolean, default: false },
    collateral: { default: ObjectInit },
    vault: { default: ObjectInit },
    lockedAsset: { default: ObjectInit },
    debtAsset: { default: ObjectInit },
    prevLtv: { default: () => FPNumber.ZERO },
    prevAvailable: { default: () => FPNumber.ZERO },
    averageCollateralPrice: { default: () => FPNumber.ZERO },
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
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const { loading, withNotifications } = useTransaction();
    const {
      Zero,
      getFPNumber,
      getFPNumberFromCodec,
      formatCodecNumber,
      getFiatAmountByCodecString,
      getFPNumberFiatAmountByFPNumber
    } = useFormattedAmount();
    const isVisible = ref(props.visible);
    const collateralValue = ref("");
    const collateralInput = ref(null);
    const xorSymbol = XOR.symbol;
    const shouldBalanceBeHidden = computed(() => store.state.wallet.settings.shouldBalanceBeHidden ?? false);
    const networkFees = computed(() => store.state.wallet.settings.networkFees);
    const accountXor = computed(() => store.getters.assets.xor);
    const networkFee = computed(() => networkFees.value?.[Operation.DepositCollateral] ?? ZeroStringValue);
    const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
    const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));
    const isCollateralZero = computed(() => asZeroValue(collateralValue.value));
    const collateralFp = computed(() => {
      if (isCollateralZero.value) return Zero;
      return getFPNumber(collateralValue.value, props.lockedAsset?.decimals);
    });
    const collateralAssetBalance = computed(
      () => props.lockedAsset ? getAssetBalance(props.lockedAsset) : ZeroStringValue
    );
    const availableCollateralBalanceFp = computed(() => {
      let available = getFPNumberFromCodec(collateralAssetBalance.value);
      if (props.lockedAsset?.address === XOR.address) {
        available = available.sub(fpNetworkFee.value);
        if (available.isLtZero()) {
          available = Zero;
        }
      }
      return available;
    });
    const collateralValuePercent = computed(() => {
      if (!collateralValue.value) return 0;
      const denominator = availableCollateralBalanceFp.value;
      if (denominator.isZero()) return 0;
      const percent = collateralFp.value.div(denominator).mul(HundredNumber).toNumber(0);
      return percent > HundredNumber ? HundredNumber : percent;
    });
    const debtSymbol = computed(() => props.debtAsset?.symbol ?? "");
    const lockedSymbol = computed(() => props.lockedAsset?.symbol ?? "");
    const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());
    const isInsufficientBalance = computed(() => {
      if (!props.lockedAsset) return true;
      return hasInsufficientBalance(props.lockedAsset, collateralValue.value, networkFee.value);
    });
    const disabled = computed(
      () => loading.value || isInsufficientXorForFee.value || isCollateralZero.value || isInsufficientBalance.value
    );
    const title = computed(() => t("kensetsu.addCollateral"));
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const totalCollateralValue = computed(() => {
      if (!props.vault) return null;
      return props.vault.lockedAmount.add(collateralFp.value);
    });
    const formattedPrevDeposit = computed(
      () => props.vault ? props.vault.lockedAmount.toLocaleString() : ZeroStringValue
    );
    const formattedNextDeposit = computed(() => totalCollateralValue.value?.toLocaleString() ?? ZeroStringValue);
    const formattedPrevLtv = computed(() => props.prevLtv?.toLocaleString(2) ?? ZeroStringValue);
    const maxBorrowPerCollateralValue = computed(() => {
      if (isCollateralZero.value) return Zero;
      const collateralVolume = props.averageCollateralPrice.mul(collateralFp.value);
      const maxSafeDebt2 = collateralVolume.mul(props.collateral?.riskParams.liquidationRatioReversed ?? 0).div(HundredNumber);
      let available = maxSafeDebt2.sub(maxSafeDebt2.mul(props.borrowTax));
      let totalAvailable = props.collateral?.riskParams.hardCap.sub(props.collateral.debtSupply) ?? Zero;
      totalAvailable = totalAvailable.sub(totalAvailable.mul(props.borrowTax));
      available = available.gt(totalAvailable) ? totalAvailable : available;
      return !available.isFinity() || available.isLteZero() ? Zero : available;
    });
    const formattedPrevAvailable = computed(() => props.prevAvailable.toLocaleString());
    const nextAvailable = computed(() => props.prevAvailable.add(maxBorrowPerCollateralValue.value));
    const formattedNextAvailable = computed(() => nextAvailable.value.toLocaleString());
    const maxSafeDebt = computed(() => {
      if (!totalCollateralValue.value) return null;
      const collateralVolume = props.averageCollateralPrice.mul(totalCollateralValue.value);
      return collateralVolume.mul(props.collateral?.riskParams.liquidationRatioReversed ?? 0).div(HundredNumber);
    });
    const ltvCoeff = computed(() => {
      if (!(maxSafeDebt.value && props.vault)) return null;
      return props.vault.debt.div(maxSafeDebt.value);
    });
    const ltv = computed(() => ltvCoeff.value?.isFinity() ? ltvCoeff.value.mul(HundredNumber) : null);
    const ltvNumber = computed(() => ltv.value?.toNumber() ?? 0);
    const formattedLtv = computed(
      () => ltvCoeff.value ? ltvCoeff.value.mul(props.maxLtv).toLocaleString(2) : ZeroStringValue
    );
    const ltvText = computed(() => LtvTranslations[getLtvStatus(ltvNumber.value)]);
    const isMaxCollateralAvailable = computed(() => {
      if (shouldBalanceBeHidden.value || isCollateralZero.value) return true;
      if (availableCollateralBalanceFp.value.isLteZero()) return false;
      return !collateralFp.value.isEqualTo(availableCollateralBalanceFp.value);
    });
    const errorMessage = computed(() => {
      if (isInsufficientXorForFee.value) {
        return t("insufficientBalanceText", { tokenSymbol: xorSymbol });
      }
      if (isCollateralZero.value) {
        return t("kensetsu.error.enterCollateral");
      }
      if (isInsufficientBalance.value) {
        return t("insufficientBalanceText", { tokenSymbol: lockedSymbol.value });
      }
      return "";
    });
    const instance = getCurrentInstance();
    const alert = instance?.proxy?.$alert;
    const handleCollateralPercentChange = (percent) => {
      const amount = availableCollateralBalanceFp.value.mul(percent / HundredNumber);
      collateralValue.value = amount.toString();
    };
    const handleMaxCollateralValue = () => {
      collateralValue.value = availableCollateralBalanceFp.value.toString();
    };
    const handleAddCollateral = async () => {
      if (disabled.value) {
        if (errorMessage.value) {
          alert?.(errorMessage.value, { title: t("errorText") });
        }
        return;
      }
      try {
        await withNotifications(async () => {
          if (!(props.vault && props.lockedAsset)) {
            throw new Error("[api.kensetsu.depositCollateral]: vault or asset is null");
          }
          await api.kensetsu.depositCollateral(props.vault, collateralValue.value, props.lockedAsset);
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
          collateralValue.value = "";
          collateralInput.value?.focus();
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
        tooltip: unref(t)("kensetsu.addCollateralDescription")
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(unref(TokenInput), {
              ref_key: "collateralInput",
              ref: collateralInput,
              class: "add-collateral__collateral-input add-collateral__token-input",
              "with-slider": "",
              title: unref(t)("kensetsu.depositCollateral"),
              modelValue: collateralValue.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => collateralValue.value = $event),
              "is-fiat-editable": "",
              "is-max-available": isMaxCollateralAvailable.value,
              token: __props.lockedAsset,
              balance: collateralAssetBalance.value,
              "slider-value": collateralValuePercent.value,
              disabled: unref(loading),
              onMax: handleMaxCollateralValue,
              onSlide: handleCollateralPercentChange
            }, null, 8, ["title", "modelValue", "is-max-available", "token", "balance", "slider-value", "disabled"]),
            createVNode(unref(PrevNextInfoLine), {
              label: unref(t)("kensetsu.totalCollateral"),
              tooltip: unref(t)("kensetsu.totalCollateralDescription"),
              symbol: lockedSymbol.value,
              prev: formattedPrevDeposit.value,
              next: formattedNextDeposit.value
            }, null, 8, ["label", "tooltip", "symbol", "prev", "next"]),
            createVNode(unref(PrevNextInfoLine), {
              label: unref(t)("kensetsu.debtAvailable"),
              tooltip: unref(t)("kensetsu.debtAvailableDescription"),
              symbol: debtSymbol.value,
              prev: formattedPrevAvailable.value,
              next: formattedNextAvailable.value
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
              class: "s-typography-button--large action-button add-collateral__button",
              disabled: disabled.value,
              onClick: handleAddCollateral
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
const AddCollateralDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-ed129c3d"]]);
export {
  AddCollateralDialog as default
};
