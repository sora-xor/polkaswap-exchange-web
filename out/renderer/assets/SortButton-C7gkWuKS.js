import { z as defineComponent, bN as SortDirection, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, A as createElementBlock, C as openBlock, aJ as renderSlot, ap as createVNode, bb as normalizeClass, h as computed } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "SortButton",
  props: {
    name: { default: "" },
    sort: { default: () => ({
      property: "",
      order: SortDirection.DESC
    }) },
    defaultSort: { default: SortDirection.DESC }
  },
  emits: ["change-sort"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const isActive = computed(() => props.name === props.sort.property);
    const computedClasses = computed(() => {
      const base = "sort-icon";
      return isActive.value ? [base, `${base}--active`, `${base}--${props.sort.order}`] : [base];
    });
    function toggleSort() {
      if (!isActive.value) {
        return props.defaultSort;
      }
      return props.sort.order === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC;
    }
    function handleClick() {
      emit("change-sort", {
        property: props.name,
        order: toggleSort()
      });
    }
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _directive_button = resolveDirective("button");
      return withDirectives((openBlock(), createElementBlock("div", {
        class: "sort-button",
        onClick: handleClick
      }, [
        renderSlot(_ctx.$slots, "default"),
        createVNode(_component_s_icon, {
          name: "arrows-chevron-top-rounded-24",
          class: normalizeClass(computedClasses.value)
        }, null, 8, ["class"])
      ])), [
        [_directive_button]
      ]);
    };
  }
});
export {
  _sfc_main as default
};
