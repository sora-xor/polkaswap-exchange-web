import { z as defineComponent, u as useTranslation, h as computed, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, D as createBaseVNode, aO as createTextVNode, aN as toDisplayString, aj as unref, aP as _export_sfc } from "./index-73GArslZ.js";
import ExternalLink from "./ExternalLink-C8Y3dJnT.js";
const _hoisted_1 = { class: "switcher" };
const SYNTHS_LINK = "https://medium.com/polkaswap/unveiling-synthetic-assets-a-game-changer-in-the-financial-landscape-1720e5858422";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "SyntheticSwitcher",
  props: {
    modelValue: { type: Boolean, default: false }
  },
  emits: ["update:modelValue"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const model = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value)
    });
    __expose({ model });
    return (_ctx, _cache) => {
      const _component_s_switch = resolveComponent("s-switch");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_s_switch, {
          modelValue: model.value,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => model.value = $event)
        }, null, 8, ["modelValue"]),
        createBaseVNode("span", null, [
          createTextVNode(toDisplayString(unref(t)("explore.showOnly")) + " ", 1),
          createVNode(ExternalLink, {
            "default-class": "p3",
            title: unref(t)("explore.synthetics"),
            href: SYNTHS_LINK
          }, null, 8, ["title"])
        ])
      ]);
    };
  }
});
const SyntheticSwitcher = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-3da10283"]]);
export {
  SyntheticSwitcher as default
};
