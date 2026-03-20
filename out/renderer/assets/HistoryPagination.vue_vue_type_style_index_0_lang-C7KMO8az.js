import { z as defineComponent, u as useTranslation, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, D as createBaseVNode, ap as createVNode, aN as toDisplayString, h as computed, aj as unref, bR as PaginationButton } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "el-pagination__total" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "HistoryPagination",
  props: {
    currentPage: { default: 1 },
    pageAmount: { default: 10 },
    total: { default: 0 },
    loading: { type: Boolean, default: false },
    lastPage: { default: 1 }
  },
  emits: ["pagination-click"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const totalText = computed(() => {
      const upperNumber = props.pageAmount * props.currentPage;
      const lowerBound = upperNumber - props.pageAmount + 1;
      const upperBound = upperNumber > props.total ? props.total : upperNumber;
      return t("ofText", {
        first: `${lowerBound}-${upperBound}`,
        second: props.total
      });
    });
    const disabledFirstPrev = computed(() => props.currentPage === 1 || Boolean(props.loading));
    const disabledNextLast = computed(() => props.currentPage === props.lastPage || Boolean(props.loading));
    const handlePaginationClick = (button) => {
      emit("pagination-click", button);
    };
    __expose({
      handlePaginationClick
    });
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      const _component_s_pagination = resolveComponent("s-pagination");
      return openBlock(), createBlock(_component_s_pagination, {
        class: "history-pagination",
        layout: "slot",
        "current-page": __props.currentPage,
        "page-size": __props.pageAmount
      }, {
        default: withCtx(() => [
          createBaseVNode("span", _hoisted_1, toDisplayString(totalText.value), 1),
          createVNode(_component_s_button, {
            type: "link",
            tooltip: unref(t)("firstText"),
            disabled: disabledFirstPrev.value,
            onClick: _cache[0] || (_cache[0] = ($event) => handlePaginationClick(unref(PaginationButton).First))
          }, {
            default: withCtx(() => [
              createVNode(_component_s_icon, {
                name: "chevrons-left-16",
                size: "14"
              })
            ]),
            _: 1
          }, 8, ["tooltip", "disabled"]),
          createVNode(_component_s_button, {
            type: "link",
            tooltip: unref(t)("prevText"),
            disabled: disabledFirstPrev.value,
            onClick: _cache[1] || (_cache[1] = ($event) => handlePaginationClick(unref(PaginationButton).Prev))
          }, {
            default: withCtx(() => [
              createVNode(_component_s_icon, {
                name: "chevron-left-16",
                size: "14"
              })
            ]),
            _: 1
          }, 8, ["tooltip", "disabled"]),
          createVNode(_component_s_button, {
            type: "link",
            tooltip: unref(t)("nextText"),
            disabled: disabledNextLast.value,
            onClick: _cache[2] || (_cache[2] = ($event) => handlePaginationClick(unref(PaginationButton).Next))
          }, {
            default: withCtx(() => [
              createVNode(_component_s_icon, {
                name: "chevron-right-16",
                size: "14"
              })
            ]),
            _: 1
          }, 8, ["tooltip", "disabled"]),
          createVNode(_component_s_button, {
            type: "link",
            tooltip: unref(t)("lastText"),
            disabled: disabledNextLast.value,
            onClick: _cache[3] || (_cache[3] = ($event) => handlePaginationClick(unref(PaginationButton).Last))
          }, {
            default: withCtx(() => [
              createVNode(_component_s_icon, {
                name: "chevrons-right-16",
                size: "14"
              })
            ]),
            _: 1
          }, 8, ["tooltip", "disabled"])
        ]),
        _: 1
      }, 8, ["current-page", "page-size"]);
    };
  }
});
export {
  _sfc_main as _
};
