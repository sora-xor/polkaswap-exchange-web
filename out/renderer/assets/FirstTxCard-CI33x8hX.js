import { z as defineComponent, u as useTranslation, a_ as resolveComponent, A as createElementBlock, C as openBlock, D as createBaseVNode, ap as createVNode, aN as toDisplayString, aj as unref, h as computed, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "task-card" };
const _hoisted_2 = { class: "task-card__first-trx" };
const _hoisted_3 = { class: "task-card__date" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "FirstTxCard"
  },
  __name: "FirstTxCard",
  props: {
    date: {}
  },
  setup(__props) {
    const props = __props;
    const { t, formatDate } = useTranslation();
    const formattedDate = computed(() => formatDate(props.date, "L"));
    return (_ctx, _cache) => {
      const _component_s_divider = resolveComponent("s-divider");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("p", _hoisted_2, toDisplayString(unref(t)("points.firstSoraNetworkTransaction")), 1),
        createVNode(_component_s_divider, { direction: "vertical" }),
        createBaseVNode("div", _hoisted_3, [
          createBaseVNode("p", null, toDisplayString(unref(t)("points.dated")), 1),
          createBaseVNode("p", null, toDisplayString(formattedDate.value), 1)
        ])
      ]);
    };
  }
});
const FirstTxCard = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-a9175441"]]);
export {
  FirstTxCard as default
};
