const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./PointSystem-BNl99W1q.js","./index-73GArslZ.js","./index-CsTIO-Ll.css","./burnXor-CuYTXNGC.js","./pointSystem-CMl5Ycuh.js","./useFormattedAmount-D-xkdlPs.js","./PointSystem-BAXaIcNC.css","./PointSystemV2-BXJZBb7x.js","./pointSystem-B9fONsCS.js","./tabs-xjDSPYBb.js","./PointSystemV2-SjCKNLVX.css"])))=>i.map(i=>d[i]);
import { z as defineComponent, e as useSettingsStore, bK as defineAsyncComponent, h as computed, am as createBlock, C as openBlock, bL as resolveDynamicComponent, bM as __vitePreload } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "PointSystemWrapper",
  setup(__props, { expose: __expose }) {
    const PointSystemComponent = defineAsyncComponent(() => __vitePreload(() => import("./PointSystem-BNl99W1q.js"), true ? __vite__mapDeps([0,1,2,3,4,5,6]) : void 0, import.meta.url));
    const PointSystemV2Component = defineAsyncComponent(() => __vitePreload(() => import("./PointSystemV2-BXJZBb7x.js"), true ? __vite__mapDeps([7,1,2,8,9,4,5,10]) : void 0, import.meta.url));
    const settingsStore = useSettingsStore();
    const componentToRender = computed(() => settingsStore.pointSystemV2 ? PointSystemV2Component : PointSystemComponent);
    __expose({
      // Exposed for unit tests to assert which loader is active without instantiating the async component.
      componentToRender,
      legacyLoader: PointSystemComponent,
      v2Loader: PointSystemV2Component
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(resolveDynamicComponent(componentToRender.value));
    };
  }
});
export {
  _sfc_main as default
};
