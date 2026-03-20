import { z as defineComponent, ak as lazyComponent, aZ as components, bF as useAttrs, G as useInternalConnect, R as useBridgeTransactionsStore, Y as useWeb3Store, I as storeToRefs, aA as watch, bJ as isEqual, h as computed, aB as onBeforeUnmount, a_ as resolveComponent, A as createElementBlock, C as openBlock, ap as createVNode, bH as normalizeProps, bI as guardReactiveProps, aj as unref, al as Components, s as store } from "./index-73GArslZ.js";
import { u as useSubscriptions } from "./useSubscriptions-B0wmcRcn.js";
import { u as useWeb3Connection } from "./useWeb3Connection-eheLMuCm.js";
import { u as useBridgeStore } from "./index-FPtsBGoq.js";
import "./useWalletConnect-CJNIxFYX.js";
const _hoisted_1 = { class: "bridge-container" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      ConfirmDialog: components.ConfirmDialog,
      BridgeSelectNetwork: lazyComponent(Components.BridgeSelectNetwork),
      SelectProviderDialog: lazyComponent(Components.SelectProviderDialog)
    }
  },
  __name: "BridgeContainer",
  setup(__props) {
    const attrs = useAttrs();
    const { disconnectExternalNetwork } = useWeb3Connection();
    const { soraAddress } = useInternalConnect();
    const bridgeStore = useBridgeStore();
    const bridgeTransactionsStore = useBridgeTransactionsStore();
    const web3Store = useWeb3Store();
    const { isSignTxDialogVisible } = storeToRefs(bridgeTransactionsStore);
    const selectedNetwork = computed(() => web3Store.selectedNetworkData);
    const externalAccount = computed(() => bridgeStore.externalAccount);
    const subAccount = computed(() => web3Store.subAccount);
    const subBridgeConnector = computed(() => bridgeStore.connector);
    const chainApi = computed(() => subBridgeConnector.value?.accountApi);
    const setSignTxDialogVisibility = (flag) => {
      bridgeStore.setSignTxDialogVisibility(flag);
    };
    const getSupportedApps = () => store.dispatch.web3.getSupportedApps();
    const restoreSelectedNetwork = () => store.dispatch.web3.restoreSelectedNetwork();
    const updateExternalBalance = () => bridgeStore.updateExternalBalance();
    const subscribeOnBlockUpdates = () => bridgeStore.subscribeOnBlockUpdates();
    const updateOutgoingMaxLimit = () => bridgeStore.updateOutgoingMaxLimit();
    const resetBridgeForm = () => bridgeStore.resetBridgeForm();
    const resetBlockUpdatesSubscription = () => bridgeStore.resetBlockUpdatesSubscription();
    const resetOutgoingMaxLimitSubscription = () => bridgeStore.resetOutgoingMaxLimitSubscription();
    let restoreSelectedNetworkTask = null;
    const scheduleRestoreSelectedNetwork = () => {
      if (!restoreSelectedNetworkTask) {
        restoreSelectedNetworkTask = restoreSelectedNetwork().finally(() => {
          restoreSelectedNetworkTask = null;
        });
      }
      return restoreSelectedNetworkTask;
    };
    const updateBridgeApps = async () => {
      void scheduleRestoreSelectedNetwork();
      await getSupportedApps();
    };
    const { subscriptionsDataLoading, trackLogin } = useSubscriptions({
      startSubscriptions: [subscribeOnBlockUpdates, updateOutgoingMaxLimit, updateBridgeApps],
      resetSubscriptions: [resetBlockUpdatesSubscription, resetOutgoingMaxLimitSubscription]
    });
    trackLogin.value = false;
    watch(selectedNetwork, (curr, prev) => {
      if (curr && prev && !isEqual(curr)(prev)) {
        void resetBridgeForm();
      }
    });
    watch([soraAddress, externalAccount], () => {
      void updateExternalBalance();
    });
    onBeforeUnmount(() => {
      disconnectExternalNetwork();
    });
    const forwardedAttrs = computed(() => ({
      parentLoading: subscriptionsDataLoading.value,
      ...attrs
    }));
    return (_ctx, _cache) => {
      const _component_router_view = resolveComponent("router-view");
      const _component_confirm_dialog = resolveComponent("confirm-dialog");
      const _component_bridge_select_network = resolveComponent("bridge-select-network");
      const _component_select_provider_dialog = resolveComponent("select-provider-dialog");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_router_view, normalizeProps(guardReactiveProps(forwardedAttrs.value)), null, 16),
        createVNode(_component_confirm_dialog, {
          "chain-api": chainApi.value,
          account: subAccount.value,
          visibility: unref(isSignTxDialogVisible),
          "set-visibility": setSignTxDialogVisibility
        }, null, 8, ["chain-api", "account", "visibility"]),
        createVNode(_component_bridge_select_network),
        createVNode(_component_select_provider_dialog)
      ]);
    };
  }
});
export {
  _sfc_main as default
};
