import { z as defineComponent, aZ as components, u as useTranslation, a9 as ref, aA as watch, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, h as computed, aj as unref } from "./index-73GArslZ.js";
import { _ as _sfc_main$1 } from "./MarketAlgorithm.vue_vue_type_style_index_0_lang-CQUlInpG.js";
import "./swap-DtWqRzUD.js";
import "./Header-fErhsDrK.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "SwapSettingsDialog",
    components: {
      DialogBase: components.DialogBase
    }
  },
  __name: "Settings",
  props: {
    visible: { type: Boolean },
    appendToBody: { type: Boolean, default: false }
  },
  emits: ["update:visible", "close"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const isVisible = ref(props.visible);
    watch(
      () => props.visible,
      (value) => {
        isVisible.value = value;
      },
      { immediate: true }
    );
    watch(isVisible, (value) => {
      emit("update:visible", value);
    });
    const appendToBody = computed(() => props.appendToBody);
    return (_ctx, _cache) => {
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event),
        title: unref(t)("dexSettings.title"),
        "append-to-body": appendToBody.value,
        "modal-append-to-body": appendToBody.value,
        "custom-class": "settings"
      }, {
        default: withCtx(() => [
          createVNode(_sfc_main$1)
        ]),
        _: 1
      }, 8, ["visible", "title", "append-to-body", "modal-append-to-body"]);
    };
  }
});
export {
  _sfc_main as default
};
