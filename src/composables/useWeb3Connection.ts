import { computed } from 'vue';

import { useWalletConnect } from '@/composables/useWalletConnect';
import store from '@/store';
import type { AppEIPProvider } from '@/types/evm/provider';
import type { NetworkData } from '@/types/bridge';
import type { Nullable } from '@/types/common';
import type { WALLET_TYPES } from '@wallet';

/**
 * Aggregates web3 connection helpers (EVM + Substrate) and exposes a single
 * interface for connection management, status, and provider selection.
 */
export function useWeb3Connection() {
  const walletConnect = useWalletConnect();

  const evmProviders = computed<AppEIPProvider[]>(() => store.getters.web3.appEvmProviders as AppEIPProvider[]);
  const evmProvider = computed<Nullable<AppEIPProvider>>(() => store.state.web3.evmProvider ?? null);
  const evmAddress = walletConnect.evmAddress;
  const evmProviderLoading = walletConnect.evmProviderLoading;
  const selectedNetwork = computed<Nullable<NetworkData>>(
    () => store.getters.web3.selectedNetwork as Nullable<NetworkData>
  );
  const networkType = walletConnect.networkType;
  const networkSelected = walletConnect.networkSelected;
  const isValidNetwork = computed<boolean>(() => store.getters.web3.isValidNetwork as boolean);

  const subAccount = computed<WALLET_TYPES.PolkadotJsAccount>(() => store.getters.web3.subAccount);
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

  const connectAll = async (provider?: AppEIPProvider) => {
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
    openSubAccountDialog,
  };
}

export type Web3ConnectionComposable = ReturnType<typeof useWeb3Connection>;
