import { z as defineComponent, ak as lazyComponent, u as useTranslation, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, aj as unref, aO as createTextVNode, aN as toDisplayString, al as Components, s as store, aP as _export_sfc } from "./index-73GArslZ.js";
import { u as useNetworkFormatter } from "./useNetworkFormatter-Cuwa7_ot.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "BridgeNetworkSelector",
    components: {
      SwapStatusActionBadge: lazyComponent(Components.SwapStatusActionBadge)
    }
  },
  __name: "NetworkSelector",
  setup(__props) {
    const { t } = useTranslation();
    const { selectedNetworkShortName } = useNetworkFormatter();
    function handleChangeNetwork() {
      store.commit.web3.setSelectNetworkDialogVisibility(true);
    }
    return (_ctx, _cache) => {
      const _component_s_button = resolveComponent("s-button");
      const _component_swap_status_action_badge = resolveComponent("swap-status-action-badge");
      return openBlock(), createBlock(_component_swap_status_action_badge, null, {
        value: withCtx(() => [
          createTextVNode(toDisplayString(unref(selectedNetworkShortName)), 1)
        ]),
        action: withCtx(() => [
          createVNode(_component_s_button, {
            class: "el-button--settings",
            type: "action",
            icon: "basic-settings-24",
            tooltip: unref(t)("bridge.selectNetwork"),
            "tooltip-placement": "bottom-end",
            onClick: handleChangeNetwork
          }, null, 8, ["tooltip"])
        ]),
        _: 1
      });
    };
  }
});
const NetworkSelector = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e9417adc"]]);
export {
  NetworkSelector as default
};
