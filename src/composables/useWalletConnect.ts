import { computed, getCurrentInstance } from 'vue';
import { useRouter } from 'vue-router';

import { useTranslation } from '@/composables/useTranslation';
import pinia from '@/plugins/pinia';
import { useBridgeStore } from '@/stores/bridge';
import { useWeb3Store } from '@/stores/web3';
import type { AppEIPProvider } from '@/types/evm/provider';
import { PredefinedProvider, WalletConnectProvider } from '@/utils/connection/evm/providers';
import { handleRpcProviderError, installExtensionKey } from '@/utils/ethers-util';

/**
 * Composition-friendly helpers covering the responsibilities of the legacy
 * `WalletConnectMixin`.
 */
export function useWalletConnect() {
  const { t, te } = useTranslation();
  const instance = getCurrentInstance();
  const router = useRouter();
  const alert = instance?.proxy?.$alert as
    | ((
        message: string,
        options: { showCancelButton?: boolean; cancelButtonText?: string; callback?: (action: string) => void }
      ) => void)
    | undefined;

  const bridgeStore = useBridgeStore(pinia);
  const web3Store = useWeb3Store(pinia);

  const evmProvider = computed(() => web3Store.evmProvider ?? null);
  const evmProviderLoading = computed(() => web3Store.evmProviderLoading ?? null);
  const evmAddress = computed(() => web3Store.evmAddress ?? '');
  const networkSelected = computed(() => web3Store.networkSelected);
  const networkType = computed(() => web3Store.networkType);
  const appEvmProviders = computed<AppEIPProvider[]>(() => web3Store.appEvmProviders as AppEIPProvider[]);

  const isSubBridge = computed(() => bridgeStore.isSubBridge);
  const isSubAccountType = computed(() => bridgeStore.isSubAccountType);
  const isSubBridgeConnectorReady = computed(() =>
    Boolean(bridgeStore.connector?.network?.subNetworkConnection?.nodeIsConnected)
  );

  const connectSubWallet = () => {
    if (isSubBridge.value && !isSubBridgeConnectorReady.value) {
      web3Store.setSelectSubNodeDialogVisibility(true);
      return;
    }

    web3Store.setSubAccountDialogVisibility(true);
  };

  /**
   * Picks the most appropriate EVM provider when the caller does not specify one.
   * Reuses the previously connected provider if available, falls back to any
   * installed extension, and finally to WalletConnect/AppKit.
   */
  const resolveTargetProvider = async (requested?: AppEIPProvider | null): Promise<AppEIPProvider> => {
    if (requested) return requested;
    if (evmProvider.value) return evmProvider.value;

    const installed = appEvmProviders.value.filter((provider) => provider.installed);
    const preferredInstalled = installed.find((provider) => provider.uuid !== PredefinedProvider.WalletConnect);

    if (preferredInstalled) {
      return preferredInstalled;
    }

    // Fall back to probing predefined injected wallets directly so bridge/account
    // connect buttons can still pick MetaMask/Fearless even before EIP-6963
    // announcements populate the provider list.
    for (const provider of appEvmProviders.value) {
      if (provider.uuid === PredefinedProvider.WalletConnect || typeof provider.getProvider !== 'function') {
        continue;
      }

      try {
        if (await provider.getProvider()) {
          return provider;
        }
      } catch {
        // Ignore provider-probing errors and keep searching for another wallet.
      }
    }

    const walletConnect = appEvmProviders.value.find((provider) => provider.uuid === PredefinedProvider.WalletConnect);

    return walletConnect ?? WalletConnectProvider;
  };

  const connectEvmWallet = async (provider?: AppEIPProvider): Promise<void> => {
    const target = await resolveTargetProvider(provider ?? null);
    await connectEvmProvider(target);
  };

  const disconnectExternalNetwork = () => web3Store.disconnectExternalNetwork();
  const disconnectEvmWallet = () => web3Store.resetEvmProviderConnection();
  const disconnectSubWallet = () => web3Store.resetSubAccount();

  const changeEvmNetworkProvided = () => web3Store.changeEvmNetworkProvided();
  const selectEvmProvider = (provider: AppEIPProvider) => web3Store.selectEvmProvider(provider);

  const getEvmProviderIcon = (provider: AppEIPProvider): string => provider.icon;

  const connectEvmProvider = async (provider: AppEIPProvider): Promise<void> => {
    try {
      await selectEvmProvider(provider);
    } catch (error: any) {
      const key = te(error.message) ? error.message : handleRpcProviderError(error);
      const message = t(key, { name: provider.name });
      const showCancelButton = key === installExtensionKey;

      alert?.(message, {
        showCancelButton,
        cancelButtonText: t('provider.messages.reloadPage'),
        callback: (action) => {
          if (action === 'cancel') {
            router.go(0);
          }
        },
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
    getEvmProviderIcon,
  };
}

export type WalletConnectComposable = ReturnType<typeof useWalletConnect>;
