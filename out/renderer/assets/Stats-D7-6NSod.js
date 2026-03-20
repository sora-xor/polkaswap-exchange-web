import { _ as _sfc_main$2 } from "./BarChart.vue_vue_type_script_setup_true_lang-BgWkiDCs.js";
import StatsNetworkStats from "./NetworkStats-Duo4IHfy.js";
import { _ as _sfc_main$1 } from "./TvlChart.vue_vue_type_script_setup_true_lang-brEsc8XU.js";
import { _ as _sfc_main$3 } from "./SupplyChart.vue_vue_type_script_setup_true_lang-S9jcH_2c.js";
import { z as defineComponent, A as createElementBlock, C as openBlock, ap as createVNode, h as computed, aP as _export_sfc } from "./index-73GArslZ.js";
import "./snapshots-C2HRhynI.js";
import "./component-CFIRMeyp.js";
import "./index-C1Moop9t.js";
import "./useWidgetTokenSelect-CzOdir7j.js";
const _hoisted_1 = { class: "stats-container" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Stats",
  props: {
    parentLoading: { type: Boolean, default: false }
  },
  setup(__props) {
    const props = __props;
    const parentLoading = computed(() => props.parentLoading);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(StatsNetworkStats, {
          class: "grid-item",
          "parent-loading": parentLoading.value,
          "pip-disabled": ""
        }, null, 8, ["parent-loading"]),
        createVNode(_sfc_main$1, {
          class: "grid-item grid-item--50",
          "parent-loading": parentLoading.value,
          "pip-disabled": ""
        }, null, 8, ["parent-loading"]),
        createVNode(_sfc_main$2, {
          class: "grid-item grid-item--50",
          "parent-loading": parentLoading.value,
          "pip-disabled": ""
        }, null, 8, ["parent-loading"]),
        createVNode(_sfc_main$2, {
          class: "grid-item grid-item--50",
          fees: "",
          "parent-loading": parentLoading.value,
          "pip-disabled": ""
        }, null, 8, ["parent-loading"]),
        createVNode(_sfc_main$3, {
          class: "grid-item grid-item--50",
          "parent-loading": parentLoading.value,
          "pip-disabled": ""
        }, null, 8, ["parent-loading"])
      ]);
    };
  }
});
const Stats = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7e644690"]]);
export {
  Stats as default
};
