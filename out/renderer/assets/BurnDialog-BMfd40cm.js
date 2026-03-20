import { z as defineComponent, bt as mergeModels, ak as lazyComponent, aZ as components, bu as useModel, u as useTranslation, c2 as useTransaction, bm as toRefs, aA as watch, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aM as createCommentVNode, D as createBaseVNode, a9 as ref, aj as unref, h as computed, X as XOR, aN as toDisplayString, A as createElementBlock, bQ as Fragment, aO as createTextVNode, al as Components, $ as getCurrentInstance, ay as api, s as store, Z as ZeroStringValue, O as Operation, ad as asZeroValue, b5 as nextTick, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "disclaimer s-flex" };
const _hoisted_2 = { class: "disclaimer__text p3" };
const _hoisted_3 = { class: "disclaimer__badge s-flex" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogBase: components.DialogBase,
      InfoLine: components.InfoLine,
      TokenInput: lazyComponent(Components.TokenInput)
    }
  },
  __name: "BurnDialog",
  props: /* @__PURE__ */ mergeModels({
    receivedAsset: {},
    burnedAsset: {},
    rate: { default: "0.01" },
    max: { default: 1e8 },
    min: { default: 1 }
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["close", "confirm"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const isVisible = useModel(__props, "visible");
    const { t } = useTranslation();
    const { loading, withNotifications } = useTransaction();
    const {
      Zero,
      getFPNumber,
      getFPNumberFromCodec,
      formatCodecNumber,
      getFiatAmountByFPNumber,
      getFiatAmountByCodecString
    } = useFormattedAmount();
    const { max, min, receivedAsset, burnedAsset, rate } = toRefs(props);
    const value = ref("");
    const xor = XOR;
    const networkFees = computed(() => store.state.wallet.settings.networkFees);
    const accountXor = computed(() => store.getters.assets.xor);
    const isLoggedIn = computed(() => Boolean(store.getters.wallet.account.isLoggedIn));
    const networkFee = computed(() => networkFees.value?.[Operation.Burn] ?? ZeroStringValue);
    const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value, burnedAsset.value.decimals));
    const xorBalance = computed(
      () => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue, burnedAsset.value.decimals)
    );
    const willBeBurned = computed(() => getFPNumber(value.value || ZeroStringValue).mul(rate.value));
    const tokensLeft = computed(() => {
      const diff = xorBalance.value.sub(willBeBurned.value);
      return diff.isLtZero() ? Zero : diff;
    });
    const title = computed(() => `Reserve ${receivedAsset.value.symbol} token`);
    const receivedPlaceholder = computed(() => `HOW MUCH ${receivedAsset.value.symbol} DO YOU WANT?`);
    const getKey = (key) => isVisible.value ? `${key}-opened` : `${key}-closed`;
    const toBeBurnedLabel = computed(() => `${burnedAsset.value.symbol} TO BE BURNED`);
    const toBeBurnedKey = computed(() => getKey(`${burnedAsset.value.symbol}-burned`));
    const yourBalanceLeftLabel = computed(() => `YOUR ${burnedAsset.value.symbol} BALANCE LEFT`);
    const yourBalanceLeftKey = computed(() => getKey(`${burnedAsset.value.symbol}-left`));
    const formattedWillBeBurned = computed(() => willBeBurned.value.toLocaleString());
    const formattedFiatWillBeBurned = computed(() => getFiatAmountByFPNumber(willBeBurned.value, burnedAsset.value));
    const formattedTokensLeft = computed(() => tokensLeft.value.toLocaleString());
    const formattedFiatTokensLeft = computed(() => getFiatAmountByFPNumber(tokensLeft.value, burnedAsset.value));
    const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value, burnedAsset.value.decimals));
    const isZeroAmount = computed(() => asZeroValue(value.value));
    const isAmountLessThanMin = computed(() => Number(value.value || ZeroStringValue) < min.value);
    const isInsufficientBalance = computed(
      () => xorBalance.value.sub(willBeBurned.value).sub(fpNetworkFee.value).isLtZero()
    );
    const isBurnDisabled = computed(
      () => loading.value || isZeroAmount.value || isAmountLessThanMin.value || isInsufficientBalance.value
    );
    const instance = getCurrentInstance();
    function handleInputField(newValue) {
      if (value.value === newValue) return;
      value.value = newValue;
    }
    async function handleConfirmBurn() {
      if (isInsufficientBalance.value) {
        instance?.proxy?.$alert?.(t("insufficientBalanceText", { tokenSymbol: burnedAsset.value.symbol }), {
          title: t("errorText")
        });
        emit("confirm");
      } else {
        try {
          await withNotifications(async () => {
            await api.assets.burn(burnedAsset.value, willBeBurned.value.toString());
          });
          emit("confirm", true);
        } catch (error) {
          console.error(error);
          emit("confirm");
        }
      }
      isVisible.value = false;
    }
    watch(isVisible, async (dialogVisible) => {
      await nextTick();
      if (dialogVisible) {
        value.value = "";
      }
    });
    return (_ctx, _cache) => {
      const _component_token_input = resolveComponent("token-input");
      const _component_info_line = resolveComponent("info-line");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event),
        title: title.value,
        "custom-class": "dialog--confirm-burn"
      }, {
        footer: withCtx(() => [
          createVNode(_component_s_button, {
            type: "primary",
            class: "s-typography-button--large",
            disabled: isBurnDisabled.value,
            onClick: handleConfirmBurn
          }, {
            default: withCtx(() => [
              isZeroAmount.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                createTextVNode(toDisplayString(unref(t)("buttons.enterAmount")), 1)
              ], 64)) : isAmountLessThanMin.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                createTextVNode("NEED TO RESERVE MORE THAN " + toDisplayString(unref(min)), 1)
              ], 64)) : isInsufficientBalance.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                createTextVNode(toDisplayString(unref(t)("insufficientBalanceText", { tokenSymbol: unref(burnedAsset).symbol })), 1)
              ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 3 }, [
                createTextVNode("RESERVE")
              ], 64))
            ]),
            _: 1
          }, 8, ["disabled"])
        ]),
        default: withCtx(() => [
          createVNode(_component_token_input, {
            class: "token-input",
            max: unref(max),
            title: receivedPlaceholder.value,
            "is-fiat-editable": false,
            token: unref(receivedAsset),
            "model-value": value.value,
            "onUpdate:modelValue": handleInputField
          }, null, 8, ["max", "title", "token", "model-value"]),
          (openBlock(), createBlock(_component_info_line, {
            label: toBeBurnedLabel.value,
            key: toBeBurnedKey.value,
            value: formattedWillBeBurned.value,
            "asset-symbol": unref(burnedAsset).symbol,
            "fiat-value": formattedFiatWillBeBurned.value,
            "is-formatted": ""
          }, null, 8, ["label", "value", "asset-symbol", "fiat-value"])),
          (openBlock(), createBlock(_component_info_line, {
            label: yourBalanceLeftLabel.value,
            key: yourBalanceLeftKey.value,
            value: formattedTokensLeft.value,
            "asset-symbol": unref(burnedAsset).symbol,
            "fiat-value": formattedFiatTokensLeft.value,
            "is-formatted": "",
            "value-can-be-hidden": ""
          }, null, 8, ["label", "value", "asset-symbol", "fiat-value"])),
          isLoggedIn.value ? (openBlock(), createBlock(_component_info_line, {
            key: 0,
            label: unref(t)("networkFeeText"),
            "label-tooltip": unref(t)("networkFeeTooltipText"),
            value: networkFeeFormatted.value,
            "asset-symbol": unref(xor).symbol,
            "fiat-value": unref(getFiatAmountByCodecString)(networkFee.value),
            "is-formatted": ""
          }, null, 8, ["label", "label-tooltip", "value", "asset-symbol", "fiat-value"])) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("p", _hoisted_2, " Disclaimer: Burning your " + toDisplayString(unref(burnedAsset).symbol) + " tokens is an irreversible action that permanently removes them from your wallet. Please proceed with caution and ensure you fully understand the implications of this transaction ", 1),
            createBaseVNode("div", _hoisted_3, [
              createVNode(_component_s_icon, {
                class: "disclaimer__icon",
                name: "notifications-alert-triangle-24",
                size: "24"
              })
            ])
          ])
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const BurnDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-dbb23248"]]);
export {
  BurnDialog as default
};
