import { z as defineComponent, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, W as router } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "BackButton",
  props: {
    page: {}
  },
  emits: ["back"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const handleBack = () => {
      if (props.page) {
        router.push({ name: props.page });
      }
      emit("back");
    };
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(_component_s_button, {
        class: "back-button",
        type: "action",
        size: "medium",
        onClick: handleBack
      }, {
        icon: withCtx(() => [
          createVNode(_component_s_icon, {
            name: "arrows-chevron-left-rounded-24",
            size: "24"
          })
        ]),
        _: 1
      });
    };
  }
});
export {
  _sfc_main as default
};
