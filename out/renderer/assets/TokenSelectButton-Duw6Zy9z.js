import { z as defineComponent, c4 as ObjectInit, aZ as components, ak as lazyComponent, al as Components, u as useTranslation, h as computed, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, aM as createCommentVNode, bL as resolveDynamicComponent, aN as toDisplayString, bb as normalizeClass, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "token-select-button__content" };
const _hoisted_2 = { class: "token-select-button__text" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "TokenSelectButton"
  },
  __name: "TokenSelectButton",
  props: {
    token: { default: ObjectInit },
    tokens: { default: () => [] },
    icon: { default: "" },
    tabindex: { default: 0 },
    disabled: { type: Boolean, default: false }
  },
  setup(__props, { expose: __expose }) {
    const TokenLogo = components.TokenLogo;
    const PairTokenLogo = lazyComponent(Components.PairTokenLogo);
    const props = __props;
    const { t } = useTranslation();
    const hasToken = computed(() => props.tokens.length !== 0 || !!props.token);
    const computedClasses = computed(() => {
      const baseClass = "token-select-button";
      return hasToken.value ? [baseClass, `${baseClass}--token`] : [baseClass];
    });
    const buttonTabindex = computed(() => props.disabled ? -1 : props.tabindex);
    const tokenLogoComponent = computed(() => props.tokens.length !== 0 ? PairTokenLogo : TokenLogo);
    const tokenComponentSize = computed(() => props.tokens.length !== 0 ? "mini" : "small");
    const buttonType = computed(() => hasToken.value ? "tertiary" : "secondary");
    const normalizeTokenSymbol = (value) => (value ?? "").replace(/\s+/g, "").trim();
    const buttonText = computed(() => {
      if (!hasToken.value) return t("buttons.chooseToken");
      if (props.tokens.length !== 0) {
        return props.tokens.map((item) => normalizeTokenSymbol(item.symbol)).join("-");
      }
      return normalizeTokenSymbol(props.token?.symbol);
    });
    __expose({
      hasToken,
      computedClasses,
      buttonTabindex,
      tokenLogoComponent,
      tokenComponentSize,
      buttonType,
      buttonText
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(_component_s_button, {
        type: buttonType.value,
        class: normalizeClass(computedClasses.value),
        tabindex: buttonTabindex.value,
        disabled: __props.disabled,
        size: "small",
        "border-radius": "mini"
      }, {
        default: withCtx(() => [
          createBaseVNode("span", _hoisted_1, [
            hasToken.value ? (openBlock(), createBlock(resolveDynamicComponent(tokenLogoComponent.value), {
              key: 0,
              token: __props.token,
              "first-token": __props.tokens[0],
              "second-token": __props.tokens[1],
              size: tokenComponentSize.value,
              class: "token-select-button__logo"
            }, null, 8, ["token", "first-token", "second-token", "size"])) : createCommentVNode("", true),
            createBaseVNode("span", _hoisted_2, toDisplayString(buttonText.value), 1),
            __props.icon && !__props.disabled ? (openBlock(), createBlock(_component_s_icon, {
              key: 1,
              class: "token-select-button__icon",
              name: __props.icon,
              size: "18"
            }, null, 8, ["name"])) : createCommentVNode("", true)
          ])
        ]),
        _: 1
      }, 8, ["type", "class", "tabindex", "disabled"]);
    };
  }
});
const TokenSelectButton = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-3be6896a"]]);
export {
  TokenSelectButton as default
};
