import { z as defineComponent, ak as lazyComponent, al as Components, aZ as components, a_ as resolveComponent, am as createBlock, aM as createCommentVNode, h as computed, C as openBlock, ao as withCtx, D as createBaseVNode, aj as unref, A as createElementBlock, aO as createTextVNode, bQ as Fragment, aN as toDisplayString, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "dialog-title-text" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "DialogTitle",
  props: {
    baseAsset: { default: null },
    poolAsset: { default: null },
    isFarm: { type: Boolean, default: false }
  },
  setup(__props) {
    const PairTokenLogo = lazyComponent(Components.PairTokenLogo);
    const TokenLogo = components.TokenLogo;
    const props = __props;
    const baseAsset = computed(() => props.baseAsset);
    const poolAsset = computed(() => props.poolAsset);
    const isFarm = computed(() => props.isFarm);
    return (_ctx, _cache) => {
      const _component_s_row = resolveComponent("s-row");
      return poolAsset.value ? (openBlock(), createBlock(_component_s_row, {
        key: 0,
        flex: "",
        align: "middle"
      }, {
        default: withCtx(() => [
          isFarm.value && baseAsset.value ? (openBlock(), createBlock(unref(PairTokenLogo), {
            key: "pair",
            "first-token": baseAsset.value,
            "second-token": poolAsset.value,
            class: "dialog-title-logo"
          }, null, 8, ["first-token", "second-token"])) : (openBlock(), createBlock(unref(TokenLogo), {
            key: "token",
            token: poolAsset.value,
            class: "dialog-title-logo"
          }, null, 8, ["token"])),
          createBaseVNode("span", _hoisted_1, [
            isFarm.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              createTextVNode(toDisplayString(baseAsset.value.symbol) + "-", 1)
            ], 64)) : createCommentVNode("", true),
            createTextVNode(toDisplayString(poolAsset.value.symbol), 1)
          ])
        ]),
        _: 1
      })) : createCommentVNode("", true);
    };
  }
});
const DialogTitle = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-cf2030ac"]]);
export {
  DialogTitle as default
};
