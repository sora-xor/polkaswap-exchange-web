import { z as defineComponent, c5 as FontWeightRate, c7 as FontSizeRate, A as createElementBlock, aM as createCommentVNode, h as computed, C as openBlock, D as createBaseVNode, aJ as renderSlot, aO as createTextVNode, aN as toDisplayString, aj as unref, c8 as HiddenValue, a9 as ref, bb as normalizeClass, c9 as getCurrency, ca as DaiCurrency, cb as store, cc as Currency, X as XOR, F as FPNumber, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = {
  key: 0,
  class: "formatted-amount__prefix"
};
const _hoisted_2 = {
  key: 1,
  class: "formatted-amount__integer"
};
const _hoisted_3 = {
  key: 2,
  class: "formatted-amount__decimal"
};
const _hoisted_4 = { class: "formatted-amount__decimal-value" };
const _hoisted_5 = {
  key: 0,
  class: "formatted-amount__symbol"
};
const _hoisted_6 = {
  key: 3,
  class: "formatted-amount__symbol"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "FormattedAmount",
  props: {
    value: { default: "" },
    fontSizeRate: { default: FontSizeRate.NORMAL },
    fontWeightRate: { default: FontWeightRate.NORMAL },
    assetSymbol: { default: "" },
    symbolAsDecimal: { type: Boolean, default: false },
    isFiatValue: { type: Boolean, default: false },
    fiatDefaultRounding: { type: Boolean, default: false },
    valueCanBeHidden: { type: Boolean, default: false },
    integerOnly: { type: Boolean, default: false },
    withLeftShift: { type: Boolean, default: false },
    customizableCurrency: { default: "" }
  },
  setup(__props) {
    const props = __props;
    const parent = ref(null);
    const child = ref(null);
    const isValueWider = ref(false);
    const shouldBalanceBeHidden = computed(() => store.state.wallet.settings.shouldBalanceBeHidden ?? false);
    const fiatExchangeRateObject = computed(() => store.state.wallet.settings.fiatExchangeRateObject ?? {});
    const fiatPriceObject = computed(() => store.state.wallet.account.fiatPriceObject ?? {});
    const symbol = computed(() => {
      if (props.customizableCurrency) {
        return getCurrency(props.customizableCurrency)?.symbol ?? DaiCurrency.symbol;
      }
      const currency = store.state.wallet.settings.currency ?? Currency.DAI;
      return getCurrency(currency)?.symbol ?? DaiCurrency.symbol;
    });
    const exchangeRate = computed(() => {
      const currency = store.state.wallet.settings.currency ?? Currency.DAI;
      if (currency === Currency.XOR) {
        const xorPriceCodec = fiatPriceObject.value[XOR.address];
        const xorPrice = FPNumber.fromCodecValue(xorPriceCodec);
        return xorPrice.isGtZero() ? FPNumber.ONE.div(xorPrice).toNumber() : 1;
      }
      return fiatExchangeRateObject.value?.[currency] ?? 1;
    });
    const normalizedValue = computed(() => {
      if (props.value === null || props.value === void 0) {
        return "";
      }
      if (typeof props.value === "string") {
        return props.value;
      }
      return String(props.value);
    });
    const hasDisplayableValue = computed(() => {
      if (typeof props.value === "number") {
        return !Number.isNaN(props.value) && props.value !== 0;
      }
      return normalizedValue.value.trim().length > 0;
    });
    const unformatted = computed(
      () => normalizedValue.value.replaceAll(FPNumber.DELIMITERS_CONFIG.thousand, "").replace(FPNumber.DELIMITERS_CONFIG.decimal, ".")
    );
    const isFiniteValue = computed(() => {
      if (+normalizedValue.value !== Infinity) {
        return Number.isFinite(+unformatted.value);
      }
      return false;
    });
    const shouldRender = computed(() => hasDisplayableValue.value && isFiniteValue.value);
    function formatFiatDecimal(integer, decimal) {
      if (!decimal || !+decimal) {
        return "00";
      }
      if (decimal.length <= 2) {
        return decimal.length === 1 ? `${decimal}0` : decimal;
      }
      const isSmallNumber = (!integer || !+integer) && decimal.startsWith("00");
      if (isSmallNumber && props.fiatDefaultRounding) {
        return decimal;
      }
      return decimal.length === 1 ? `${decimal}0` : decimal.substring(0, 2);
    }
    const formatted = computed(() => {
      if (!shouldRender.value) {
        return {
          integer: "",
          decimal: ""
        };
      }
      let value = normalizedValue.value;
      if (props.isFiatValue) {
        let coefficient = exchangeRate.value;
        if (props.customizableCurrency) {
          if (props.customizableCurrency !== Currency.XOR) {
            coefficient = fiatExchangeRateObject.value?.[props.customizableCurrency] ?? 1;
          } else {
            const xorPriceCodec = fiatPriceObject.value[XOR.address];
            const xorPrice = FPNumber.fromCodecValue(xorPriceCodec);
            coefficient = xorPrice.isGtZero() ? FPNumber.ONE.div(xorPrice).toNumber() : 1;
          }
        }
        value = new FPNumber(unformatted.value).mul(coefficient).toLocaleString();
      }
      let [integer, decimal] = value.split(FPNumber.DELIMITERS_CONFIG.decimal);
      if (!props.integerOnly) {
        if (props.isFiatValue) {
          decimal = formatFiatDecimal(integer, decimal);
        }
        decimal = decimal ? FPNumber.DELIMITERS_CONFIG.decimal + decimal : `${FPNumber.DELIMITERS_CONFIG.decimal}0`;
      }
      return {
        integer,
        decimal
      };
    });
    const isHiddenValue = computed(() => props.valueCanBeHidden && shouldBalanceBeHidden.value);
    const computedClasses = computed(() => {
      const baseClass = "formatted-amount";
      const classes = [baseClass];
      if (props.fontSizeRate !== FontSizeRate.NORMAL) {
        classes.push(`${baseClass}--font-size-${props.fontSizeRate}`);
      }
      if (props.fontWeightRate !== FontWeightRate.NORMAL) {
        classes.push(`${baseClass}--font-weight-${props.fontWeightRate}`);
      }
      if (props.assetSymbol && props.symbolAsDecimal) {
        classes.push(`${baseClass}--symbol-as-decimal`);
      }
      if (props.isFiatValue) {
        classes.push(`${baseClass}--fiat-value`);
      }
      if (props.withLeftShift) {
        classes.push(`${baseClass}--shifted`);
      }
      if (isValueWider.value) {
        classes.push(`${baseClass}--value-wider`);
      }
      return classes.join(" ");
    });
    function checkWiderFlag() {
      const parentEl = parent.value;
      const childEl = child.value;
      if (!parentEl || !childEl) return;
      if (childEl.offsetWidth > parentEl.offsetWidth) {
        isValueWider.value = true;
      }
    }
    function resetWiderFlag() {
      isValueWider.value = false;
    }
    return (_ctx, _cache) => {
      return shouldRender.value ? (openBlock(), createElementBlock("span", {
        key: 0,
        ref_key: "parent",
        ref: parent,
        class: normalizeClass(computedClasses.value),
        onMouseenter: checkWiderFlag,
        onMouseleave: resetWiderFlag,
        onTouchstart: checkWiderFlag,
        onTouchend: resetWiderFlag
      }, [
        createBaseVNode("span", {
          ref_key: "child",
          ref: child,
          class: "formatted-amount__value"
        }, [
          !isHiddenValue.value && (__props.isFiatValue || _ctx.$slots.prefix || __props.customizableCurrency) ? (openBlock(), createElementBlock("span", _hoisted_1, [
            renderSlot(_ctx.$slots, "prefix", {}, () => [
              createTextVNode(toDisplayString(symbol.value), 1)
            ], true)
          ])) : createCommentVNode("", true),
          !isHiddenValue.value || isHiddenValue.value && __props.integerOnly ? (openBlock(), createElementBlock("span", _hoisted_2, toDisplayString(isHiddenValue.value ? unref(HiddenValue) : formatted.value.integer), 1)) : createCommentVNode("", true),
          !__props.integerOnly ? (openBlock(), createElementBlock("span", _hoisted_3, [
            createBaseVNode("span", _hoisted_4, toDisplayString(isHiddenValue.value ? unref(HiddenValue) : formatted.value.decimal), 1),
            __props.assetSymbol && __props.symbolAsDecimal ? (openBlock(), createElementBlock("span", _hoisted_5, toDisplayString(__props.assetSymbol), 1)) : createCommentVNode("", true)
          ])) : createCommentVNode("", true),
          __props.assetSymbol && !__props.symbolAsDecimal ? (openBlock(), createElementBlock("span", _hoisted_6, toDisplayString(__props.assetSymbol), 1)) : createCommentVNode("", true),
          renderSlot(_ctx.$slots, "default", {}, void 0, true)
        ], 512)
      ], 34)) : createCommentVNode("", true);
    };
  }
});
const FormattedAmount = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-1f7469de"]]);
export {
  FormattedAmount as default
};
