import { computed } from 'vue';

import { useWalletConnect } from '@/composables/useWalletConnect';
import pinia from '@/plugins/pinia';
import { useWeb3Store } from '@/stores/web3';
import type { AppEIPProvider } from '@/types/evm/provider';
import type { NetworkData } from '@/types/bridge';
import type { Nullable } from '@/types/common';
import type { PolkadotJsAccount } from '@/lib/soraneo-wallet/src/types/common';

/**
 * Aggregates web3 connection helpers (EVM + Substrate) and exposes a single
 * interface for connection management, status, and provider selection.
 */
export function useWeb3Connection() {
  const walletConnect = useWalletConnect();
  const web3Store = useWeb3Store(pinia);

  const evmProviders = computed<AppEIPProvider[]>(() => web3Store.appEvmProviders as AppEIPProvider[]);
  const evmProvider = computed<Nullable<AppEIPProvider>>(() => web3Store.evmProvider as Nullable<AppEIPProvider>);
  const evmAddress = walletConnect.evmAddress;
  const evmProviderLoading = walletConnect.evmProviderLoading;
  const selectedNetwork = computed<Nullable<NetworkData>>(() => web3Store.selectedNetworkData as Nullable<NetworkData>);
  const networkType = walletConnect.networkType;
  const networkSelected = walletConnect.networkSelected;
  const isValidNetwork = computed<boolean>(() => web3Store.isValidNetwork);

  const subAccount = computed<PolkadotJsAccount>(() => web3Store.subAccount as PolkadotJsAccount);
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

  const subscribeOnEvmProviders = () => web3Store.subscribeOnEvmProviders();

  const openSelectProviderDialog = () => web3Store.setSelectProviderDialogVisibility(true);
  const openSelectNetworkDialog = () => web3Store.setSelectNetworkDialogVisibility(true);
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
