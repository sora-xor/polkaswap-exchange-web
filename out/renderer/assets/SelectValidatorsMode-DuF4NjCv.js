import { z as defineComponent, u as useTranslation, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, A as createElementBlock, C as openBlock, D as createBaseVNode, ap as createVNode, aN as toDisplayString, aj as unref, bQ as Fragment, bP as renderList, h as computed, ao as withCtx, aO as createTextVNode, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "content" };
const _hoisted_2 = { class: "card" };
const _hoisted_3 = { class: "criteria" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "SelectValidatorsMode",
  props: {
    parentLoading: { type: Boolean }
  },
  emits: ["recommended", "selected"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const emit = __emit;
    const { t } = useTranslation();
    const criteria = computed(() => {
      const value = t("soraStaking.selectValidatorsMode.criteria");
      return Array.isArray(value) ? value : [];
    });
    const stakeWithSuggested = () => {
      emit("recommended");
    };
    const stakeWithSelected = () => {
      emit("selected");
    };
    __expose({
      stakeWithSuggested,
      stakeWithSelected
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      const _directive_button = resolveDirective("button");
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createElementBlock("div", null, [
        createBaseVNode("div", _hoisted_1, [
          createBaseVNode("div", _hoisted_2, [
            createBaseVNode("h4", null, toDisplayString(unref(t)("soraStaking.selectValidatorsMode.title")), 1),
            createBaseVNode("p", null, toDisplayString(unref(t)("soraStaking.selectValidatorsMode.description")), 1),
            createBaseVNode("ul", _hoisted_3, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(criteria.value, (item) => {
                return openBlock(), createElementBlock("li", { key: item }, [
                  createVNode(_component_s_icon, {
                    name: "basic-check-mark-24",
                    size: "16px"
                  }),
                  createBaseVNode("span", null, toDisplayString(item), 1)
                ]);
              }), 128))
            ]),
            createVNode(_component_s_button, {
              type: "primary",
              onClick: stakeWithSuggested
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(t)("soraStaking.selectValidatorsMode.confirm.suggested")), 1)
              ]),
              _: 1
            })
          ]),
          withDirectives((openBlock(), createElementBlock("div", {
            class: "manual-select",
            onClick: stakeWithSelected
          }, [
            createTextVNode(toDisplayString(unref(t)("soraStaking.selectValidatorsMode.confirm.manual")), 1)
          ])), [
            [_directive_button]
          ])
        ])
      ])), [
        [_directive_loading, Boolean(__props.parentLoading)]
      ]);
    };
  }
});
const SelectValidatorsMode = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-0d253857"]]);
export {
  SelectValidatorsMode as default
};
