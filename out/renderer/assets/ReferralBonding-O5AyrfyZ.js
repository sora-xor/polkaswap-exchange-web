import { z as defineComponent, aZ as components, ak as lazyComponent, u as useTranslation, c2 as useTransaction, at as useRoute, aB as onBeforeUnmount, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, c0 as toRef, A as createElementBlock, C as openBlock, ap as createVNode, aj as unref, h as computed, ao as withCtx, bQ as Fragment, aO as createTextVNode, aN as toDisplayString, a9 as ref, al as Components, s as store, X as XOR, V as PageNames, g as getAssetBalance, ad as asZeroValue, Z as ZeroStringValue, F as FPNumber, cv as hasInsufficientBalance, M as getMaxValue, ay as api, W as router, O as Operation, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "container" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "ReferralBonding",
    components: {
      GenericPageHeader: lazyComponent(Components.GenericPageHeader),
      TokenInput: lazyComponent(Components.TokenInput),
      ReferralsConfirmBonding: lazyComponent(Components.ReferralsConfirmBonding),
      InfoLine: components.InfoLine
    }
  },
  __name: "ReferralBonding",
  props: {
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props) {
    const props = __props;
    const parentLoading = toRef(props, "parentLoading");
    const { t } = useTranslation();
    const { formatCodecNumber, getFiatAmountByCodecString, getFPNumber, getFPNumberFromCodec } = useFormattedAmount();
    const { withNotifications, loading } = useTransaction();
    const route = useRoute();
    const networkFees = computed(
      () => store.state?.wallet?.settings?.networkFees ?? {}
    );
    const amount = computed(() => store.state?.referrals?.amount ?? "");
    const xor = computed(() => store.getters?.assets?.xor);
    const shouldBalanceBeHidden = computed(() => Boolean(store.state?.wallet?.settings?.shouldBalanceBeHidden));
    const xorSymbol = computed(() => XOR.symbol);
    const xorDecimals = computed(() => xor.value?.decimals ?? XOR.decimals);
    const xorBalance = computed(() => xor.value?.balance ?? null);
    const isBond = computed(() => route.name === PageNames.ReferralBonding);
    const isBondedBalance = computed(() => !isBond.value);
    const balance = computed(() => getAssetBalance(xor.value, { isBondedBalance: isBondedBalance.value }));
    const hasZeroAmount = computed(() => asZeroValue(amount.value));
    const networkFee = computed(() => {
      const fees = networkFees.value;
      return fees[isBond.value ? Operation.ReferralReserveXor : Operation.ReferralUnreserveXor] ?? ZeroStringValue;
    });
    const fpNumberNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value, xorDecimals.value));
    const formattedNetworkFeeFiat = computed(() => getFiatAmountByCodecString(networkFee.value, XOR));
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value, xorDecimals.value));
    const isMaxButtonAvailable = computed(() => {
      if (shouldBalanceBeHidden.value) return false;
      const balanceValue = getFPNumberFromCodec(xorBalance.value?.transferable ?? ZeroStringValue, xorDecimals.value);
      const amountValue = getFPNumber(amount.value || "0", xorDecimals.value);
      if (fpNumberNetworkFee.value.isZero()) return false;
      if (isBondedBalance.value) {
        const bonded = xorBalance.value?.bonded ?? ZeroStringValue;
        const isBondedZero = getFPNumberFromCodec(bonded, xorDecimals.value).isZero();
        return !isBondedZero && FPNumber.gt(balanceValue, fpNumberNetworkFee.value);
      }
      return !FPNumber.eq(fpNumberNetworkFee.value, balanceValue.sub(amountValue)) && FPNumber.gt(balanceValue, fpNumberNetworkFee.value);
    });
    const isInsufficientBondedXor = computed(() => {
      return !!xor.value && hasInsufficientBalance(xor.value, amount.value, networkFee.value, {
        isBondedBalance: isBondedBalance.value
      });
    });
    const isInsufficientXorForFee = computed(() => {
      if (isBondedBalance.value) {
        return FPNumber.gt(
          fpNumberNetworkFee.value,
          getFPNumberFromCodec(xorBalance.value?.transferable ?? ZeroStringValue, xorDecimals.value)
        );
      }
      return !!xor.value && hasInsufficientBalance(xor.value, amount.value, networkFee.value);
    });
    const isConfirmBondDisabled = computed(() => {
      return hasZeroAmount.value || isInsufficientXorForFee.value || isInsufficientBondedXor.value;
    });
    const confirmDialogVisible = ref(false);
    const setAmount = (value) => {
      store.commit?.referrals?.setAmount?.(value);
    };
    const resetAmount = () => {
      store.commit?.referrals?.resetAmount?.();
    };
    const handleInputXor = (value) => {
      if (value === amount.value) return;
      setAmount(value);
    };
    const handleMaxValue = () => {
      if (!xor.value) return;
      const maxValue = getMaxValue(xor.value, networkFee.value, { isBondedBalance: isBondedBalance.value });
      handleInputXor(maxValue);
    };
    const confirmBond = async () => {
      confirmDialogVisible.value = false;
      await withNotifications(async () => {
        const action = isBond.value ? api.referralSystem.reserveXor : api.referralSystem.unreserveXor;
        await action(amount.value);
        resetAmount();
        handleBack();
      });
    };
    const handleConfirmBond = () => {
      confirmDialogVisible.value = true;
    };
    const handleBack = () => {
      router.push({ name: PageNames.ReferralProgram });
    };
    onBeforeUnmount(() => {
      resetAmount();
    });
    return (_ctx, _cache) => {
      const _component_generic_page_header = resolveComponent("generic-page-header");
      const _component_token_input = resolveComponent("token-input");
      const _component_s_button = resolveComponent("s-button");
      const _component_info_line = resolveComponent("info-line");
      const _component_referrals_confirm_bonding = resolveComponent("referrals-confirm-bonding");
      const _component_s_form = resolveComponent("s-form");
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_generic_page_header, {
          "has-button-back": "",
          title: unref(t)(isBond.value ? "referralProgram.bondTitle" : "referralProgram.unbondTitle"),
          onBack: handleBack
        }, null, 8, ["title"]),
        createVNode(_component_s_form, {
          class: "el-form--actions",
          "show-message": false
        }, {
          default: withCtx(() => [
            createVNode(_component_token_input, {
              balance: balance.value,
              "is-max-available": isMaxButtonAvailable.value,
              title: unref(t)(isBond.value ? "referralProgram.action.bond" : "referralProgram.action.unbond"),
              token: xor.value,
              "model-value": amount.value,
              "onUpdate:modelValue": handleInputXor,
              onMax: handleMaxValue
            }, null, 8, ["balance", "is-max-available", "title", "token", "model-value"]),
            createVNode(_component_s_button, {
              class: "action-button s-typography-button--large",
              type: "primary",
              disabled: isConfirmBondDisabled.value,
              loading: unref(loading),
              onClick: handleConfirmBond
            }, {
              default: withCtx(() => [
                hasZeroAmount.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("buttons.enterAmount")), 1)
                ], 64)) : isInsufficientXorForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: xorSymbol.value })), 1)
                ], 64)) : isBondedBalance.value && isInsufficientBondedXor.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(unref(t)("referralProgram.insufficientBondedBalance")), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 3 }, [
                  createTextVNode(toDisplayString(unref(t)(isBond.value ? "referralProgram.action.bond" : "referralProgram.action.unbond")), 1)
                ], 64))
              ]),
              _: 1
            }, 8, ["disabled", "loading"]),
            createVNode(_component_info_line, {
              label: unref(t)("networkFeeText"),
              "label-tooltip": unref(t)("networkFeeTooltipText"),
              value: networkFeeFormatted.value,
              "asset-symbol": xorSymbol.value,
              "fiat-value": formattedNetworkFeeFiat.value,
              "is-formatted": ""
            }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"]),
            createVNode(_component_referrals_confirm_bonding, {
              visible: confirmDialogVisible.value,
              "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => confirmDialogVisible.value = $event),
              onConfirm: confirmBond
            }, null, 8, ["visible"])
          ]),
          _: 1
        })
      ])), [
        [_directive_loading, parentLoading.value]
      ]);
    };
  }
});
const ReferralBonding = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7e9bc0f1"]]);
export {
  ReferralBonding as default
};
