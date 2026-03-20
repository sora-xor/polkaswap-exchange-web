import { z as defineComponent, aZ as components, u as useTranslation, c3 as useNotification, s as store, a9 as ref, aA as watch, a4 as onMounted, h as computed, a_ as resolveComponent, A as createElementBlock, C as openBlock, D as createBaseVNode, ap as createVNode, aN as toDisplayString, aj as unref, ao as withCtx, bQ as Fragment, bP as renderList, am as createBlock, aM as createCommentVNode, cn as reactive, aq as withModifiers, aO as createTextVNode, bb as normalizeClass, bH as normalizeProps, bI as guardReactiveProps, F as FPNumber, cD as showMostFittingValue, Z as ZeroStringValue, bq as calcPriceChange, aI as WALLET_CONSTS } from "./index-73GArslZ.js";
import { a as AlertTypeTabs, A as AlertFrequencyTabs } from "./tabs-xjDSPYBb.js";
const _hoisted_1 = { class: "setup-price-alert" };
const _hoisted_2 = { class: "setup-price-alert__title" };
const _hoisted_3 = {
  key: 0,
  slot: "left",
  class: "price-input__prefix"
};
const _hoisted_4 = {
  class: "price-input-inner",
  slot: "top"
};
const _hoisted_5 = { class: "price-input-inner-ratio" };
const _hoisted_6 = { class: "price-input-current-title" };
const _hoisted_7 = {
  class: "info",
  slot: "bottom"
};
const _hoisted_8 = { class: "delta-percent" };
const _hoisted_9 = { class: "setup-price-alert__title" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      TokenLogo: components.TokenLogo,
      FormattedAmount: components.FormattedAmount,
      FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
      TokenAddress: components.TokenAddress,
      TokenSelectButton: components.TokenSelectButton
    }
  },
  __name: "CreateAlert",
  props: {
    alertToEdit: {}
  },
  emits: ["back", "open-select-token", "select-asset"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const props = __props;
    const { t } = useTranslation();
    const { showAppNotification } = useNotification();
    const alerts = computed(() => store.state.wallet.settings.alerts);
    const whitelistIdsBySymbol = computed(() => store.getters.wallet.account.whitelistIdsBySymbol);
    const getAsset = store.getters.assets.assetDataByAddress;
    const xor = computed(() => store.getters.assets.xor);
    const floatInput = ref();
    const amount = ref("");
    const asset = reactive({});
    const autoChoice = ref(true);
    const currentTypeTab = ref(AlertTypeTabs.Drop);
    const currentFrequencyTab = ref(AlertFrequencyTabs.Once);
    const loading = ref(false);
    const delimiters = FPNumber.DELIMITERS_CONFIG;
    const assetPrice = computed(() => FPNumber.fromCodecValue(getAssetFiatPrice(asset) ?? ZeroStringValue));
    const priceChange = computed(() => {
      const price = FPNumber.fromNatural(amount.value || "0");
      const desired = price.isZero() ? assetPrice.value : price;
      return calcPriceChange(desired, assetPrice.value);
    });
    const negativeDelta = computed(() => FPNumber.lt(priceChange.value, FPNumber.ZERO));
    const deltaPercentage = computed(() => {
      const value = negativeDelta.value ? priceChange.value.negative() : priceChange.value;
      return showMostFittingValue(value);
    });
    const placeholder = computed(() => showMostFittingValue(assetPrice.value));
    const fiatAmountValue = computed(() => assetPrice.value.toLocaleString());
    const btnDisabled = computed(() => !amount.value);
    const isEditMode = computed(() => props.alertToEdit !== null);
    watch(
      negativeDelta,
      (value) => {
        if (autoChoice.value) {
          currentTypeTab.value = value ? AlertTypeTabs.Drop : AlertTypeTabs.Raise;
        }
        autoChoice.value = true;
      },
      { immediate: false }
    );
    function activeSignClass(sign) {
      if (sign === "+" && negativeDelta.value) return "delta-percent--not-active";
      if (sign === "-" && !negativeDelta.value) return "delta-percent--not-active";
      return "";
    }
    function handleTabClick() {
      autoChoice.value = false;
    }
    function handleAlertCreation() {
      if (!amount.value) {
        showAppNotification(t("alerts.noAmount"), "error");
        return;
      }
      loading.value = true;
      try {
        const desiredPrice = FPNumber.fromNatural(amount.value);
        const currentPrice = FPNumber.fromNatural(fiatAmountValue.value);
        let wasNotified = false;
        if (currentTypeTab.value === AlertTypeTabs.Drop && FPNumber.lt(currentPrice, desiredPrice)) {
          wasNotified = true;
        }
        if (currentTypeTab.value === AlertTypeTabs.Raise && FPNumber.gt(currentPrice, desiredPrice)) {
          wasNotified = true;
        }
        if (isEditMode.value && props.alertToEdit) {
          store.commit.wallet.settings.editPriceAlert({
            alert: {
              token: asset.symbol,
              price: amount.value,
              type: currentTypeTab.value,
              once: currentFrequencyTab.value === AlertFrequencyTabs.Once,
              wasNotified
            },
            position: props.alertToEdit.position
          });
          emit("back");
          return;
        }
        if (alerts.value.length >= WALLET_CONSTS.MAX_ALERTS_NUMBER) {
          showAppNotification(t("alerts.limitReached"), "error");
          return;
        }
        store.commit.wallet.settings.addPriceAlert({
          token: asset.symbol,
          price: amount.value,
          type: currentTypeTab.value,
          once: currentFrequencyTab.value === AlertFrequencyTabs.Once,
          wasNotified
        });
        emit("back");
      } finally {
        loading.value = false;
      }
    }
    function openSelectAssetDialog() {
      emit("open-select-token");
    }
    function setAsset(selectedAsset) {
      if (!selectedAsset) return;
      Object.assign(asset, selectedAsset);
      emit("select-asset", selectedAsset);
    }
    function getAssetFiatPrice(currentAsset) {
      if (!currentAsset) return null;
      return store.state.wallet.account.fiatPriceObject?.[currentAsset.address] ?? null;
    }
    onMounted(() => {
      if (isEditMode.value && props.alertToEdit) {
        amount.value = props.alertToEdit.price;
        currentTypeTab.value = props.alertToEdit.type === "drop" ? AlertTypeTabs.Drop : AlertTypeTabs.Raise;
        currentFrequencyTab.value = props.alertToEdit.once ? AlertFrequencyTabs.Once : AlertFrequencyTabs.Always;
        setAsset(getAsset(whitelistIdsBySymbol.value[props.alertToEdit.token]));
      } else {
        amount.value = "";
        currentTypeTab.value = AlertTypeTabs.Drop;
        currentFrequencyTab.value = AlertFrequencyTabs.Once;
        setAsset(xor.value);
      }
      floatInput.value?.$children?.[0]?.focus?.();
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_tooltip = resolveComponent("s-tooltip");
      const _component_s_tab = resolveComponent("s-tab");
      const _component_s_tabs = resolveComponent("s-tabs");
      const _component_formatted_amount_with_fiat_value = resolveComponent("formatted-amount-with-fiat-value");
      const _component_token_select_button = resolveComponent("token-select-button");
      const _component_token_address = resolveComponent("token-address");
      const _component_s_float_input = resolveComponent("s-float-input");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("span", _hoisted_2, toDisplayString(unref(t)("alerts.alertTypeTitle")), 1),
        createVNode(_component_s_tooltip, {
          slot: "suffix",
          "border-radius": "mini",
          content: unref(t)("alerts.typeTooltip"),
          placement: "top",
          tabindex: "-1"
        }, {
          default: withCtx(() => [
            createVNode(_component_s_icon, {
              name: "info-16",
              size: "14px"
            })
          ]),
          _: 1
        }, 8, ["content"]),
        createVNode(_component_s_tabs, {
          class: "setup-price-alert__tab",
          modelValue: currentTypeTab.value,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => currentTypeTab.value = $event),
          type: "rounded",
          onClick: handleTabClick
        }, {
          default: withCtx(() => [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(AlertTypeTabs), (tab) => {
              return openBlock(), createBlock(_component_s_tab, {
                key: tab,
                label: unref(t)(`alerts.${tab}`),
                name: tab
              }, null, 8, ["label", "name"]);
            }), 128))
          ]),
          _: 1
        }, 8, ["modelValue"]),
        createVNode(_component_s_float_input, {
          ref_key: "floatInput",
          ref: floatInput,
          modelValue: amount.value,
          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => amount.value = $event),
          class: "price-input",
          size: "medium",
          "has-locale-string": "",
          delimiters: unref(delimiters),
          decimals: asset.decimals,
          placeholder: `$${placeholder.value}`,
          maxlength: 9
        }, {
          default: withCtx(() => [
            amount.value ? (openBlock(), createElementBlock("div", _hoisted_3, "$")) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_4, [
              createBaseVNode("div", null, toDisplayString(`${asset.symbol} ${unref(t)("priceText")}`), 1),
              createBaseVNode("div", _hoisted_5, [
                createBaseVNode("span", _hoisted_6, toDisplayString(unref(t)("alerts.currentPrice")), 1),
                createVNode(_component_formatted_amount_with_fiat_value, {
                  "value-can-be-hidden": "",
                  "value-class": "input-value--primary",
                  value: "1",
                  "asset-symbol": asset.symbol,
                  "fiat-value": fiatAmountValue.value
                }, null, 8, ["asset-symbol", "fiat-value"])
              ])
            ]),
            createVNode(_component_token_select_button, {
              slot: "right",
              icon: "chevron-down-rounded-16",
              token: asset,
              onClick: withModifiers(openSelectAssetDialog, ["stop"])
            }, null, 8, ["token"]),
            createBaseVNode("div", _hoisted_7, [
              createBaseVNode("span", _hoisted_8, [
                createBaseVNode("span", {
                  class: normalizeClass(activeSignClass("+"))
                }, " + ", 2),
                _cache[3] || (_cache[3] = createBaseVNode("span", { class: "slash" }, "/", -1)),
                createBaseVNode("span", {
                  class: normalizeClass(activeSignClass("-"))
                }, " - ", 2),
                createTextVNode(" " + toDisplayString(deltaPercentage.value) + "% ", 1)
              ]),
              createVNode(_component_token_address, normalizeProps(guardReactiveProps(asset)), null, 16)
            ])
          ]),
          _: 1
        }, 8, ["modelValue", "delimiters", "decimals", "placeholder"]),
        createBaseVNode("span", _hoisted_9, toDisplayString(unref(t)("alerts.alertFrequencyTitle")), 1),
        createVNode(_component_s_tooltip, {
          slot: "suffix",
          "border-radius": "mini",
          content: unref(t)("alerts.frequencyTooltip"),
          placement: "top",
          tabindex: "-1"
        }, {
          default: withCtx(() => [
            createVNode(_component_s_icon, {
              name: "info-16",
              size: "14px"
            })
          ]),
          _: 1
        }, 8, ["content"]),
        createVNode(_component_s_tabs, {
          class: "setup-price-alert__tab",
          modelValue: currentFrequencyTab.value,
          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => currentFrequencyTab.value = $event),
          type: "rounded"
        }, {
          default: withCtx(() => [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(AlertFrequencyTabs), (tab) => {
              return openBlock(), createBlock(_component_s_tab, {
                key: tab,
                label: unref(t)(`alerts.${tab}`),
                name: tab
              }, null, 8, ["label", "name"]);
            }), 128))
          ]),
          _: 1
        }, 8, ["modelValue"]),
        createVNode(_component_s_button, {
          type: "primary",
          class: "setup-price-alert__btn s-typography-button--large",
          loading: loading.value,
          disabled: btnDisabled.value,
          onClick: handleAlertCreation
        }, {
          default: withCtx(() => [
            createTextVNode(toDisplayString(unref(t)("alerts.finishBtn")), 1)
          ]),
          _: 1
        }, 8, ["loading", "disabled"])
      ]);
    };
  }
});
export {
  _sfc_main as default
};
