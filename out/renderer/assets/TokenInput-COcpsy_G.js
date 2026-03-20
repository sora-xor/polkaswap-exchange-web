import { z as defineComponent, aZ as components, ak as lazyComponent, u as useTranslation, v as useWalletStore, aA as watch, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, aJ as renderSlot, D as createBaseVNode, A as createElementBlock, aM as createCommentVNode, h as computed, ap as createVNode, a9 as ref, aN as toDisplayString, as as mergeProps, aq as withModifiers, aO as createTextVNode, aj as unref, bQ as Fragment, F as FPNumber, al as Components, Z as ZeroStringValue, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
const _hoisted_1 = { class: "input-line" };
const _hoisted_2 = { class: "input-title" };
const _hoisted_3 = { class: "input-title--uppercase input-title--primary" };
const _hoisted_4 = { class: "input-value" };
const _hoisted_5 = { class: "input-value--uppercase" };
const _hoisted_6 = { class: "s-flex el-buttons" };
const _hoisted_7 = { class: "input-line input-line--footer" };
const _hoisted_8 = {
  key: 0,
  class: "s-flex"
};
const _hoisted_9 = { class: "input-prefix" };
const _hoisted_10 = {
  key: 0,
  class: "input-line--footer-with-slider"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "TokenInput",
    components: {
      TokenSelectButton: lazyComponent(Components.TokenSelectButton),
      FormattedAmount: components.FormattedAmount,
      FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
      TokenAddress: components.TokenAddress
    }
  },
  __name: "TokenInput",
  props: {
    modelValue: { default: void 0 },
    max: {},
    token: { default: null },
    balance: { default: null },
    title: { default: "" },
    balanceText: { default: "" },
    external: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    isMaxAvailable: { type: Boolean, default: false },
    isSelectAvailable: { type: Boolean, default: false },
    withSlider: { type: Boolean, default: false },
    isFiatEditable: { type: Boolean, default: true },
    sliderValue: { default: 0 },
    fiatDecimals: { default: 2 },
    withAddress: { type: Boolean, default: false },
    withoutFiat: { type: Boolean, default: false }
  },
  emits: ["update:modelValue", "max", "select", "slide", "focus"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const floatInput = ref(null);
    const fiatEl = ref(null);
    const fiatValue = ref("");
    const fiatFocus = ref(false);
    const delimiters = FPNumber.DELIMITERS_CONFIG;
    const { t } = useTranslation();
    const formattedAmount = useFormattedAmount();
    const walletStore = useWalletStore();
    const currencySymbol = computed(() => walletStore.currencySymbol ?? "");
    const exchangeRate = computed(() => walletStore.exchangeRate ?? 1);
    const currency = computed(() => walletStore.currency ?? null);
    const currentValue = computed(() => props.modelValue ?? "");
    const decimals = computed(() => {
      const token = props.token;
      if (!token) return FPNumber.DEFAULT_PRECISION;
      const tokenDecimals = props.external ? token.externalDecimals : token.decimals;
      return tokenDecimals ?? FPNumber.DEFAULT_PRECISION;
    });
    const tokenPrice = computed(() => {
      const token = props.token;
      if (!token) return FPNumber.ZERO;
      const price = formattedAmount.getAssetFiatPrice(token);
      return price ? FPNumber.fromCodecValue(price) : FPNumber.ZERO;
    });
    const hasFiatValue = computed(() => !(props.withoutFiat || tokenPrice.value.isZero()));
    const fpBalance = computed(
      () => formattedAmount.getFPNumberFromCodec(props.balance ?? ZeroStringValue, decimals.value)
    );
    const formattedBalance = computed(() => fpBalance.value.toLocaleString());
    const formattedFiatBalance = computed(() => fpBalance.value.mul(tokenPrice.value).toLocaleString());
    const isBalanceAvailable = computed(() => Boolean(props.balance && props.token));
    const addressData = computed(() => {
      if (!props.token) return null;
      return {
        ...props.token,
        address: typeof props.token.address === "string" ? props.token.address : "",
        externalAddress: typeof props.token.externalAddress === "string" ? props.token.externalAddress : ""
      };
    });
    const hasFormattedAddress = computed(() => {
      const target = addressData.value;
      if (!target) return false;
      const address = props.external ? target.externalAddress : target.address;
      return Boolean(address);
    });
    const maxValue = computed(() => props.max ?? formattedAmount.MaxInputNumber);
    const calcFiatAmount = (amount) => {
      if (!amount) return FPNumber.ZERO;
      const tokenRate = tokenPrice.value.mul(exchangeRate.value);
      return new FPNumber(amount).mul(tokenRate);
    };
    const maxFiatValue = computed(() => calcFiatAmount(maxValue.value));
    const maxFiatValueFormatted = computed(() => maxFiatValue.value.toString());
    const fiatAmount = computed(() => calcFiatAmount(currentValue.value));
    const slideValue = computed(() => props.sliderValue);
    const setFiatValue = (value) => {
      fiatValue.value = value === maxFiatValueFormatted.value ? maxFiatValue.value.toFixed(props.fiatDecimals) : value;
      recalcValue(value);
    };
    const recalcValue = (value) => {
      const result = !tokenPrice.value.isZero() && value ? new FPNumber(value).div(exchangeRate.value).div(tokenPrice.value).toString() : "";
      emit("update:modelValue", result);
    };
    const handleFiatFocus = () => {
      fiatFocus.value = true;
      emit("focus");
    };
    const handleFiatBlur = () => {
      fiatFocus.value = false;
    };
    const handleMax = () => {
      emit("max", props.token ?? null);
    };
    const handleMainInput = (value) => {
      emit("update:modelValue", value);
    };
    const handleMainFocus = () => {
      emit("focus");
    };
    const handleSelectToken = () => {
      emit("select");
    };
    const handleSlideInputChange = (value) => {
      emit("slide", value);
    };
    const handleSlideClick = () => {
      fiatEl.value?.$children?.[0]?.blur?.();
    };
    const focus = () => {
      floatInput.value?.inputComponent?.focus?.();
    };
    __expose({
      focus
    });
    watch(
      fiatAmount,
      (amount) => {
        if (fiatFocus.value) return;
        fiatValue.value = amount.isZero() ? "" : amount.toFixed(props.fiatDecimals);
      },
      { immediate: true }
    );
    watch(
      currency,
      () => {
        setFiatValue(fiatValue.value);
      },
      { immediate: true }
    );
    return (_ctx, _cache) => {
      const _component_formatted_amount_with_fiat_value = resolveComponent("formatted-amount-with-fiat-value");
      const _component_s_button = resolveComponent("s-button");
      const _component_token_select_button = resolveComponent("token-select-button");
      const _component_s_float_input = resolveComponent("s-float-input");
      const _component_token_address = resolveComponent("token-address");
      const _component_s_slider = resolveComponent("s-slider");
      return openBlock(), createBlock(_component_s_float_input, mergeProps({
        class: "token-input",
        size: "medium",
        ref_key: "floatInput",
        ref: floatInput,
        "has-locale-string": "",
        disabled: __props.disabled,
        value: currentValue.value,
        max: maxValue.value,
        decimals: decimals.value,
        delimiters: unref(delimiters)
      }, _ctx.$attrs, {
        onInput: handleMainInput,
        onFocus: handleMainFocus
      }), {
        top: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("span", _hoisted_3, toDisplayString(__props.title), 1),
              renderSlot(_ctx.$slots, "title-append", {}, void 0, true)
            ]),
            createBaseVNode("div", _hoisted_4, [
              renderSlot(_ctx.$slots, "balance", {}, () => [
                isBalanceAvailable.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createBaseVNode("span", _hoisted_5, toDisplayString(__props.balanceText || unref(t)("balanceText")), 1),
                  createVNode(_component_formatted_amount_with_fiat_value, {
                    "value-can-be-hidden": "",
                    "with-left-shift": "",
                    "value-class": "input-value--primary",
                    value: formattedBalance.value,
                    "has-fiat-value": hasFiatValue.value,
                    "fiat-value": formattedFiatBalance.value
                  }, null, 8, ["value", "has-fiat-value", "fiat-value"])
                ], 64)) : createCommentVNode("", true)
              ], true)
            ])
          ])
        ]),
        right: withCtx(() => [
          createBaseVNode("div", _hoisted_6, [
            __props.isMaxAvailable ? (openBlock(), createBlock(_component_s_button, {
              key: 0,
              class: "el-button--max s-typography-button--small",
              type: "primary",
              alternative: "",
              size: "mini",
              "border-radius": "mini",
              loading: __props.loading,
              disabled: __props.disabled,
              onClick: withModifiers(handleMax, ["stop"])
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(t)("buttons.max")), 1)
              ]),
              _: 1
            }, 8, ["loading", "disabled"])) : createCommentVNode("", true),
            __props.token || __props.isSelectAvailable ? (openBlock(), createBlock(_component_token_select_button, {
              key: 1,
              icon: "chevron-down-rounded-16",
              disabled: !__props.isSelectAvailable,
              token: __props.token,
              onClick: withModifiers(handleSelectToken, ["stop"])
            }, null, 8, ["disabled", "token"])) : createCommentVNode("", true)
          ])
        ]),
        bottom: withCtx(() => [
          renderSlot(_ctx.$slots, "bottom", {}, () => [
            createBaseVNode("div", _hoisted_7, [
              hasFiatValue.value ? (openBlock(), createElementBlock("div", _hoisted_8, [
                createVNode(_component_s_float_input, {
                  ref_key: "fiatEl",
                  ref: fiatEl,
                  class: "token-input--fiat",
                  size: "mini",
                  "has-locale-string": "",
                  decimals: 2,
                  delimiters: _ctx.$attrs.delimiters,
                  disabled: __props.disabled,
                  max: maxFiatValueFormatted.value,
                  readonly: !__props.isFiatEditable,
                  value: fiatValue.value,
                  onInput: setFiatValue,
                  onFocus: handleFiatFocus,
                  onBlur: handleFiatBlur
                }, {
                  left: withCtx(() => [
                    createBaseVNode("span", _hoisted_9, toDisplayString(currencySymbol.value), 1)
                  ]),
                  _: 1
                }, 8, ["delimiters", "disabled", "max", "readonly", "value"]),
                renderSlot(_ctx.$slots, "fiat-amount-append", {}, void 0, true)
              ])) : createCommentVNode("", true),
              __props.withAddress && hasFormattedAddress.value ? (openBlock(), createBlock(_component_token_address, mergeProps({ key: 1 }, addressData.value, {
                external: __props.external,
                class: "input-value"
              }), null, 16, ["external"])) : createCommentVNode("", true)
            ]),
            __props.withSlider ? (openBlock(), createElementBlock("div", _hoisted_10, [
              _cache[0] || (_cache[0] = createBaseVNode("div", { class: "delimiter" }, null, -1)),
              createBaseVNode("div", {
                class: "slider-container-wrapper",
                onMousedown: handleSlideClick
              }, [
                createVNode(_component_s_slider, {
                  class: "slider-container",
                  value: slideValue.value,
                  disabled: !__props.withSlider || __props.disabled,
                  "show-tooltip": false,
                  marks: { 0: "", 25: "", 50: "", 75: "", 100: "" },
                  onInput: handleSlideInputChange
                }, null, 8, ["value", "disabled"])
              ], 32)
            ])) : createCommentVNode("", true)
          ], true),
          renderSlot(_ctx.$slots, "default", {}, void 0, true)
        ]),
        _: 3
      }, 16, ["disabled", "value", "max", "decimals", "delimiters"]);
    };
  }
});
const TokenInput = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-3c44401f"]]);
export {
  TokenInput as default
};
