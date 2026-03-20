import { z as defineComponent, u as useTranslation, h as computed, a_ as resolveComponent, bz as resolveDirective, A as createElementBlock, C as openBlock, D as createBaseVNode, ap as createVNode, ao as withCtx, aM as createCommentVNode, aN as toDisplayString, aj as unref, bQ as Fragment, bP as renderList, am as createBlock, aO as createTextVNode, a9 as ref, dE as AddAssetTabs, bA as withDirectives, bb as normalizeClass, dF as getLegacyStore, dj as FilterOptions, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "assets-filter-wrapper" };
const _hoisted_2 = { class: "assets-filter__headline" };
const _hoisted_3 = { class: "assets-filter__text" };
const _hoisted_4 = {
  key: 0,
  class: "assets-filter__switch--only-verified"
};
const _hoisted_5 = { class: "add-asset-token__switch-btn" };
const _hoisted_6 = { class: "assets-filter__button" };
const _hoisted_7 = { class: "assets-filter__button-option" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AssetsFilter",
  props: {
    modelValue: { type: Boolean, default: false },
    showOnlyVerifiedSwitch: { type: Boolean, default: false }
  },
  emits: ["update:modelValue"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t, TranslationConsts } = useTranslation();
    const resolveStore = () => getLegacyStore() ?? globalThis.__PS_APP_STORE__;
    const loading = ref(false);
    const assetsFilter = computed(
      () => resolveStore()?.state?.wallet?.settings?.assetsFilter ?? FilterOptions.All
    );
    const selectedFilter = computed({
      get: () => assetsFilter.value,
      set: (value) => {
        resolveStore()?.commit?.wallet?.settings?.setAssetsFilter(value);
      }
    });
    const isVerifiedOnly = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value)
    });
    const computedClasses = computed(() => ["assets-filter-wrapper__content"].join(" "));
    const getLabel = (index) => Object.values(FilterOptions)[index];
    const resetFilter = () => {
      selectedFilter.value = FilterOptions.All;
      isVerifiedOnly.value = true;
    };
    const filterOptionsText = computed(() => [
      t("filter.all"),
      t("filter.native"),
      TranslationConsts.Kensetsu,
      t("filter.synthetics"),
      TranslationConsts.Ceres
    ]);
    const chosenOptionText = computed(() => {
      switch (assetsFilter.value) {
        case FilterOptions.Native:
          return t("filter.native").toUpperCase();
        case FilterOptions.Kensetsu:
          return TranslationConsts.Kensetsu.toUpperCase();
        case FilterOptions.Synthetics:
          return t("filter.synthetics").toUpperCase();
        case FilterOptions.Ceres:
          return TranslationConsts.Ceres.toUpperCase();
        default:
          return t("filter.all").toUpperCase();
      }
    });
    const showText = computed(() => t("filter.show").toUpperCase());
    __expose({
      resetFilter,
      selectedFilter
    });
    return (_ctx, _cache) => {
      const _component_s_radio = resolveComponent("s-radio");
      const _component_s_radio_group = resolveComponent("s-radio-group");
      const _component_s_divider = resolveComponent("s-divider");
      const _component_s_switch = resolveComponent("s-switch");
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_popover_panel = resolveComponent("s-popover-panel");
      const _directive_button = resolveDirective("button");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", {
          class: normalizeClass(computedClasses.value)
        }, [
          createVNode(_component_s_popover_panel, {
            "popper-class": "assets-filter",
            trigger: "click",
            "visible-arrow": false
          }, {
            reference: withCtx(() => [
              withDirectives((openBlock(), createElementBlock("div", _hoisted_6, [
                createTextVNode(toDisplayString(showText.value) + ": ", 1),
                createBaseVNode("span", _hoisted_7, toDisplayString(chosenOptionText.value), 1),
                createVNode(_component_s_icon, {
                  class: "assets-filter__button-icon",
                  name: "basic-settings-24",
                  size: "14px"
                })
              ])), [
                [_directive_button]
              ])
            ]),
            default: withCtx(() => [
              createBaseVNode("div", _hoisted_2, [
                createBaseVNode("div", _hoisted_3, toDisplayString(unref(t)("filter.show")), 1),
                createBaseVNode("div", {
                  class: "assets-filter__text--reset",
                  onClick: resetFilter
                }, toDisplayString(unref(t)("filter.reset")), 1)
              ]),
              createVNode(_component_s_radio_group, {
                modelValue: selectedFilter.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedFilter.value = $event),
                class: "assets-filter-options"
              }, {
                default: withCtx(() => [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(filterOptionsText.value, (filter, index) => {
                    return openBlock(), createBlock(_component_s_radio, {
                      key: index,
                      size: "small",
                      label: getLabel(index)
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(filter), 1)
                      ]),
                      _: 2
                    }, 1032, ["label"]);
                  }), 128))
                ]),
                _: 1
              }, 8, ["modelValue"]),
              __props.showOnlyVerifiedSwitch ? (openBlock(), createElementBlock("div", _hoisted_4, [
                createVNode(_component_s_divider),
                createBaseVNode("div", _hoisted_5, [
                  createVNode(_component_s_switch, {
                    modelValue: isVerifiedOnly.value,
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isVerifiedOnly.value = $event),
                    disabled: loading.value
                  }, null, 8, ["modelValue", "disabled"]),
                  createBaseVNode("span", null, toDisplayString(unref(t)(`addAsset.${unref(AddAssetTabs).Token}.switchBtn`)), 1)
                ])
              ])) : createCommentVNode("", true)
            ]),
            _: 1
          })
        ], 2)
      ]);
    };
  }
});
const AssetsFilter = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-f4e58be9"]]);
export {
  AssetsFilter as default
};
