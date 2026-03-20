import { z as defineComponent, c4 as ObjectInit, Z as ZeroStringValue, aZ as components, ak as lazyComponent, al as Components, u as useTranslation, c2 as useTransaction, a9 as ref, X as XOR, aA as watch, b5 as nextTick, h as computed, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aj as unref, A as createElementBlock, bQ as Fragment, aO as createTextVNode, aN as toDisplayString, O as Operation, ay as api, cu as isMaxButtonAvailable, cY as HundredNumber, s as store, $ as getCurrentInstance, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "dashboard-send" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "SendTokenDialog",
  props: {
    visible: { type: Boolean, default: false },
    balance: { default: ZeroStringValue },
    editableFiat: { type: Boolean, default: false },
    asset: { default: () => ObjectInit }
  },
  emits: ["update:visible"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const DialogBase = components.DialogBase;
    const InfoLine = components.InfoLine;
    const AddressBookInput = components.AddressBookInput;
    const TokenInput = lazyComponent(Components.TokenInput);
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const { loading, withNotifications } = useTransaction();
    const { Zero, getFPNumber, getFPNumberFromCodec, formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();
    const isVisible = ref(props.visible);
    const value = ref("");
    const address = ref("");
    const comment = ref("");
    const tokenInput = ref(null);
    const xorSymbol = XOR.symbol;
    const asset = computed(() => props.asset);
    const balance = computed(() => props.balance ?? ZeroStringValue);
    const editableFiat = computed(() => props.editableFiat);
    const tokenDecimals = computed(() => asset.value?.decimals);
    const networkFees = computed(() => store.state.wallet.settings.networkFees);
    const accountXor = computed(() => store.getters.assets.xor);
    const networkFee = computed(() => networkFees.value?.[Operation.XorlessTransfer] ?? ZeroStringValue);
    const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
    const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));
    const tokenSymbol = computed(() => asset.value?.symbol ?? "");
    const title = computed(() => `Send ${tokenSymbol.value}`);
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const fpBalance = computed(() => getFPNumberFromCodec(balance.value, tokenDecimals.value));
    const assetWithBalance = computed(() => {
      if (!asset.value) return null;
      return { ...asset.value, balance: { transferable: balance.value } };
    });
    const trimmedAddress = computed(() => address.value.trim());
    const emptyAddress = computed(() => trimmedAddress.value.length === 0);
    const validAddress = computed(() => !emptyAddress.value && api.validateAddress(trimmedAddress.value));
    const emptyValue = computed(() => !Number(value.value));
    const isInsufficientBalance = computed(() => {
      if (!value.value) return false;
      const amount = getFPNumber(value.value, tokenDecimals.value);
      return fpBalance.value.sub(amount).isLtZero();
    });
    const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());
    const isMaxAvailable = computed(() => {
      if (!assetWithBalance.value || !accountXor.value) return false;
      return isMaxButtonAvailable(assetWithBalance.value, value.value ?? "", networkFee.value, accountXor.value);
    });
    const valuePercent = computed(() => {
      if (!value.value) return 0;
      if (fpBalance.value.isZero()) return 0;
      const percent = getFPNumber(value.value, tokenDecimals.value).div(fpBalance.value).mul(HundredNumber).toNumber(0);
      return percent > HundredNumber ? HundredNumber : percent;
    });
    const disabled = computed(
      () => loading.value || isInsufficientXorForFee.value || emptyValue.value || !validAddress.value || isInsufficientBalance.value
    );
    const instance = getCurrentInstance();
    const showAlert = (message) => {
      const proxy = instance?.proxy;
      proxy?.$alert?.(message, { title: t("errorText") });
    };
    const resetForm = () => {
      value.value = "";
      address.value = "";
      comment.value = "";
    };
    const handlePercentChange = (percent) => {
      const amount = fpBalance.value.mul(percent / HundredNumber);
      value.value = amount.toString();
    };
    const handleMaxValue = () => {
      value.value = fpBalance.value.toString();
    };
    const handleCommentInput = (event) => {
      if (!/^[A-Za-z0-9 _',.#]+$/.test(event.key)) {
        event.preventDefault();
      }
    };
    const handleSend = async () => {
      const trimmedComment = comment.value.trim() || void 0;
      const trimmedAddressValue = trimmedAddress.value;
      if (isInsufficientBalance.value) {
        showAlert(t("insufficientBalanceText", { tokenSymbol: tokenSymbol.value }));
        return;
      }
      if (!asset.value || disabled.value) return;
      try {
        await withNotifications(async () => {
          await api.assets.transfer(asset.value, trimmedAddressValue, value.value, {
            feeType: "xor",
            comment: trimmedComment
          });
        });
      } catch (error) {
        console.error(error);
      } finally {
        isVisible.value = false;
      }
    };
    watch(
      () => props.visible,
      async (visible) => {
        isVisible.value = visible;
        if (visible) {
          resetForm();
          await nextTick();
          tokenInput.value?.focus?.();
        }
      },
      { immediate: true }
    );
    watch(isVisible, (visible) => {
      emit("update:visible", visible);
    });
    __expose({
      isVisible,
      value,
      address,
      comment,
      disabled,
      isInsufficientBalance,
      isInsufficientXorForFee,
      handleSend,
      handleMaxValue,
      handlePercentChange,
      handleCommentInput,
      resetForm
    });
    return (_ctx, _cache) => {
      const _component_s_input = resolveComponent("s-input");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(unref(DialogBase), {
        title: title.value,
        visible: isVisible.value,
        "onUpdate:visible": _cache[3] || (_cache[3] = ($event) => isVisible.value = $event),
        tooltip: "COMING SOON..."
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(unref(AddressBookInput), {
              class: "dashboard-send__address",
              "exclude-connected": "",
              modelValue: address.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => address.value = $event),
              "is-valid": validAddress.value,
              disabled: unref(loading)
            }, null, 8, ["modelValue", "is-valid", "disabled"]),
            createVNode(unref(TokenInput), {
              ref_key: "tokenInput",
              ref: tokenInput,
              class: "dashboard-send__token-input",
              "with-slider": "",
              title: "AMOUNT",
              modelValue: value.value,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => value.value = $event),
              "is-fiat-editable": editableFiat.value,
              "is-max-available": isMaxAvailable.value,
              token: asset.value,
              balance: balance.value,
              "slider-value": valuePercent.value,
              disabled: unref(loading),
              onMax: handleMaxValue,
              onSlide: handlePercentChange
            }, null, 8, ["modelValue", "is-fiat-editable", "is-max-available", "token", "balance", "slider-value", "disabled"]),
            createVNode(_component_s_input, {
              class: "dashboard-send__comment",
              type: "textarea",
              placeholder: "Comment (Optional)",
              modelValue: comment.value,
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => comment.value = $event),
              rows: 4,
              maxlength: 128,
              disabled: unref(loading),
              onKeypress: handleCommentInput
            }, null, 8, ["modelValue", "disabled"]),
            createVNode(_component_s_button, {
              type: "primary",
              class: "s-typography-button--large action-button dashboard-send__button",
              disabled: disabled.value,
              onClick: handleSend
            }, {
              default: withCtx(() => [
                isInsufficientXorForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(xorSymbol) })), 1)
                ], 64)) : emptyAddress.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("walletSend.enterAddress")), 1)
                ], 64)) : !validAddress.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(unref(t)("walletSend.badAddress")), 1)
                ], 64)) : emptyValue.value ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [
                  createTextVNode(toDisplayString(unref(t)("buttons.enterAmount")), 1)
                ], 64)) : isInsufficientBalance.value ? (openBlock(), createElementBlock(Fragment, { key: 4 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: tokenSymbol.value })), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 5 }, [
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
      }, 8, ["title", "visible"]);
    };
  }
});
const SendTokenDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-51654ec1"]]);
export {
  SendTokenDialog as default
};
