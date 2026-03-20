import { z as defineComponent, aZ as components, bu as useModel, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, aJ as renderSlot } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogBase: components.DialogBase
    }
  },
  __name: "CustomisePage",
  props: {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  },
  emits: ["update:visible"],
  setup(__props) {
    const visible = useModel(__props, "visible");
    return (_ctx, _cache) => {
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: visible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => visible.value = $event)
      }, {
        default: withCtx(() => [
          renderSlot(_ctx.$slots, "default")
        ]),
        _: 3
      }, 8, ["visible"]);
    };
  }
});
export {
  _sfc_main as default
};
