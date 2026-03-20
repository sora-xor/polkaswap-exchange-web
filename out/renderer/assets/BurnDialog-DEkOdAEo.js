import { z as defineComponent, c4 as ObjectInit, Z as ZeroStringValue, aZ as components, ak as lazyComponent, al as Components, u as useTranslation, c2 as useTransaction, a9 as ref, X as XOR, aA as watch, b5 as nextTick, h as computed, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aj as unref, A as createElementBlock, bQ as Fragment, aO as createTextVNode, aN as toDisplayString, O as Operation, cu as isMaxButtonAvailable, cY as HundredNumber, ay as api, s as store, $ as getCurrentInstance, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "dashboard-burn" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "BurnDialog",
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
    const TokenInput = lazyComponent(Components.TokenInput);
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const { loading, withNotifications } = useTransaction();
    const { Zero, getFPNumber, getFPNumberFromCodec, formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();
    const isVisible = ref(props.visible);
    const value = ref("");
    const tokenInput = ref(null);
    const xorSymbol = XOR.symbol;
    const asset = computed(() => props.asset);
    const editableFiat = computed(() => props.editableFiat);
    const balance = computed(() => props.balance);
    const networkFees = computed(() => store.state.wallet.settings.networkFees);
    const accountXor = computed(() => store.getters.assets.xor);
    const networkFee = computed(() => networkFees.value?.[Operation.Burn] ?? ZeroStringValue);
    const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
    const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));
    const tokenDecimals = computed(() => asset.value?.decimals);
    const tokenSymbol = computed(() => asset.value?.symbol ?? "");
    const title = computed(() => `Burn ${tokenSymbol.value}`);
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
    const fpBalance = computed(() => getFPNumberFromCodec(balance.value ?? ZeroStringValue, tokenDecimals.value));
    const assetWithBalance = computed(() => {
      if (!asset.value) return null;
      return { ...asset.value, balance: { transferable: balance.value } };
    });
    const emptyValue = computed(() => !Number(value.value));
    const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());
    const isInsufficientBalance = computed(() => {
      if (!value.value) return false;
      const amount = getFPNumber(value.value, tokenDecimals.value);
      return fpBalance.value.sub(amount).isLtZero();
    });
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
      () => loading.value || isInsufficientXorForFee.value || emptyValue.value || isInsufficientBalance.value
    );
    const instance = getCurrentInstance();
    const showAlert = (message) => {
      const proxy = instance?.proxy;
      proxy?.$alert?.(message, { title: t("errorText") });
    };
    const resetForm = () => {
      value.value = "";
    };
    const handlePercentChange = (percent) => {
      const amount = fpBalance.value.mul(percent / HundredNumber);
      value.value = amount.toString();
    };
    const handleMaxValue = () => {
      value.value = fpBalance.value.toString();
    };
    const handleBurn = async () => {
      if (disabled.value) {
        if (isInsufficientBalance.value) {
          showAlert(t("insufficientBalanceText", { tokenSymbol: tokenSymbol.value }));
        }
        return;
      }
      if (!asset.value) return;
      try {
        await withNotifications(async () => {
          await api.assets.burn(asset.value, value.value);
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
      disabled,
      isInsufficientBalance,
      isInsufficientXorForFee,
      handleBurn,
      handleMaxValue,
      handlePercentChange,
      resetForm
    });
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(unref(DialogBase), {
        title: title.value,
        visible: isVisible.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => isVisible.value = $event),
        tooltip: "COMING SOON..."
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            _cache[2] || (_cache[2] = createBaseVNode("p", { class: "p3 dashboard-burn__text" }, "ENTER THE AMOUNT YOU WANT TO BURN", -1)),
            createVNode(unref(TokenInput), {
              ref_key: "tokenInput",
              ref: tokenInput,
              class: "dashboard-burn__token-input",
              "with-slider": "",
              title: "AMOUNT",
              modelValue: value.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => value.value = $event),
              "is-fiat-editable": editableFiat.value,
              "is-max-available": isMaxAvailable.value,
              token: asset.value,
              balance: balance.value,
              "slider-value": valuePercent.value,
              disabled: unref(loading),
              onMax: handleMaxValue,
              onSlide: handlePercentChange
            }, null, 8, ["modelValue", "is-fiat-editable", "is-max-available", "token", "balance", "slider-value", "disabled"]),
            createVNode(_component_s_button, {
              type: "primary",
              class: "s-typography-button--large action-button dashboard-burn__button",
              disabled: disabled.value,
              onClick: handleBurn
            }, {
              default: withCtx(() => [
                isInsufficientXorForFee.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(xorSymbol) })), 1)
                ], 64)) : emptyValue.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(toDisplayString(unref(t)("buttons.enterAmount")), 1)
                ], 64)) : isInsufficientBalance.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: tokenSymbol.value })), 1)
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 3 }, [
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
const BurnDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-bc8cf62b"]]);
export {
  BurnDialog as default
};
