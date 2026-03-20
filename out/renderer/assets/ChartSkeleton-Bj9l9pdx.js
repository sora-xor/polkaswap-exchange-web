import { z as defineComponent, cj as SSkeletonItem, ck as SSkeleton, u as useTranslation, a_ as resolveComponent, bz as resolveDirective, am as createBlock, C as openBlock, ao as withCtx, aJ as renderSlot, bA as withDirectives, A as createElementBlock, D as createBaseVNode, ap as createVNode, aj as unref, aM as createCommentVNode, bQ as Fragment, bP as renderList, bb as normalizeClass, h as computed, aO as createTextVNode, aN as toDisplayString } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "charts-skeleton" };
const _hoisted_2 = { class: "charts-skeleton-header" };
const _hoisted_3 = { class: "charts-skeleton-price-impact" };
const _hoisted_4 = { class: "charts-skeleton-container chart" };
const _hoisted_5 = {
  key: 0,
  class: "app-loading-overlay"
};
const _hoisted_6 = {
  key: 2,
  class: "charts-skeleton-error"
};
const _hoisted_7 = { class: "charts-skeleton-error-message" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "ChartSkeleton",
    components: {
      SSkeleton,
      SSkeletonItem
    }
  },
  __name: "ChartSkeleton",
  props: {
    loading: { type: Boolean, default: false },
    isEmpty: { type: Boolean, default: false },
    isError: { type: Boolean, default: false },
    yLabel: { type: Boolean, default: true },
    xLabel: { type: Boolean, default: true },
    yTick: { default: 9 },
    xTick: { default: 11 }
  },
  emits: ["retry"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const { t } = useTranslation();
    const hasIssue = computed(() => !props.loading && (props.isError || props.isEmpty));
    const handleRetry = () => {
      emit("retry");
    };
    return (_ctx, _cache) => {
      const _component_s_icon = resolveComponent("s-icon");
      const _component_s_button = resolveComponent("s-button");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createBlock(unref(SSkeleton), {
        class: "charts-container",
        loading: __props.loading || hasIssue.value,
        throttle: 0
      }, {
        template: withCtx(() => [
          withDirectives((openBlock(), createElementBlock("div", _hoisted_1, [
            createBaseVNode("div", _hoisted_2, [
              createVNode(unref(SSkeletonItem), {
                element: "rect",
                class: "charts-skeleton-price"
              }),
              createBaseVNode("div", _hoisted_3, [
                createVNode(unref(SSkeletonItem), { element: "circle" }),
                createVNode(unref(SSkeletonItem), { element: "rect" })
              ])
            ]),
            createBaseVNode("div", _hoisted_4, [
              __props.loading ? (openBlock(), createElementBlock("div", _hoisted_5, [..._cache[0] || (_cache[0] = [
                createBaseVNode("div", { class: "app-loading-overlay__spinner" }, null, -1)
              ])])) : createCommentVNode("", true),
              (openBlock(true), createElementBlock(Fragment, null, renderList(__props.yTick, (i) => {
                return openBlock(), createElementBlock("div", {
                  key: i,
                  class: "charts-skeleton-line"
                }, [
                  __props.yLabel ? (openBlock(), createBlock(unref(SSkeletonItem), {
                    key: 0,
                    element: "rect",
                    class: "charts-skeleton-label"
                  })) : createCommentVNode("", true),
                  createVNode(unref(SSkeletonItem), {
                    element: "rect",
                    class: "charts-skeleton-border"
                  })
                ]);
              }), 128)),
              __props.xLabel ? (openBlock(), createElementBlock("div", {
                key: 1,
                class: normalizeClass(["charts-skeleton-line", "charts-skeleton-line--lables", { offset: __props.yLabel }])
              }, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(__props.xTick, (i) => {
                  return openBlock(), createBlock(unref(SSkeletonItem), {
                    key: i,
                    element: "rect",
                    class: "charts-skeleton-label"
                  });
                }), 128))
              ], 2)) : createCommentVNode("", true),
              hasIssue.value ? (openBlock(), createElementBlock("div", _hoisted_6, [
                __props.isError ? (openBlock(), createBlock(_component_s_icon, {
                  key: 0,
                  name: "clear-X-16",
                  size: "32px"
                })) : createCommentVNode("", true),
                createBaseVNode("p", _hoisted_7, [
                  __props.isError ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                    createTextVNode(toDisplayString(unref(t)("swap.errorFetching")), 1)
                  ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                    createTextVNode(toDisplayString(unref(t)("noDataText")), 1)
                  ], 64))
                ]),
                __props.isError ? (openBlock(), createBlock(_component_s_button, {
                  key: 1,
                  type: "secondary",
                  size: "small",
                  onClick: handleRetry
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(unref(t)("retryText")), 1)
                  ]),
                  _: 1
                })) : createCommentVNode("", true)
              ])) : createCommentVNode("", true)
            ])
          ])), [
            [_directive_loading, __props.loading]
          ])
        ]),
        default: withCtx(() => [
          renderSlot(_ctx.$slots, "default")
        ]),
        _: 3
      }, 8, ["loading"]);
    };
  }
});
export {
  _sfc_main as default
};
