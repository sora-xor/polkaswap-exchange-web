import { z as defineComponent, aZ as components, Y as useWeb3Store, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, h as computed, s as store } from "./index-73GArslZ.js";
import { u as useBridgeStore } from "./index-FPtsBGoq.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogBase: components.DialogBase,
      ConnectionView: components.ConnectionView
    }
  },
  __name: "SelectSubAccount",
  setup(__props) {
    const bridgeStore = useBridgeStore();
    const web3Store = useWeb3Store();
    const visibility = computed({
      get: () => web3Store.subAccountDialogVisibility,
      set: (flag) => store.commit.web3.setSubAccountDialogVisibility(flag)
    });
    const subBridgeConnector = computed(() => bridgeStore.connector);
    const subAccount = computed(() => {
      return web3Store.subAccount ?? {
        address: "",
        name: "",
        source: ""
      };
    });
    const chainApi = computed(() => subBridgeConnector.value.accountApi);
    const logout = () => store.dispatch.web3.resetSubAccount();
    const rename = (payload) => store.dispatch.web3.changeSubAccountName(payload);
    const checkConnectedAccountSource = (source) => {
      if (source && subAccount.value && subAccount.value.source === source) {
        logout();
      }
    };
    const closeView = () => {
      visibility.value = false;
    };
    const login = async (account) => {
      await store.dispatch.web3.selectSubAccount(account);
      closeView();
    };
    return (_ctx, _cache) => {
      const _component_connection_view = resolveComponent("connection-view");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: visibility.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => visibility.value = $event),
        "show-close-button": false,
        "append-to-body": "",
        class: "account-select-dialog",
        "wrapper-class": "account-select-dialog"
      }, {
        default: withCtx(() => [
          createVNode(_component_connection_view, {
            "chain-api": chainApi.value,
            account: subAccount.value,
            "login-account": login,
            "logout-account": logout,
            "rename-account": rename,
            "close-view": closeView,
            "check-connected-account-source": checkConnectedAccountSource,
            "show-close": !subAccount.value.address
          }, null, 8, ["chain-api", "account", "show-close"])
        ]),
        _: 1
      }, 8, ["visible"]);
    };
  }
});
export {
  _sfc_main as default
};
