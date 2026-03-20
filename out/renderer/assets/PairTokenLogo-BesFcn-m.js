import { z as defineComponent, aI as WALLET_CONSTS, c4 as ObjectInit, aZ as components, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, bb as normalizeClass, h as computed, aP as _export_sfc } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "PairTokenLogo",
    components: {
      TokenLogo: components.TokenLogo
    }
  },
  __name: "PairTokenLogo",
  props: {
    firstToken: { default: ObjectInit },
    secondToken: { default: ObjectInit },
    size: { default: WALLET_CONSTS.LogoSize.MEDIUM }
  },
  setup(__props) {
    const props = __props;
    const computedClasses = computed(() => {
      const componentClass = "pair-logo";
      const classes = [componentClass];
      if (props.size) {
        classes.push(`${componentClass}--${String(props.size).toLowerCase()}`);
      }
      return classes.join(" ");
    });
    return (_ctx, _cache) => {
      const _component_token_logo = resolveComponent("token-logo");
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(computedClasses.value)
      }, [
        createVNode(_component_token_logo, {
          token: __props.firstToken,
          class: "token-logo first-logo",
          size: __props.size
        }, null, 8, ["token", "size"]),
        createVNode(_component_token_logo, {
          token: __props.secondToken,
          class: "token-logo second-logo",
          size: __props.size
        }, null, 8, ["token", "size"])
      ], 2);
    };
  }
});
const PairTokenLogo = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7071f588"]]);
export {
  PairTokenLogo as default
};
