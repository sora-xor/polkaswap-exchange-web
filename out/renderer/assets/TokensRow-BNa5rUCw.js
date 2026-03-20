import { z as defineComponent, aI as WALLET_CONSTS, aZ as components, a_ as resolveComponent, A as createElementBlock, C as openBlock, D as createBaseVNode, bQ as Fragment, bP as renderList, am as createBlock, cd as normalizeStyle, bb as normalizeClass, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "tokens-row" };
const _hoisted_2 = { class: "tokens-row-container" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "TokensRow",
    components: {
      TokenLogo: components.TokenLogo
    }
  },
  __name: "TokensRow",
  props: {
    assets: { default: () => [] },
    size: { default: WALLET_CONSTS.LogoSize.LARGE },
    border: { type: Boolean, default: false }
  },
  setup(__props) {
    return (_ctx, _cache) => {
      const _component_token_logo = resolveComponent("token-logo");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(__props.assets, (asset, index) => {
            return openBlock(), createBlock(_component_token_logo, {
              key: index,
              token: asset,
              size: __props.size,
              style: normalizeStyle({ zIndex: index }),
              class: normalizeClass(["tokens-row__item", { border: __props.border }])
            }, null, 8, ["token", "size", "style", "class"]);
          }), 128))
        ])
      ]);
    };
  }
});
const TokensRow = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-49cf59cd"]]);
export {
  TokensRow as default
};
