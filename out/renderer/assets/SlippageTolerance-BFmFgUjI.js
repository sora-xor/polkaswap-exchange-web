import { z as defineComponent, aZ as components, ak as lazyComponent, u as useTranslation, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, ao as withCtx, D as createBaseVNode, bb as normalizeClass, h as computed, aM as createCommentVNode, aj as unref, F as FPNumber, aN as toDisplayString, al as Components, x as useNumberFormatter, a9 as ref, s as store, aP as _export_sfc } from "./index-73GArslZ.js";
const DEFAULT_SLIPPAGE_TABS = ["0.1", "0.5", "1"];
function getTabName(value) {
  return `slippage-${value.replace(".", "-")}`;
}
const DEFAULT_SLIPPAGE_TABS_LIST = [...DEFAULT_SLIPPAGE_TABS];
const _hoisted_1 = { class: "slippage-tolerance-default" };
const _hoisted_2 = { class: "slippage-tolerance-custom" };
const _hoisted_3 = {
  key: 0,
  class: "slippage-tolerance_validation"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "SlippageTolerance",
    components: {
      SettingsTabs: lazyComponent(Components.SettingsTabs),
      InfoLine: components.InfoLine
    }
  },
  __name: "SlippageTolerance",
  setup(__props, { expose: __expose }) {
    const { t } = useTranslation();
    const { formatStringValue, getFPNumber } = useNumberFormatter();
    const slippageToleranceFocused = ref(false);
    const slippageToleranceOpened = ref(true);
    const delimiters = FPNumber.DELIMITERS_CONFIG;
    const slippageToleranceExtremeValues = {
      min: 0.01,
      max: 10
    };
    const slippageTolerance = computed({
      get: () => store.state.settings.slippageTolerance,
      set: (value) => {
        store.commit.settings.setSlippageTolerance(value);
      }
    });
    const transactionDeadline = computed({
      get: () => store.state.settings.transactionDeadline,
      set: (value) => {
        store.commit.settings.setTransactionDeadline(value);
      }
    });
    const slippageToleranceTabs = computed(
      () => DEFAULT_SLIPPAGE_TABS_LIST.map((value) => ({
        name: getTabName(value),
        label: `${formatStringValue(value)}%`
      }))
    );
    const selectedSlippageTab = computed(() => {
      const match = DEFAULT_SLIPPAGE_TABS_LIST.find((value) => value === slippageTolerance.value);
      return match ? getTabName(match) : "";
    });
    const localeFormattedSlippageTolerance = computed(() => `${formatStringValue(slippageTolerance.value)}%`);
    const customSlippageTolerance = computed({
      get: () => {
        const suffix = slippageToleranceFocused.value ? "" : "%";
        return `${slippageTolerance.value}${suffix}`;
      },
      set: (value) => {
        const prepared = prepareInputValue(value);
        slippageTolerance.value = prepared;
      }
    });
    const slippageToleranceValidation = computed(() => {
      const tolerance = Number(slippageTolerance.value);
      if (tolerance >= slippageToleranceExtremeValues.min && tolerance <= 0.1) {
        return "warning";
      }
      if (tolerance >= 5 && tolerance <= slippageToleranceExtremeValues.max) {
        return "frontrun";
      }
      if (isErrorValue.value) {
        return "error";
      }
      return "";
    });
    const isErrorValue = computed(() => {
      const tolerance = Number(slippageTolerance.value);
      return tolerance < slippageToleranceExtremeValues.min || tolerance > slippageToleranceExtremeValues.max;
    });
    const slippageToleranceClasses = computed(() => {
      const defaultClass = "slippage-tolerance";
      const classes = [defaultClass, "s-flex"];
      if (slippageToleranceValidation.value) {
        classes.push(
          `${defaultClass}--${slippageToleranceValidation.value === "frontrun" ? "warning" : slippageToleranceValidation.value}`
        );
      }
      return classes.join(" ");
    });
    const computedClasses = computed(() => slippageToleranceOpened.value ? "is-collapsed" : "");
    function selectTab(name) {
      const match = DEFAULT_SLIPPAGE_TABS_LIST.find((value) => getTabName(value) === name);
      if (match) {
        slippageTolerance.value = match;
      }
    }
    function prepareInputValue(value) {
      let sanitized = value.replace("%", "");
      if (sanitized.length && sanitized.startsWith("0") && sanitized[1] === "0") {
        sanitized = sanitized.replace(/^0+(?=\d)/, "");
      }
      return sanitized;
    }
    function handleSlippageToleranceOnBlur() {
      let value = slippageTolerance.value;
      if (FPNumber.lt(getFPNumber(value), getFPNumber(slippageToleranceExtremeValues.min))) {
        value = `${slippageToleranceExtremeValues.min}`;
      }
      slippageTolerance.value = value;
      slippageToleranceFocused.value = false;
    }
    function handleSlippageToleranceOnFocus() {
      slippageToleranceFocused.value = true;
    }
    function handleSetTransactionDeadline(value) {
      transactionDeadline.value = value;
    }
    function handleCollapseChange() {
      slippageToleranceOpened.value = !slippageToleranceOpened.value;
    }
    __expose({
      selectTab,
      handleSlippageToleranceOnBlur,
      handleSlippageToleranceOnFocus,
      handleSetTransactionDeadline,
      handleCollapseChange
    });
    return (_ctx, _cache) => {
      const _component_info_line = resolveComponent("info-line");
      const _component_settings_tabs = resolveComponent("settings-tabs");
      const _component_s_float_input = resolveComponent("s-float-input");
      const _component_s_collapse_item = resolveComponent("s-collapse-item");
      const _component_s_collapse = resolveComponent("s-collapse");
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["slippage-tolerance", computedClasses.value])
      }, [
        createVNode(_component_s_collapse, { onChange: handleCollapseChange }, {
          default: withCtx(() => [
            createVNode(_component_s_collapse_item, null, {
              title: withCtx(() => [
                createVNode(_component_info_line, {
                  label: unref(t)("dexSettings.slippageTolerance"),
                  "label-tooltip": unref(t)("dexSettings.slippageToleranceHint"),
                  value: localeFormattedSlippageTolerance.value
                }, null, 8, ["label", "label-tooltip", "value"])
              ]),
              default: withCtx(() => [
                createBaseVNode("div", {
                  class: normalizeClass(slippageToleranceClasses.value)
                }, [
                  createBaseVNode("div", _hoisted_1, [
                    createVNode(_component_settings_tabs, {
                      value: selectedSlippageTab.value,
                      tabs: slippageToleranceTabs.value,
                      onInput: selectTab
                    }, null, 8, ["value", "tabs"])
                  ]),
                  createBaseVNode("div", _hoisted_2, [
                    createVNode(_component_s_float_input, {
                      class: "slippage-tolerance-custom_input",
                      size: "small",
                      decimals: 2,
                      "has-locale-string": "",
                      delimiters: unref(delimiters),
                      max: slippageToleranceExtremeValues.max,
                      modelValue: customSlippageTolerance.value,
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => customSlippageTolerance.value = $event),
                      onBlur: handleSlippageToleranceOnBlur,
                      onFocus: handleSlippageToleranceOnFocus
                    }, null, 8, ["delimiters", "max", "modelValue"])
                  ]),
                  slippageToleranceValidation.value ? (openBlock(), createElementBlock("div", _hoisted_3, toDisplayString(unref(t)(`dexSettings.slippageToleranceValidation.${slippageToleranceValidation.value}`)), 1)) : createCommentVNode("", true)
                ], 2)
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ], 2);
    };
  }
});
const SlippageTolerance = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-cd5d6e54"]]);
export {
  SlippageTolerance as default
};
