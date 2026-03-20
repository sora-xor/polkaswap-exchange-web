import { z as defineComponent, c_ as soraStakingLazyComponent, c$ as SoraStakingComponents, A as createElementBlock, C as openBlock, am as createBlock, aM as createCommentVNode, D as createBaseVNode, aj as unref, aJ as renderSlot, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "header" };
const _hoisted_2 = { class: "title" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "StakingHeader",
  props: {
    previousPage: {},
    hasBackButton: { type: Boolean, default: true }
  },
  emits: ["back"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const BackButton = soraStakingLazyComponent(SoraStakingComponents.BackButton);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        props.hasBackButton ? (openBlock(), createBlock(unref(BackButton), {
          key: 0,
          class: "back-button",
          page: props.previousPage,
          onBack: _cache[0] || (_cache[0] = ($event) => emit("back"))
        }, null, 8, ["page"])) : createCommentVNode("", true),
        createBaseVNode("h3", _hoisted_2, [
          renderSlot(_ctx.$slots, "default", {}, void 0, true)
        ])
      ]);
    };
  }
});
const StakingHeader = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-20ec6d7b"]]);
export {
  StakingHeader as default
};
