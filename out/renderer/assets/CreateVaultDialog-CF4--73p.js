import { z as defineComponent, aZ as components, ak as lazyComponent, al as Components, u as useTranslation, c2 as useTransaction, c3 as useNotification, X as XOR, aA as watch, h as computed, a9 as ref, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, ao as withCtx, D as createBaseVNode, aj as unref, am as createBlock, aM as createCommentVNode, aO as createTextVNode, aN as toDisplayString, bQ as Fragment, cY as HundredNumber, s as store, ay as api, Z as ZeroStringValue, O as Operation, g as getAssetBalance, d7 as LtvTranslations, b5 as nextTick, ad as asZeroValue, cv as hasInsufficientBalance, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { g as getLtvStatus } from "./util-BnzJdZIz.js";
const _hoisted_1 = { class: "vault-create" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "CreateVaultDialog",
  props: {
    visible: { type: Boolean, default: false }
  },
  emits: ["update:visible"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const DialogBase = components.DialogBase;
    const InfoLine = components.InfoLine;
    const TokenInput = lazyComponent(Components.TokenInput);
    const SelectToken = lazyComponent(Components.SelectToken);
    const ValueStatus = lazyComponent(Components.ValueStatusWrapper);
    const SlippageTolerance = lazyComponent(Components.SlippageTolerance);
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const { withNotifications, loading } = useTransaction();
    const { showAppAlert } = useNotification();
    const {
      Zero,
      Hundred,
      getFPNumber,
      getFPNumberFromCodec,
      formatCodecNumber,
      getFiatAmountByCodecString,
      getFiatAmountByFPNumber
    } = useFormattedAmount();
    const xorSymbol = XOR.symbol;
    const isVisible = computed({
      get: () => props.visible,
      set: (value) => emit("update:visible", value)
    });
    const collateralInput = ref(null);
    const debtInput = ref(null);
    const collateralValue = ref("");
    const borrowValue = ref("");
    const showSelectTokenDialog = ref(false);
    const isCollateralSelected = ref(true);
    const percentFormat = computed(() => store.state.settings.percentFormat);
    const networkFees = computed(() => store.state.wallet.settings.networkFees);
    const slippageToleranceValue = computed(() => store.state.settings.slippageTolerance);
    const collaterals = computed(() => store.state.vault.collaterals);
    const averageCollateralPrice = computed(() => store.getters.vault.averageCollateralPrice);
    const accountXor = computed(() => store.getters.assets.xor);
    const isLoggedIn = computed(() => store.getters.wallet.account.isLoggedIn);
    const debtToken = computed(() => store.getters.vault.debtToken);
    const collateralToken = computed(() => store.getters.vault.collateralToken);
    const shouldBalanceBeHidden = computed(() => store.state.wallet.settings.shouldBalanceBeHidden ?? false);
    const networkFee = computed(() => networkFees.value?.[Operation.CreateVault] ?? ZeroStringValue);
    const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
    const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());
    const collateralId = computed(() => {
      const collateral2 = collateralToken.value;
      const debt = debtToken.value;
      if (!(collateral2 && debt)) return "";
      return api.kensetsu.serializeKey(collateral2.address, debt.address);
    });
    const collateral = computed(() => collaterals.value[collateralId.value] ?? null);
    const maxLtv = computed(() => collateral.value?.riskParams.liquidationRatioReversed ?? HundredNumber);
    const minDeposit = computed(() => collateral.value?.riskParams.minDeposit ?? Zero);
    const isCollateralZero = computed(() => asZeroValue(collateralValue.value));
    const isBorrowZero = computed(() => asZeroValue(borrowValue.value));
    const collateralValueFp = computed(() => {
      if (isCollateralZero.value) return Zero;
      return getFPNumber(collateralValue.value, collateralToken.value?.decimals);
    });
    const borrowValueFp = computed(() => {
      if (isBorrowZero.value) return Zero;
      return getFPNumber(borrowValue.value, debtToken.value?.decimals);
    });
    const collateralAssetBalance = computed(() => getAssetBalance(collateralToken.value));
    const availableCollateralBalanceFp = computed(() => {
      let available = getFPNumberFromCodec(collateralAssetBalance.value);
      if (collateralToken.value?.address === XOR.address) {
        available = available.sub(fpNetworkFee.value);
        if (available.isLtZero()) {
          available = Zero;
        }
      }
      return available;
    });
    const isLessThanMinDeposit = computed(() => {
      if (!collateralValue.value) return true;
      return collateralValueFp.value.lt(minDeposit.value);
    });
    const isInsufficientBalance = computed(() => {
      if (!collateralToken.value) return true;
      return hasInsufficientBalance(collateralToken.value, collateralValue.value, networkFee.value);
    });
    const isIncorrectCollateral = computed(() => {
      if (!(collateralToken.value && debtToken.value)) return false;
      return !collateral.value;
    });
    const isLtvGtHundred = computed(() => ltv.value?.gt(Hundred) ?? false);
    const disabled = computed(
      () => loading.value || isIncorrectCollateral.value || isInsufficientXorForFee.value || isLessThanMinDeposit.value || isInsufficientBalance.value || !ltv.value || isBorrowZero.value || isLtvGtHundred.value
    );
    const collateralValuePercent = computed(() => {
      if (!collateralValue.value) return 0;
      const denominator = availableCollateralBalanceFp.value;
      if (denominator.isZero()) return 0;
      const percent = collateralValueFp.value.div(denominator).mul(HundredNumber).toNumber(0);
      return percent > HundredNumber ? HundredNumber : percent;
    });
    const selectTokenFilter = (asset) => {
      const tokenIds = Object.values(collaterals.value).map(
        (collateralItem) => isCollateralSelected.value ? collateralItem.lockedAssetId : collateralItem.debtAssetId
      );
      return tokenIds.includes(asset?.address);
    };
    const isMaxCollateralAvailable = computed(() => {
      if (shouldBalanceBeHidden.value) return true;
      if (availableCollateralBalanceFp.value.isLteZero()) return false;
      if (isCollateralZero.value) return true;
      return !collateralValueFp.value.isEqualTo(availableCollateralBalanceFp.value);
    });
    const isBorrowSliderAvailable = computed(() => availableCollateralBalanceFp.value.gte(minDeposit.value));
    const getBorrowTax = computed(
      () => store.getters.vault.getBorrowTax
    );
    const borrowTax = computed(() => {
      const token = debtToken.value;
      if (!token) return 0;
      return getBorrowTax.value(token.address);
    });
    const kusdAvailable = computed(() => {
      const available = collateral.value?.riskParams.hardCap.sub(collateral.value.debtSupply) ?? Zero;
      const availableExcludedFee = available.sub(available.mul(borrowTax.value));
      return availableExcludedFee.isLtZero() ? Zero : availableExcludedFee;
    });
    const maxBorrowPerMaxCollateralFp = computed(() => {
      if (!averageCollateralPrice.value || !availableCollateralBalanceFp.value.isFinity() || availableCollateralBalanceFp.value.isZero()) {
        return Zero;
      }
      const collateralVolume = averageCollateralPrice.value.mul(availableCollateralBalanceFp.value);
      const maxSafeDebt = collateralVolume.mul(collateral.value?.riskParams.liquidationRatioReversed ?? 0).div(HundredNumber);
      const maxBorrow = maxSafeDebt.sub(maxSafeDebt.mul(borrowTax.value));
      return maxBorrow.gt(kusdAvailable.value) ? kusdAvailable.value : maxBorrow;
    });
    const maxBorrowPerMaxCollateralNumber = computed(() => maxBorrowPerMaxCollateralFp.value.toNumber());
    const maxBorrowCodec = computed(() => {
      if (availableCollateralBalanceFp.value.lt(minDeposit.value)) return ZeroStringValue;
      return maxBorrowPerMaxCollateralFp.value.toCodecString();
    });
    const maxBorrowPerCollateralValue = computed(() => {
      if (!averageCollateralPrice.value || isCollateralZero.value) return Zero;
      const collateralVolume = averageCollateralPrice.value.mul(collateralValueFp.value);
      const maxSafeDebt = collateralVolume.mul(collateral.value?.riskParams.liquidationRatioReversed ?? 0).div(HundredNumber);
      return maxSafeDebt.sub(maxSafeDebt.mul(borrowTax.value));
    });
    const maxBorrowPerCollateralValueOrAvailable = computed(
      () => maxBorrowPerCollateralValue.value.gt(kusdAvailable.value) ? kusdAvailable.value : maxBorrowPerCollateralValue.value
    );
    const isMaxBorrowAvailable = computed(() => {
      if (isCollateralZero.value || availableCollateralBalanceFp.value.lt(minDeposit.value)) return false;
      if (shouldBalanceBeHidden.value || isBorrowZero.value) return true;
      if (!maxBorrowPerCollateralValueOrAvailable.value.isFinity() || maxBorrowPerCollateralValueOrAvailable.value.isLteZero())
        return false;
      return !borrowValueFp.value.isEqualTo(maxBorrowPerCollateralValueOrAvailable.value);
    });
    const borrowValuePercent = computed(() => {
      if (!borrowValue.value) return 0;
      const denominator = maxBorrowPerCollateralValueOrAvailable.value;
      if (denominator.isZero()) return 0;
      const percent = borrowValueFp.value.div(denominator).mul(HundredNumber).toNumber(0);
      return percent > HundredNumber ? HundredNumber : percent;
    });
    const ltvCoeff = computed(() => {
      if (isCollateralZero.value) return null;
      if (isBorrowZero.value) return Zero;
      return borrowValueFp.value.div(maxBorrowPerCollateralValue.value);
    });
    const ltv = computed(() => ltvCoeff.value?.isFinity() ? ltvCoeff.value.mul(HundredNumber) : null);
    const ltvNumber = computed(() => ltv.value?.toNumber() ?? 0);
    const formattedLtv = computed(
      () => ltvCoeff.value ? ltvCoeff.value.mul(maxLtv.value).toLocaleString(2) : ZeroStringValue
    );
    const ltvText = computed(() => LtvTranslations[getLtvStatus(ltvNumber.value)]);
    const formattedStabilityFee = computed(
      () => (collateral.value?.riskParams.stabilityFeeAnnual ?? Zero).toLocaleString()
    );
    const debtSymbol = computed(() => debtToken.value?.symbol ?? "");
    const collateralSymbol = computed(() => collateralToken.value?.symbol ?? "");
    const formattedMinDeposit = computed(() => minDeposit.value.toLocaleString() ?? ZeroStringValue);
    const minDepositFiat = computed(() => {
      const token = collateralToken.value;
      if (!token) return null;
      return getFiatAmountByFPNumber(minDeposit.value, token);
    });
    const borrowTaxPercent = computed(
      () => percentFormat.value?.format?.(borrowTax.value) ?? `${borrowTax.value * HundredNumber}%`
    );
    const formattedBorrowTax = computed(() => borrowValueFp.value.mul(borrowTax.value ?? 0).toLocaleString());
    const errorMessage = computed(() => {
      if (isInsufficientXorForFee.value) {
        return t("insufficientBalanceText", { tokenSymbol: xorSymbol });
      }
      if (isIncorrectCollateral.value) {
        return t("kensetsu.error.incorrectCollateral");
      }
      if (!ltv.value) {
        return t("kensetsu.error.enterCollateral");
      }
      if (isBorrowZero.value) {
        return t("kensetsu.error.enterBorrow");
      }
      if (isLessThanMinDeposit.value) {
        return t("kensetsu.error.insufficientCollateral");
      }
      if (isInsufficientBalance.value) {
        return t("insufficientBalanceText", { tokenSymbol: collateralSymbol.value });
      }
      if (isLtvGtHundred.value) {
        return t("kensetsu.error.insufficientCollateral");
      }
      return "";
    });
    const handleCollateralPercentChange = (percent) => {
      collateralValue.value = availableCollateralBalanceFp.value.mul(percent / HundredNumber).toString();
    };
    const handleMaxCollateralValue = () => {
      collateralValue.value = availableCollateralBalanceFp.value.toString();
    };
    const handleMaxBorrowValue = () => {
      borrowValue.value = maxBorrowPerCollateralValueOrAvailable.value.toString();
    };
    const handleBorrowPercentChange = (percent) => {
      borrowValue.value = maxBorrowPerCollateralValueOrAvailable.value.mul(percent / HundredNumber).toString();
    };
    const openSelectTokenDialog = (isCollateral = true) => {
      isCollateralSelected.value = isCollateral;
      showSelectTokenDialog.value = true;
    };
    const handleSelectToken = async (token) => {
      if (isCollateralSelected.value) {
        await store.dispatch.vault.setCollateralTokenAddress(token?.address);
      } else {
        await store.dispatch.vault.setDebtTokenAddress(token?.address);
      }
      collateralValue.value = "";
      borrowValue.value = "";
    };
    const handleCreate = async () => {
      if (disabled.value) {
        if (errorMessage.value) {
          showAppAlert(errorMessage.value, t("errorText"));
        }
      } else {
        try {
          const lockedToken = collateralToken.value;
          const debt = debtToken.value;
          if (!(lockedToken && debt)) return;
          await withNotifications(async () => {
            await api.kensetsu.createVault(
              lockedToken,
              debt,
              collateralValue.value,
              borrowValue.value,
              slippageToleranceValue.value
            );
          });
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
        collateralValue.value = "";
        borrowValue.value = "";
        showSelectTokenDialog.value = false;
        if (!value) {
          await store.dispatch.vault.setCollateralTokenAddress();
        } else {
          const focus = collateralInput.value && typeof collateralInput.value.focus === "function" ? collateralInput.value.focus : void 0;
          focus?.();
        }
      },
      { immediate: true }
    );
    __expose({
      handleCreate,
      openSelectTokenDialog,
      handleSelectToken,
      collateralValue,
      borrowValue,
      disabled,
      errorMessage,
      isInsufficientXorForFee,
      isVisible
    });
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createElementBlock("div", null, [
        createVNode(unref(DialogBase), {
          title: unref(t)("kensetsu.createVault"),
          visible: isVisible.value,
          "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => isVisible.value = $event),
          tooltip: unref(t)("kensetsu.createVaultDescription")
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_1, [
              createVNode(unref(TokenInput), {
                ref_key: "collateralInput",
                ref: collateralInput,
                class: "vault-create__collateral-input vault-create__token-input",
                "with-slider": "",
                "is-fiat-editable": "",
                "is-select-available": "",
                modelValue: collateralValue.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => collateralValue.value = $event),
                title: unref(t)("kensetsu.depositCollateral"),
                "is-max-available": isMaxCollateralAvailable.value,
                token: collateralToken.value,
                balance: collateralAssetBalance.value,
                "slider-value": collateralValuePercent.value,
                disabled: unref(loading),
                onMax: handleMaxCollateralValue,
                onSlide: handleCollateralPercentChange,
                onSelect: _cache[1] || (_cache[1] = ($event) => openSelectTokenDialog(true))
              }, null, 8, ["modelValue", "title", "is-max-available", "token", "balance", "slider-value", "disabled"]),
              createVNode(unref(TokenInput), {
                ref_key: "debtInput",
                ref: debtInput,
                class: "vault-create__debt-input vault-create__token-input",
                "is-fiat-editable": "",
                "is-select-available": "",
                modelValue: borrowValue.value,
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => borrowValue.value = $event),
                "with-slider": isBorrowSliderAvailable.value,
                title: unref(t)("kensetsu.borrowDebt"),
                "balance-text": unref(t)("kensetsu.available"),
                balance: maxBorrowCodec.value,
                "is-max-available": isMaxBorrowAvailable.value,
                token: debtToken.value,
                "slider-value": borrowValuePercent.value,
                disabled: unref(loading),
                max: maxBorrowPerMaxCollateralNumber.value,
                onMax: handleMaxBorrowValue,
                onSlide: handleBorrowPercentChange,
                onSelect: _cache[3] || (_cache[3] = ($event) => openSelectTokenDialog(false))
              }, null, 8, ["modelValue", "with-slider", "title", "balance-text", "balance", "is-max-available", "token", "slider-value", "disabled", "max"]),
              createVNode(unref(SlippageTolerance), { class: "slippage-tolerance-settings vault-create__slippage" }),
              createVNode(unref(InfoLine), {
                label: unref(t)("kensetsu.ltv"),
                "label-tooltip": unref(t)("kensetsu.ltvDescription"),
                value: formattedLtv.value,
                "asset-symbol": "%",
                "is-formatted": ""
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
              }, 8, ["label", "label-tooltip", "value"]),
              createVNode(_component_s_button, {
                type: "primary",
                class: "s-typography-button--large action-button vault-create__button",
                disabled: disabled.value,
                onClick: handleCreate
              }, {
                default: withCtx(() => [
                  disabled.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                    createTextVNode(toDisplayString(errorMessage.value), 1)
                  ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                    createTextVNode(toDisplayString(unref(t)("kensetsu.createVaultAction")), 1)
                  ], 64))
                ]),
                _: 1
              }, 8, ["disabled"]),
              createVNode(unref(InfoLine), {
                label: unref(t)("kensetsu.minDepositCollateral"),
                "label-tooltip": unref(t)("kensetsu.minDepositCollateralDescription"),
                value: formattedMinDeposit.value,
                "asset-symbol": collateralSymbol.value,
                "fiat-value": minDepositFiat.value,
                "is-formatted": ""
              }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"]),
              createVNode(unref(InfoLine), {
                label: unref(t)("kensetsu.interest"),
                "label-tooltip": unref(t)("kensetsu.interestDescription"),
                value: formattedStabilityFee.value,
                "asset-symbol": "%",
                "is-formatted": ""
              }, null, 8, ["label", "label-tooltip", "value"]),
              createVNode(unref(InfoLine), {
                label: unref(t)("kensetsu.borrowTax"),
                "label-tooltip": unref(t)("kensetsu.borrowTaxDescription", { value: borrowTaxPercent.value }),
                value: formattedBorrowTax.value,
                "asset-symbol": debtSymbol.value,
                "is-formatted": ""
              }, null, 8, ["label", "label-tooltip", "value", "asset-symbol"]),
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
        }, 8, ["title", "visible", "tooltip"]),
        createVNode(unref(SelectToken), {
          "disabled-custom": "",
          visible: showSelectTokenDialog.value,
          "onUpdate:visible": _cache[5] || (_cache[5] = ($event) => showSelectTokenDialog.value = $event),
          connected: isLoggedIn.value,
          filter: selectTokenFilter,
          asset: collateralToken.value,
          onSelect: handleSelectToken
        }, null, 8, ["visible", "connected", "asset"])
      ]);
    };
  }
});
const CreateVaultDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-68495bb9"]]);
export {
  CreateVaultDialog as default
};
