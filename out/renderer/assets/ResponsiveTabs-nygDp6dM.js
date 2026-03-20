import { z as defineComponent, d8 as UiSize, bm as toRefs, a_ as resolveComponent, A as createElementBlock, C as openBlock, am as createBlock, aj as unref, ao as withCtx, aN as toDisplayString, h as computed, bQ as Fragment, aO as createTextVNode, bP as renderList, bb as normalizeClass, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = {
  key: 0,
  class: "responsive-tabs__dropdown-selected"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ResponsiveTabs",
  props: {
    isHeader: { type: Boolean, default: false },
    isMobile: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    size: { default: UiSize.MEDIUM },
    tabs: { default: () => [] },
    modelValue: { default: void 0 }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const selectedKeyModel = computed(() => props.modelValue ?? "");
    const selected = computed(() => props.tabs.find((tab) => tab.name === selectedKeyModel.value));
    const selectedName = computed(() => selected.value?.label ?? "");
    function handleTabChange(name) {
      emit("update:modelValue", name);
    }
    const selectedKey = computed(() => selectedKeyModel.value);
    const { isMobile, isHeader, size, tabs, disabled } = toRefs(props);
    return (_ctx, _cache) => {
      const _component_s_dropdown_item = resolveComponent("s-dropdown-item");
      const _component_s_dropdown = resolveComponent("s-dropdown");
      const _component_s_tab = resolveComponent("s-tab");
      const _component_s_tabs = resolveComponent("s-tabs");
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["responsive-tabs", { "responsive-tabs__dropdown": unref(isMobile) }])
      }, [
        unref(isMobile) ? (openBlock(), createBlock(_component_s_dropdown, {
          key: 0,
          "popper-class": "responsive-tabs__dropdown-menu",
          type: "button",
          placement: "bottom-start",
          trigger: "hover",
          "append-to-body": false,
          "button-type": "link",
          size: unref(size),
          onSelect: handleTabChange
        }, {
          menu: withCtx(() => [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(tabs), ({ name, label, icon }) => {
              return openBlock(), createBlock(_component_s_dropdown_item, {
                class: normalizeClass(["responsive-tabs__dropdown-item", { selected: name === selectedKey.value }]),
                key: name,
                value: name,
                icon,
                disabled: unref(disabled)
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(label), 1)
                ]),
                _: 2
              }, 1032, ["class", "value", "icon", "disabled"]);
            }), 128))
          ]),
          default: withCtx(() => [
            unref(isHeader) ? (openBlock(), createElementBlock("h3", _hoisted_1, toDisplayString(selectedName.value), 1)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
              createTextVNode(toDisplayString(selectedName.value), 1)
            ], 64))
          ]),
          _: 1
        }, 8, ["size"])) : (openBlock(), createBlock(_component_s_tabs, {
          key: 1,
          class: normalizeClass(["responsive-tabs__tabs", unref(size)]),
          type: "rounded",
          value: selectedKey.value,
          onInput: handleTabChange
        }, {
          default: withCtx(() => [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(tabs), (tab) => {
              return openBlock(), createBlock(_component_s_tab, {
                key: tab.name,
                name: tab.name,
                label: tab.label,
                disabled: unref(disabled)
              }, null, 8, ["name", "label", "disabled"]);
            }), 128))
          ]),
          _: 1
        }, 8, ["class", "value"]))
      ], 2);
    };
  }
});
const ResponsiveTabs = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-28a904ec"]]);
export {
  ResponsiveTabs as default
};
