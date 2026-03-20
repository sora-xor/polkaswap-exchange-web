import { z as defineComponent, a_ as resolveComponent, am as createBlock, C as openBlock, as as mergeProps, ao as withCtx, D as createBaseVNode, aJ as renderSlot, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "account-avatar" };
const _hoisted_2 = { class: "account-details s-flex" };
const _hoisted_3 = { class: "account-credentials s-flex" };
const _hoisted_4 = { class: "account-credentials_name" };
const _hoisted_5 = { class: "account-credentials_description" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AccountCard",
  emits: ["click"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const handleClick = (event) => {
      emit("click", event);
    };
    return (_ctx, _cache) => {
      const _component_s_card = resolveComponent("s-card");
      return openBlock(), createBlock(_component_s_card, mergeProps({ shadow: "always", size: "small", borderRadius: "medium", ..._ctx.$attrs }, { class: "account-card" }), {
        default: withCtx(() => [
          createBaseVNode("div", {
            class: "account",
            onClick: handleClick
          }, [
            createBaseVNode("div", _hoisted_1, [
              renderSlot(_ctx.$slots, "avatar", {}, void 0, true)
            ]),
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("div", _hoisted_3, [
                createBaseVNode("div", _hoisted_4, [
                  renderSlot(_ctx.$slots, "name", {}, void 0, true)
                ]),
                createBaseVNode("div", _hoisted_5, [
                  renderSlot(_ctx.$slots, "description", {}, void 0, true)
                ])
              ]),
              renderSlot(_ctx.$slots, "default", {}, void 0, true)
            ])
          ])
        ]),
        _: 3
      }, 16);
    };
  }
});
const AccountCard = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2ed6178c"]]);
export {
  AccountCard as default
};
