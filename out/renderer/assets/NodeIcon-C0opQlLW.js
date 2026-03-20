import { z as defineComponent, u as useTranslation, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, h as computed, bb as normalizeClass, aj as unref, aW as Status, aP as _export_sfc } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "NodeIcon",
  props: {
    connection: { default: null }
  },
  emits: ["click"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const props = __props;
    const { t } = useTranslation();
    const loading = computed(() => Boolean(props.connection?.nodeAddressConnecting));
    const connected = computed(() => Boolean(props.connection?.nodeIsConnected));
    const icon = computed(() => loading.value ? "el-icon-loading" : "globe-16");
    const status = computed(() => {
      if (connected.value) return Status.SUCCESS;
      if (loading.value) return Status.INFO;
      return Status.ERROR;
    });
    function handleClick() {
      emit("click");
    }
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(_component_s_button, {
        type: "action",
        size: "mini",
        alternative: "",
        tooltip: unref(t)("selectNodeText"),
        onClick: handleClick,
        class: "status-button"
      }, {
        default: withCtx(() => [
          createVNode(_component_s_icon, {
            class: normalizeClass(`status--${status.value}`),
            name: icon.value,
            size: "16"
          }, null, 8, ["class", "name"])
        ]),
        _: 1
      }, 8, ["tooltip"]);
    };
  }
});
const NodeIcon = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-5f76d0a9"]]);
export {
  NodeIcon as default
};
