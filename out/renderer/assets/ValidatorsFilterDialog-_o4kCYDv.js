import { z as defineComponent, bt as mergeModels, bu as useModel, u as useTranslation, cn as reactive, dK as emptyValidatorsFilter, aA as watch, h as computed, a_ as resolveComponent, bz as resolveDirective, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, bA as withDirectives, aN as toDisplayString, aj as unref, A as createElementBlock, bQ as Fragment, bP as renderList, bb as normalizeClass, aO as createTextVNode, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "filter-container" };
const _hoisted_2 = { class: "title" };
const _hoisted_3 = { class: "filter" };
const _hoisted_4 = { class: "filter-item-header" };
const _hoisted_5 = { class: "filter-item-label" };
const _hoisted_6 = { class: "filter-item-description" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ValidatorsFilterDialog",
  props: /* @__PURE__ */ mergeModels({
    filter: {}
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["close", "save"], ["update:visible"]),
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const isVisible = useModel(__props, "visible");
    const { t } = useTranslation();
    const localFilter = reactive({ ...emptyValidatorsFilter, ...props.filter });
    const filterData = computed(
      () => t("soraStaking.validatorsFilterDialog.filters")
    );
    const syncLocalFilter = () => {
      Object.assign(localFilter, emptyValidatorsFilter, props.filter);
    };
    watch(
      isVisible,
      (visible) => {
        if (visible) syncLocalFilter();
      },
      { immediate: true }
    );
    watch(
      () => props.filter,
      () => {
        if (isVisible.value) syncLocalFilter();
      },
      { deep: true }
    );
    const save = () => {
      emit("save", { ...localFilter });
    };
    const resetAll = () => {
      Object.assign(localFilter, emptyValidatorsFilter);
    };
    __expose({ localFilter, save, resetAll, filterData });
    return (_ctx, _cache) => {
      const _component_s_switch = resolveComponent("s-switch");
      const _component_s_button = resolveComponent("s-button");
      const _component_dialog_base = resolveComponent("dialog-base");
      const _directive_button = resolveDirective("button");
      return openBlock(), createBlock(_component_dialog_base, {
        class: "validators-filter-dialog",
        visible: isVisible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isVisible.value = $event)
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("h1", _hoisted_2, toDisplayString(unref(t)("soraStaking.validatorsFilterDialog.title")), 1),
            createBaseVNode("div", _hoisted_3, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(filterData.value, (item, key) => {
                return openBlock(), createElementBlock("div", {
                  key: item.name,
                  class: "filter-item"
                }, [
                  createBaseVNode("div", _hoisted_4, [
                    createBaseVNode("div", _hoisted_5, toDisplayString(item.name), 1),
                    createVNode(_component_s_switch, {
                      class: normalizeClass(["filter-item-switch", { "is-active": localFilter[key] }]),
                      modelValue: localFilter[key],
                      "onUpdate:modelValue": ($event) => localFilter[key] = $event
                    }, null, 8, ["class", "modelValue", "onUpdate:modelValue"])
                  ]),
                  createBaseVNode("div", _hoisted_6, toDisplayString(item.description), 1)
                ]);
              }), 128))
            ]),
            createVNode(_component_s_button, {
              class: "save-button",
              type: "primary",
              onClick: save
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(t)("soraStaking.validatorsFilterDialog.save")), 1)
              ]),
              _: 1
            }),
            withDirectives((openBlock(), createElementBlock("div", {
              class: "reset-all",
              onClick: resetAll
            }, [
              createTextVNode(toDisplayString(unref(t)("soraStaking.validatorsFilterDialog.reset")), 1)
            ])), [
              [_directive_button]
            ])
          ])
        ]),
        _: 1
      }, 8, ["visible"]);
    };
  }
});
const ValidatorsFilterDialog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-5ad81f67"]]);
export {
  ValidatorsFilterDialog as default
};
