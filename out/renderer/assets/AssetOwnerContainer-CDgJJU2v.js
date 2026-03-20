import { u as useSubscriptions } from "./useSubscriptions-B0wmcRcn.js";
import { z as defineComponent, bF as useAttrs, e as useSettingsStore, aA as watch, bG as goTo, V as PageNames, h as computed, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, aj as unref, am as createBlock, C as openBlock, bH as normalizeProps, bI as guardReactiveProps, s as store } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AssetOwnerContainer",
  setup(__props) {
    const attrs = useAttrs();
    const subscribeOnOwnedAssets = async () => {
      await store.dispatch.dashboard.subscribeOnOwnedAssets();
    };
    const resetOwnedAssets = async () => {
      await store.dispatch.dashboard.reset();
    };
    const { subscriptionsDataLoading } = useSubscriptions({
      startSubscriptions: [subscribeOnOwnedAssets],
      resetSubscriptions: [resetOwnedAssets]
    });
    const forwardedAttrs = computed(() => ({
      parentLoading: subscriptionsDataLoading.value,
      ...attrs
    }));
    const settingsStore = useSettingsStore();
    const assetOwnerEnabled = computed(() => settingsStore.assetOwnerEnabled);
    watch(
      assetOwnerEnabled,
      (value) => {
        if (value === false) {
          goTo(PageNames.Swap);
        }
      },
      { immediate: true }
    );
    return (_ctx, _cache) => {
      const _component_router_view = resolveComponent("router-view");
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createBlock(_component_router_view, normalizeProps(guardReactiveProps(forwardedAttrs.value)), null, 16)), [
        [_directive_loading, unref(subscriptionsDataLoading)]
      ]);
    };
  }
});
export {
  _sfc_main as default
};
