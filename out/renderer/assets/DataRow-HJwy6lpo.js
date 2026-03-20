import { z as defineComponent, cj as SSkeletonItem, ck as SSkeleton, am as createBlock, C as openBlock, ao as withCtx, aJ as renderSlot, D as createBaseVNode, aM as createCommentVNode, aj as unref } from "./index-73GArslZ.js";
const _hoisted_1 = { class: "data-row-skeleton" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "DataRowSkeleton",
    components: {
      SSkeleton,
      SSkeletonItem
    }
  },
  __name: "DataRow",
  props: {
    loading: { type: Boolean, default: true },
    rect: { type: Boolean, default: false },
    circle: { type: Boolean, default: false }
  },
  setup(__props) {
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(SSkeleton), {
        loading: __props.loading,
        animated: ""
      }, {
        template: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            __props.rect ? (openBlock(), createBlock(unref(SSkeletonItem), {
              key: 0,
              element: "rect"
            })) : createCommentVNode("", true),
            __props.circle ? (openBlock(), createBlock(unref(SSkeletonItem), {
              key: 1,
              element: "circle"
            })) : createCommentVNode("", true)
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
