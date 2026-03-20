import { z as defineComponent, u as useTranslation, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, ao as withCtx, D as createBaseVNode, aN as toDisplayString, aj as unref, h as computed, bQ as Fragment, bP as renderList, c0 as toRef, am as createBlock, aM as createCommentVNode, bb as normalizeClass, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "statistics-dialog" };
const _hoisted_2 = { class: "statistics-dialog__group" };
const _hoisted_3 = { class: "statistics-dialog__group-title" };
const _hoisted_4 = { class: "service-item s-flex" };
const _hoisted_5 = { class: "service-item__label s-flex" };
const _hoisted_6 = { class: "service-item__name" };
const _hoisted_7 = {
  key: 0,
  class: "service-item__endpoint"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{ name: "SelectIndexer" },
  __name: "SelectIndexer",
  props: {
    indexers: { default: () => [] },
    indexer: {}
  },
  emits: ["update:indexer"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t, TranslationConsts } = useTranslation();
    const indexers = toRef(props, "indexers");
    const indexerType = computed({
      get: () => props.indexer,
      set: (value) => {
        if (value === void 0) return;
        emit("update:indexer", value);
      }
    });
    return (_ctx, _cache) => {
      const _component_s_radio = resolveComponent("s-radio");
      const _component_s_radio_group = resolveComponent("s-radio-group");
      const _component_s_scrollbar = resolveComponent("s-scrollbar");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_s_scrollbar, { class: "statistics-dialog__scrollbar" }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("span", _hoisted_3, toDisplayString(unref(t)("footer.statistics.dialog.indexer")), 1),
              createVNode(_component_s_radio_group, {
                modelValue: indexerType.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => indexerType.value = $event),
                class: "statistics-dialog__block s-flex"
              }, {
                default: withCtx(() => [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(indexers.value, (indexer) => {
                    return openBlock(), createBlock(_component_s_radio, {
                      key: indexer.type,
                      label: indexer.type,
                      value: indexer.type,
                      disabled: !indexer.endpoint,
                      size: "medium",
                      class: "statistics-dialog__item s-flex"
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_4, [
                          createBaseVNode("div", _hoisted_5, [
                            createBaseVNode("div", _hoisted_6, toDisplayString(indexer.name), 1),
                            indexer.endpoint ? (openBlock(), createElementBlock("div", _hoisted_7, toDisplayString(indexer.endpoint), 1)) : createCommentVNode("", true)
                          ]),
                          createBaseVNode("div", {
                            class: normalizeClass(["service-item__status", indexer.online ? "success" : "error"])
                          }, toDisplayString(indexer.online ? unref(TranslationConsts).online : unref(TranslationConsts).offline), 3)
                        ])
                      ]),
                      _: 2
                    }, 1032, ["label", "value", "disabled"]);
                  }), 128))
                ]),
                _: 1
              }, 8, ["modelValue"])
            ])
          ]),
          _: 1
        })
      ]);
    };
  }
});
const SelectIndexer = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-4b05f485"]]);
export {
  SelectIndexer as default
};
