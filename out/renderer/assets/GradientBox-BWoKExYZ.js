import { z as defineComponent, ci as h, h as computed, aP as _export_sfc } from "./index-73GArslZ.js";
const _sfc_main = defineComponent({
  name: "RewardsGradientBox",
  props: {
    symbol: {
      type: String,
      default: ""
    }
  },
  setup(props, { slots }) {
    const symbolClass = computed(() => {
      if (!props.symbol) return "";
      return `gradient-box--${props.symbol.toLowerCase()}`;
    });
    return () => h(
      "div",
      {
        class: ["gradient-box", symbolClass.value]
      },
      slots.default?.()
    );
  }
});
const GradientBox = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-a975e3d5"]]);
export {
  GradientBox as default
};
