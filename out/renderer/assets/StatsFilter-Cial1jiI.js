import { z as defineComponent, cl as watchEffect, c0 as toRef, a9 as ref, aB as onBeforeUnmount, a4 as onMounted, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, bA as withDirectives, ao as withCtx, aO as createTextVNode, aN as toDisplayString, h as computed, bb as normalizeClass, bB as vShow, D as createBaseVNode, bQ as Fragment, bP as renderList, am as createBlock, aP as _export_sfc } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "stats-filter-menu stats-filter-list" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{ name: "StatsFilter" },
  __name: "StatsFilter",
  props: {
    filters: { default: () => [] },
    disabled: { type: Boolean, default: false },
    modelValue: { default: void 0 }
  },
  emits: ["update:modelValue"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const root = ref(null);
    const visibility = ref(false);
    const selectedFilter = computed(() => props.modelValue ?? props.filters[0] ?? null);
    const filterModel = computed({
      get: () => selectedFilter.value,
      set: (value) => {
        emit("update:modelValue", value);
      }
    });
    const currentFilter = computed(() => filterModel.value);
    const isDisabled = toRef(props, "disabled");
    const closeMenu = () => {
      visibility.value = false;
      removeListener();
    };
    const handleViewportOrNavigationChange = () => {
      if (!visibility.value) return;
      closeMenu();
    };
    const handleClickOutside = (event) => {
      const target = event.target;
      if (!target) return;
      const container = root.value;
      if (!container) return;
      if (!container.contains(target)) {
        closeMenu();
      }
    };
    const supportsPointerEvents = typeof window !== "undefined" && "PointerEvent" in window;
    const addListener = () => {
      const doc = root.value?.ownerDocument ?? document;
      if (supportsPointerEvents) {
        doc.addEventListener("pointerdown", handleClickOutside);
      } else {
        doc.addEventListener("click", handleClickOutside);
        doc.addEventListener("touchstart", handleClickOutside);
      }
    };
    const removeListener = () => {
      const doc = root.value?.ownerDocument ?? document;
      if (supportsPointerEvents) {
        doc.removeEventListener("pointerdown", handleClickOutside);
      } else {
        doc.removeEventListener("click", handleClickOutside);
        doc.removeEventListener("touchstart", handleClickOutside);
      }
    };
    watchEffect(
      () => {
        if (isDisabled.value && visibility.value) {
          closeMenu();
        }
      },
      { flush: "post" }
    );
    onBeforeUnmount(() => {
      removeListener();
      window.removeEventListener("resize", handleViewportOrNavigationChange);
      window.removeEventListener("hashchange", handleViewportOrNavigationChange);
      window.removeEventListener("popstate", handleViewportOrNavigationChange);
    });
    onMounted(() => {
      window.addEventListener("resize", handleViewportOrNavigationChange);
      window.addEventListener("hashchange", handleViewportOrNavigationChange);
      window.addEventListener("popstate", handleViewportOrNavigationChange);
    });
    const toggleMenu = () => {
      if (props.disabled) return;
      visibility.value = !visibility.value;
      if (visibility.value) {
        addListener();
      } else {
        removeListener();
      }
    };
    const setValue = (name) => {
      const nextFilter = props.filters.find((item) => item.name === name);
      if (!nextFilter) return;
      filterModel.value = nextFilter;
      closeMenu();
    };
    __expose({
      visibility,
      closeMenu,
      toggleMenu
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createElementBlock("div", {
        ref_key: "root",
        ref: root,
        class: "stats-filter"
      }, [
        createVNode(_component_s_button, {
          type: "link",
          size: "small",
          class: "stats-filter-button",
          disabled: __props.disabled,
          onClick: toggleMenu
        }, {
          default: withCtx(() => [
            createTextVNode(toDisplayString(currentFilter.value?.label) + " ", 1),
            createVNode(_component_s_icon, {
              name: "el-icon-arrow-down",
              size: "12px",
              class: normalizeClass(["stats-filter-button-icon", { opened: visibility.value }])
            }, null, 8, ["class"])
          ]),
          _: 1
        }, 8, ["disabled"]),
        withDirectives(createBaseVNode("div", _hoisted_1, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(__props.filters, ({ name, label }) => {
            return openBlock(), createBlock(_component_s_button, {
              key: name,
              type: "link",
              size: "small",
              class: normalizeClass(["stats-filter-list-item", { "s-pressed": name === currentFilter.value?.name }]),
              onClick: ($event) => setValue(name)
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(label), 1)
              ]),
              _: 2
            }, 1032, ["class", "onClick"]);
          }), 128))
        ], 512), [
          [vShow, visibility.value]
        ])
      ], 512);
    };
  }
});
const StatsFilter = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-43f854e8"]]);
export {
  StatsFilter as default
};
