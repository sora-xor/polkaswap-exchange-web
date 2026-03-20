import { z as defineComponent, u as useTranslation, aZ as components, bD as poolLazyComponent, bE as PoolComponents, aA as watch, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aj as unref, h as computed, s as store } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Dialog",
  props: {
    visible: { type: Boolean }
  },
  emits: ["update:visible", "close"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const DialogBase = components.DialogBase;
    const RemoveLiquidityForm = poolLazyComponent(PoolComponents.RemoveLiquidityForm);
    const isVisible = computed({
      get: () => props.visible,
      set: (value) => emit("update:visible", value)
    });
    const closeDialog = () => {
      emit("close");
      isVisible.value = false;
    };
    watch(isVisible, (value) => {
      if (!value) {
        store.dispatch.removeLiquidity.resetData();
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(DialogBase), {
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event),
        title: unref(t)("removeLiquidity.title"),
        tooltip: unref(t)("removeLiquidity.description")
      }, {
        default: withCtx(() => [
          createVNode(unref(RemoveLiquidityForm), { onBack: closeDialog })
        ]),
        _: 1
      }, 8, ["visible", "title", "tooltip"]);
    };
  }
});
export {
  _sfc_main as default
};
