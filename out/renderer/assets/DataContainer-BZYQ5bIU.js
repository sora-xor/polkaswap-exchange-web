import { u as useSubscriptions } from "./useSubscriptions-B0wmcRcn.js";
import { z as defineComponent, s as store, a_ as resolveComponent, am as createBlock, C as openBlock, bH as normalizeProps, bI as guardReactiveProps, aj as unref } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    inheritAttrs: false
  },
  __name: "DataContainer",
  setup(__props) {
    const subscribeOnPools = () => store.dispatch.demeterFarming.subscribeOnPools();
    const subscribeOnTokens = () => store.dispatch.demeterFarming.subscribeOnTokens();
    const subscribeOnAccountPools = () => store.dispatch.demeterFarming.subscribeOnAccountPools();
    const unsubscribeDemeter = () => store.dispatch.demeterFarming.unsubscribeUpdates();
    const getValidatorsInfo = () => store.dispatch.staking.getValidatorsInfo();
    const getStakingInfo = () => store.dispatch.staking.getStakingInfo();
    const { subscriptionsDataLoading } = useSubscriptions({
      startSubscriptions: [subscribeOnPools, subscribeOnTokens, subscribeOnAccountPools, getValidatorsInfo, getStakingInfo],
      resetSubscriptions: [unsubscribeDemeter]
    });
    return (_ctx, _cache) => {
      const _component_router_view = resolveComponent("router-view");
      return openBlock(), createBlock(_component_router_view, normalizeProps(guardReactiveProps({
        parentLoading: unref(subscriptionsDataLoading),
        ..._ctx.$attrs
      })), null, 16);
    };
  }
});
export {
  _sfc_main as default
};
