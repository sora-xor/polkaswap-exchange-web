import { u as useWalletConnect } from "./useWalletConnect-CJNIxFYX.js";
import { Y as useWeb3Store, s as store, h as computed } from "./index-73GArslZ.js";
function useWeb3Connection() {
  const walletConnect = useWalletConnect();
  const web3Store = useWeb3Store();
  const evmProviders = computed(() => store.getters.web3.appEvmProviders);
  const evmProvider = computed(() => web3Store.evmProvider);
  const evmAddress = walletConnect.evmAddress;
  const evmProviderLoading = walletConnect.evmProviderLoading;
  const selectedNetwork = computed(() => web3Store.selectedNetworkData);
  const networkType = walletConnect.networkType;
  const networkSelected = walletConnect.networkSelected;
  const isValidNetwork = computed(() => store.getters.web3.isValidNetwork);
  const subAccount = computed(
    () => web3Store.subAccount
  );
  const isEvmConnected = computed(() => Boolean(evmAddress.value));
  const isSubConnected = computed(() => Boolean(subAccount.value?.address));
  const isConnected = computed(() => isEvmConnected.value || isSubConnected.value);
  const isConnecting = computed(() => Boolean(evmProviderLoading.value));
  const connectEvmWallet = walletConnect.connectEvmWallet;
  const connectEvmProvider = walletConnect.connectEvmProvider;
  const disconnectEvmWallet = walletConnect.disconnectEvmWallet;
  const disconnectExternalNetwork = walletConnect.disconnectExternalNetwork;
  const connectSubWallet = walletConnect.connectSubWallet;
  const disconnectSubWallet = walletConnect.disconnectSubWallet;
  const ensureEvmNetwork = walletConnect.changeEvmNetworkProvided;
  const selectEvmProvider = walletConnect.selectEvmProvider;
  const connectAll = async (provider) => {
    await connectEvmWallet(provider);
  };
  const disconnectAll = () => {
    disconnectEvmWallet();
    disconnectExternalNetwork();
    disconnectSubWallet();
  };
  const subscribeOnEvmProviders = () => store.dispatch.web3.subscribeOnEvmProviders();
  const openSelectProviderDialog = () => store.commit.web3.setSelectProviderDialogVisibility(true);
  const openSelectNetworkDialog = () => store.commit.web3.setSelectNetworkDialogVisibility(true);
  const openSubAccountDialog = () => connectSubWallet();
  return {
    ...walletConnect,
    evmProviders,
    evmProvider,
    evmAddress,
    evmProviderLoading,
    networkSelected,
    networkType,
    selectedNetwork,
    isValidNetwork,
    subAccount,
    isEvmConnected,
    isSubConnected,
    isConnected,
    isConnecting,
    connect: connectAll,
    connectEvmWallet,
    connectEvmProvider,
    disconnectEvmWallet,
    disconnectExternalNetwork,
    disconnectSubWallet,
    disconnectAll,
    connectSubWallet,
    ensureEvmNetwork,
    selectEvmProvider,
    subscribeOnEvmProviders,
    openSelectProviderDialog,
    openSelectNetworkDialog,
    openSubAccountDialog
  };
}
export {
  useWeb3Connection as u
};
