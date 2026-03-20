import CalculatorIcon from "./CalculatorIcon-t5hEgBTX.js";
import { z as defineComponent, ci as h, aP as _export_sfc } from "./index-73GArslZ.js";
const _sfc_main = defineComponent({
  name: "CalculatorButton",
  emits: ["click"],
  methods: {
    handleClick(event) {
      this.$emit("click", event);
    }
  },
  render() {
    const slotContent = this.$slots.default?.();
    return h(
      "button",
      {
        type: "button",
        class: "calculator-button",
        onClick: this.handleClick
      },
      [slotContent ?? null, h(CalculatorIcon, { class: "calculator-button-icon" })]
    );
  }
});
const CalculatorButton = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-ecc93e25"]]);
export {
  CalculatorButton as default
};
