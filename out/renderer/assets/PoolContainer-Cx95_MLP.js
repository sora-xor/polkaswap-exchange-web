import { u as useSubscriptions } from "./useSubscriptions-B0wmcRcn.js";
import { z as defineComponent, bF as useAttrs, s as store, a_ as resolveComponent, am as createBlock, C as openBlock, bH as normalizeProps, bI as guardReactiveProps, h as computed } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "PoolContainer",
  setup(__props) {
    const attrs = useAttrs();
    const { subscriptionsDataLoading } = useSubscriptions({
      startSubscriptions: [
        () => store.dispatch.pool.subscribeOnAccountLiquidityList(),
        () => store.dispatch.pool.subscribeOnAccountLiquidityUpdates(),
        () => store.dispatch.pool.subscribeOnAccountLockedLiquidity(),
        () => store.dispatch.pool.subscribeOnPoolsApy()
      ],
      resetSubscriptions: [() => store.dispatch.pool.unsubscribeAccountLiquidityListAndUpdates()]
    });
    const forwardedAttrs = computed(() => ({
      parentLoading: subscriptionsDataLoading.value,
      ...attrs
    }));
    return (_ctx, _cache) => {
      const _component_router_view = resolveComponent("router-view");
      return openBlock(), createBlock(_component_router_view, normalizeProps(guardReactiveProps(forwardedAttrs.value)), null, 16);
    };
  }
});
export {
  _sfc_main as default
};
