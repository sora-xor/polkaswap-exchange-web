import { u as useSubscriptions } from "./useSubscriptions-B0wmcRcn.js";
import { z as defineComponent, bF as useAttrs, s as store, aA as watch, a_ as resolveComponent, bz as resolveDirective, bA as withDirectives, aj as unref, am as createBlock, C as openBlock, as as mergeProps, bG as goTo, V as PageNames, h as computed } from "./index-73GArslZ.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    inheritAttrs: false
  },
  __name: "VaultsContainer",
  setup(__props) {
    const subscribeOnCollaterals = () => store.dispatch.vault.subscribeOnCollaterals();
    const subscribeOnAccountVaults = () => store.dispatch.vault.subscribeOnAccountVaults();
    const updateBalanceSubscriptions = () => store.dispatch.vault.updateBalanceSubscriptions();
    const getLiquidationPenalty = () => store.dispatch.vault.getLiquidationPenalty();
    const subscribeOnBorrowTaxes = () => store.dispatch.vault.subscribeOnBorrowTaxes();
    const subscribeOnDebtCalculation = () => store.dispatch.vault.subscribeOnDebtCalculation();
    const resetVaults = () => store.dispatch.vault.reset();
    const attrs = useAttrs();
    const { subscriptionsDataLoading } = useSubscriptions({
      startSubscriptions: [
        subscribeOnCollaterals,
        subscribeOnAccountVaults,
        updateBalanceSubscriptions,
        getLiquidationPenalty,
        subscribeOnBorrowTaxes,
        subscribeOnDebtCalculation
      ],
      resetSubscriptions: [resetVaults]
    });
    const kensetsuEnabled = computed(() => store.getters.settings.kensetsuEnabled);
    watch(
      kensetsuEnabled,
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
      return withDirectives((openBlock(), createBlock(_component_router_view, mergeProps({ class: "vaults-view-container" }, {
        parentLoading: unref(subscriptionsDataLoading),
        ...unref(attrs)
      }), null, 16)), [
        [_directive_loading, unref(subscriptionsDataLoading)]
      ]);
    };
  }
});
export {
  _sfc_main as default
};
