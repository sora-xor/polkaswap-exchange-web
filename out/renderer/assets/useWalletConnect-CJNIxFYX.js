import { u as useTranslation, $ as getCurrentInstance, Y as useWeb3Store, s as store, h as computed, a0 as handleRpcProviderError, W as router, a1 as installExtensionKey, a2 as PredefinedProvider, a3 as WalletConnectProvider } from "./index-73GArslZ.js";
import { u as useBridgeStore } from "./index-FPtsBGoq.js";
function useWalletConnect() {
  const { t, te } = useTranslation();
  const instance = getCurrentInstance();
  const alert = instance?.proxy?.$alert;
  const bridgeStore = useBridgeStore();
  const web3Store = useWeb3Store();
  const evmProvider = computed(() => web3Store.evmProvider ?? null);
  const evmProviderLoading = computed(() => web3Store.evmProviderLoading ?? null);
  const evmAddress = computed(() => web3Store.evmAddress ?? "");
  const networkSelected = computed(() => web3Store.networkSelected);
  const networkType = computed(() => web3Store.networkType);
  const appEvmProviders = computed(() => store.getters.web3.appEvmProviders);
  const isSubBridge = computed(() => bridgeStore.isSubBridge);
  const isSubAccountType = computed(() => bridgeStore.isSubAccountType);
  const isSubBridgeConnectorReady = computed(
    () => Boolean(bridgeStore.connector?.network?.subNetworkConnection?.nodeIsConnected)
  );
  const connectSubWallet = () => {
    if (isSubBridge.value && !isSubBridgeConnectorReady.value) {
      store.commit.web3.setSelectSubNodeDialogVisibility(true);
      return;
    }
    store.commit.web3.setSubAccountDialogVisibility(true);
  };
  const resolveTargetProvider = (requested) => {
    if (requested) return requested;
    if (evmProvider.value) return evmProvider.value;
    const installed = appEvmProviders.value.filter((provider) => provider.installed);
    const preferredInstalled = installed.find((provider) => provider.uuid !== PredefinedProvider.WalletConnect);
    if (preferredInstalled) {
      return preferredInstalled;
    }
    const walletConnect = appEvmProviders.value.find((provider) => provider.uuid === PredefinedProvider.WalletConnect);
    return walletConnect ?? WalletConnectProvider;
  };
  const connectEvmWallet = async (provider) => {
    const target = resolveTargetProvider(provider ?? null);
    await connectEvmProvider(target);
  };
  const disconnectExternalNetwork = () => store.dispatch.web3.disconnectExternalNetwork();
  const disconnectEvmWallet = () => store.dispatch.web3.resetEvmProviderConnection();
  const disconnectSubWallet = () => store.dispatch.web3.resetSubAccount();
  const changeEvmNetworkProvided = () => store.dispatch.web3.changeEvmNetworkProvided();
  const selectEvmProvider = (provider) => store.dispatch.web3.selectEvmProvider(provider);
  const getEvmProviderIcon = (provider) => provider.icon;
  const connectEvmProvider = async (provider) => {
    try {
      await selectEvmProvider(provider);
    } catch (error) {
      const key = te(error.message) ? error.message : handleRpcProviderError(error);
      const message = t(key, { name: provider.name });
      const showCancelButton = key === installExtensionKey;
      alert?.(message, {
        showCancelButton,
        cancelButtonText: t("provider.messages.reloadPage"),
        callback: (action) => {
          if (action === "cancel") {
            router.go(0);
          }
        }
      });
    }
  };
  return {
    evmProvider,
    evmProviderLoading,
    evmAddress,
    networkSelected,
    networkType,
    isSubBridge,
    isSubAccountType,
    connectSubWallet,
    connectEvmWallet,
    connectEvmProvider,
    disconnectExternalNetwork,
    disconnectEvmWallet,
    disconnectSubWallet,
    changeEvmNetworkProvided,
    selectEvmProvider,
    getEvmProviderIcon
  };
}
export {
  useWalletConnect as u
};
