import { z as defineComponent, u as useTranslation, cI as MaxTotalSupply, F as FPNumber, h as computed, a9 as ref, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, bA as withDirectives, D as createBaseVNode, ap as createVNode, aj as unref, aN as toDisplayString, x as useNumberFormatter, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "wallet-settings-create-token" };
const _hoisted_2 = { class: "wallet-settings-create-token_desc" };
const _hoisted_3 = { class: "wallet-settings-create-token_desc" };
const _hoisted_4 = { class: "wallet-settings-create-token_desc" };
const _hoisted_5 = { class: "wallet-settings-create-token_supply-block" };
const _hoisted_6 = { class: "wallet-settings-create-token_desc" };
const tokenSymbolMask = "AAAAAAA";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "CreateNftToken",
  setup(__props, { expose: __expose }) {
    const { t } = useTranslation();
    const { formatStringValue } = useNumberFormatter();
    const decimals = FPNumber.DEFAULT_PRECISION;
    const delimiters = FPNumber.DELIMITERS_CONFIG;
    const maxTotalSupply = MaxTotalSupply;
    const tokenNameMask = { mask: "Z*", tokens: { Z: { pattern: /[0-9a-zA-Z ]/ } } };
    const tokenSymbol = ref("");
    const tokenName = ref("");
    const tokenSupply = ref("");
    const extensibleSupply = ref(false);
    const loading = ref(false);
    const isCreateDisabled = computed(() => {
      return !(tokenSymbol.value && tokenName.value.trim() && Number(tokenSupply.value));
    });
    const formattedTokenSupply = computed(() => formatStringValue(tokenSupply.value, decimals));
    __expose({
      tokenSymbol,
      tokenName,
      tokenSupply,
      extensibleSupply,
      loading,
      isCreateDisabled,
      formattedTokenSupply,
      decimals,
      delimiters,
      maxTotalSupply,
      tokenSymbolMask,
      tokenNameMask,
      t
    });
    return (_ctx, _cache) => {
      const _component_s_input = resolveComponent("s-input");
      const _component_s_float_input = resolveComponent("s-float-input");
      const _component_s_switch = resolveComponent("s-switch");
      const _directive_maska = resolveDirective("maska");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        withDirectives(createVNode(_component_s_input, {
          placeholder: unref(t)("createToken.tokenSymbol.placeholder"),
          minlength: 1,
          maxlength: 7,
          disabled: loading.value,
          modelValue: tokenSymbol.value,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => tokenSymbol.value = $event)
        }, null, 8, ["placeholder", "disabled", "modelValue"]), [
          [_directive_maska, tokenSymbolMask]
        ]),
        createBaseVNode("p", _hoisted_2, toDisplayString(unref(t)("createToken.tokenSymbol.desc")), 1),
        withDirectives(createVNode(_component_s_input, {
          placeholder: unref(t)("createToken.tokenName.placeholder"),
          minlength: 1,
          maxlength: 33,
          disabled: loading.value,
          modelValue: tokenName.value,
          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => tokenName.value = $event)
        }, null, 8, ["placeholder", "disabled", "modelValue"]), [
          [_directive_maska, tokenNameMask]
        ]),
        createBaseVNode("p", _hoisted_3, toDisplayString(unref(t)("createToken.tokenName.desc")), 1),
        createVNode(_component_s_float_input, {
          modelValue: tokenSupply.value,
          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => tokenSupply.value = $event),
          placeholder: unref(t)("createToken.tokenSupply.placeholder"),
          decimals: unref(decimals),
          "has-locale-string": "",
          delimiters: unref(delimiters),
          max: unref(maxTotalSupply),
          disabled: loading.value
        }, null, 8, ["modelValue", "placeholder", "decimals", "delimiters", "max", "disabled"]),
        createBaseVNode("p", _hoisted_4, toDisplayString(unref(t)("createToken.tokenSupply.desc")), 1),
        createBaseVNode("div", _hoisted_5, [
          createVNode(_component_s_switch, {
            modelValue: extensibleSupply.value,
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => extensibleSupply.value = $event),
            disabled: loading.value
          }, null, 8, ["modelValue", "disabled"]),
          createBaseVNode("span", null, toDisplayString(unref(t)("createToken.extensibleSupply.placeholder")), 1)
        ]),
        createBaseVNode("p", _hoisted_6, toDisplayString(unref(t)("createToken.extensibleSupply.desc")), 1)
      ]);
    };
  }
});
const CreateNftToken = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-f30ec6e7"]]);
export {
  CreateNftToken as default
};
