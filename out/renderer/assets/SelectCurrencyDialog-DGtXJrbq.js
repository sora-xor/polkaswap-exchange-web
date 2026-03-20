import { z as defineComponent, aZ as components, u as useTranslation, e as useSettingsStore, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aj as unref, a9 as ref, h as computed, A as createElementBlock, bQ as Fragment, bP as renderList, D as createBaseVNode, aN as toDisplayString, b5 as nextTick, s as store, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "select-currency-item__value" };
const _hoisted_2 = { class: "select-currency-item__name" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "SelectCurrencyDialog",
    components: {
      DialogBase: components.DialogBase,
      SearchInput: components.SearchInput
    }
  },
  __name: "SelectCurrencyDialog",
  setup(__props) {
    const { t } = useTranslation();
    const settingsStore = useSettingsStore();
    const query = ref("");
    const selectedEl = ref(null);
    const isVisible = computed({
      get: () => settingsStore.selectCurrencyDialogVisibility,
      set: (flag) => {
        settingsStore.setSelectCurrencyDialogVisibility(flag);
        if (flag) {
          nextTick(() => selectedEl.value?.scrollIntoView({ behavior: "smooth" }));
        }
      }
    });
    const selectedCurrency = computed({
      get: () => store.state.wallet.settings.currency,
      set: (value) => {
        store.commit.wallet.settings.setFiatCurrency(value);
      }
    });
    const currencies = computed(() => store.state.wallet.settings.currencies);
    const filteredCurrencies = computed(() => {
      const rawQuery = query.value.toLowerCase().trim();
      if (!rawQuery) return currencies.value;
      return currencies.value.filter(
        (item) => item.name.toLowerCase().includes(rawQuery) || item.symbol.toLowerCase().includes(rawQuery) || item.key.toLowerCase().includes(rawQuery)
      );
    });
    function handleClearSearch() {
      query.value = "";
    }
    function setSelectedEl(element, isSelected) {
      if (isSelected) {
        selectedEl.value = element;
      } else if (selectedEl.value === element) {
        selectedEl.value = null;
      }
    }
    return (_ctx, _cache) => {
      const _component_search_input = resolveComponent("search-input");
      const _component_s_radio = resolveComponent("s-radio");
      const _component_s_radio_group = resolveComponent("s-radio-group");
      const _component_s_scrollbar = resolveComponent("s-scrollbar");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: isVisible.value,
        "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => isVisible.value = $event),
        title: unref(t)("currencyDialog.currency"),
        class: "select-currency-dialog"
      }, {
        default: withCtx(() => [
          createVNode(_component_search_input, {
            ref: "search",
            modelValue: query.value,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => query.value = $event),
            class: "select-currency__search",
            autofocus: "",
            placeholder: unref(t)("currencyDialog.searchPlaceholder"),
            onClear: handleClearSearch
          }, null, 8, ["modelValue", "placeholder"]),
          createVNode(_component_s_scrollbar, { class: "select-currency-scrollbar" }, {
            default: withCtx(() => [
              createVNode(_component_s_radio_group, {
                modelValue: selectedCurrency.value,
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => selectedCurrency.value = $event),
                class: "select-currency-list s-flex"
              }, {
                default: withCtx(() => [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(filteredCurrencies.value, (currency) => {
                    return openBlock(), createBlock(_component_s_radio, {
                      key: currency.key,
                      label: currency.key,
                      value: currency.key,
                      disabled: currency.disabled,
                      size: "medium",
                      class: "select-currency-list__item s-flex"
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("div", {
                          ref_for: true,
                          ref: (el) => setSelectedEl(el, currency.key === selectedCurrency.value),
                          class: "select-currency-item s-flex"
                        }, [
                          createBaseVNode("div", _hoisted_1, toDisplayString(currency.name), 1),
                          createBaseVNode("div", _hoisted_2, toDisplayString(currency.symbol), 1)
                        ], 512)
                      ]),
                      _: 2
                    }, 1032, ["label", "value", "disabled"]);
                  }), 128))
                ]),
                _: 1
              }, 8, ["modelValue"])
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
const SelectCurrencyDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-5caeb339"]]);
export {
  SelectCurrencyDialog as default
};
