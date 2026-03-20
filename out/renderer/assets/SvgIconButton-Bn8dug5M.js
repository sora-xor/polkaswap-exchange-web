const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./Line-D_Lrhq4p.js","./index-73GArslZ.js","./index-CsTIO-Ll.css","./Candle-CigbD6WI.js"])))=>i.map(i=>d[i]);
import { z as defineComponent, bK as defineAsyncComponent, bF as useAttrs, h as computed, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, bL as resolveDynamicComponent, as as mergeProps, aj as unref, bM as __vitePreload } from "./index-73GArslZ.js";
import { S as SvgIcons } from "./icons-Dp8k03eO.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "SvgIconButton",
    inheritAttrs: false
  },
  __name: "SvgIconButton",
  props: {
    active: { type: Boolean, default: false },
    icon: { default: void 0 }
  },
  setup(__props, { expose: __expose }) {
    const createIconLoader = (loader) => defineAsyncComponent({
      loader,
      suspensible: false
    });
    const iconComponents = {
      [SvgIcons.LineIcon]: createIconLoader(() => __vitePreload(() => import("./Line-D_Lrhq4p.js"), true ? __vite__mapDeps([0,1,2]) : void 0, import.meta.url)),
      [SvgIcons.CandleIcon]: createIconLoader(() => __vitePreload(() => import("./Candle-CigbD6WI.js"), true ? __vite__mapDeps([3,1,2]) : void 0, import.meta.url))
    };
    const props = __props;
    const attrs = useAttrs();
    const classes = computed(() => ["svg-icon-button", { "s-pressed": props.active }]);
    const iconComponent = computed(() => props.icon ? iconComponents[props.icon] ?? null : null);
    __expose({
      classes,
      iconComponent
    });
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      return openBlock(), createBlock(_component_s_button, mergeProps({
        class: classes.value,
        type: "action"
      }, unref(attrs)), {
        icon: withCtx(() => [
          (openBlock(), createBlock(resolveDynamicComponent(iconComponent.value)))
        ]),
        _: 1
      }, 16, ["class"]);
    };
  }
});
export {
  _sfc_main as default
};
