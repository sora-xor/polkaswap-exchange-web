import { z as defineComponent, aZ as components, u as useTranslation, bu as useModel, s as store, a9 as ref, a2 as PredefinedProvider, aA as watch, ac as onScopeDispose, a_ as resolveComponent, am as createBlock, C as openBlock, ao as withCtx, ap as createVNode, h as computed, aj as unref } from "./index-73GArslZ.js";
import { u as useWeb3Connection } from "./useWeb3Connection-eheLMuCm.js";
import "./useWalletConnect-CJNIxFYX.js";
import "./index-FPtsBGoq.js";
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    components: {
      DialogBase: components.DialogBase,
      ExtensionConnectionList: components.ExtensionConnectionList
    }
  },
  __name: "SelectProvider",
  props: {
    "visible": { type: Boolean, ...{
      default: false
    } },
    "visibleModifiers": {}
  },
  emits: ["update:visible"],
  setup(__props) {
    const { t } = useTranslation();
    const { connectEvmProvider, evmProvider, evmProviderLoading, subscribeOnEvmProviders } = useWeb3Connection();
    const visible = useModel(__props, "visible", {
      get(value) {
        return store.state.web3.selectProviderDialogVisibility;
      },
      set(value) {
        store.commit.web3.setSelectProviderDialogVisibility(value);
        return value;
      }
    });
    const appEvmProviders = ref(store.getters.web3.appEvmProviders);
    const recommendedWallets = [PredefinedProvider.Fearless];
    let unsubscribeProviders = null;
    const updateProviders = async (nextVisible) => {
      if (nextVisible) {
        unsubscribeProviders = await subscribeOnEvmProviders();
      } else {
        unsubscribeProviders?.();
        unsubscribeProviders = null;
      }
    };
    watch(
      () => store.getters.web3.appEvmProviders,
      (providers) => {
        appEvmProviders.value = providers;
      }
    );
    watch(
      visible,
      (next) => {
        void updateProviders(next);
      },
      { immediate: true }
    );
    onScopeDispose(() => {
      unsubscribeProviders?.();
    });
    const wallets = computed(
      () => appEvmProviders.value.map((provider) => ({
        extensionName: provider.uuid,
        title: provider.name,
        logo: {
          src: provider.icon,
          alt: provider.name
        },
        installed: provider.installed,
        installUrl: provider.installUrl
      }))
    );
    const connectedWallet = computed(() => evmProvider.value?.uuid ?? null);
    const loadingWallet = computed(() => evmProviderLoading.value?.uuid ?? null);
    const selectedWallet = computed(() => loadingWallet.value ?? connectedWallet.value);
    const selectedWalletLoading = computed(
      () => !!loadingWallet.value && !!selectedWallet.value && loadingWallet.value === selectedWallet.value
    );
    async function handleSelectProvider(wallet) {
      const provider = appEvmProviders.value.find((item) => item.uuid === wallet.extensionName);
      if (!provider) return;
      await connectEvmProvider(provider);
      visible.value = false;
    }
    return (_ctx, _cache) => {
      const _component_extension_connection_list = resolveComponent("extension-connection-list");
      const _component_dialog_base = resolveComponent("dialog-base");
      return openBlock(), createBlock(_component_dialog_base, {
        visible: visible.value,
        "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => visible.value = $event),
        title: unref(t)("connectEthereumWalletText"),
        "append-to-body": ""
      }, {
        default: withCtx(() => [
          createVNode(_component_extension_connection_list, {
            "show-disclaimer": "",
            wallets: wallets.value,
            "recommended-wallets": recommendedWallets,
            "connected-wallet": connectedWallet.value,
            "selected-wallet": selectedWallet.value,
            "selected-wallet-loading": selectedWalletLoading.value,
            onSelect: handleSelectProvider
          }, null, 8, ["wallets", "connected-wallet", "selected-wallet", "selected-wallet-loading"])
        ]),
        _: 1
      }, 8, ["visible", "title"]);
    };
  }
});
export {
  _sfc_main as default
};
