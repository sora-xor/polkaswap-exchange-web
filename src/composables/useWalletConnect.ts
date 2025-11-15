import { computed, getCurrentInstance } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import router from '@/router';
import store from '@/store';
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
  const alert = instance?.proxy?.$alert as
    | ((
        message: string,
        options: { showCancelButton?: boolean; cancelButtonText?: string; callback?: (action: string) => void }
      ) => void)
    | undefined;

  const evmProvider = computed(() => store.state.web3.evmProvider ?? null);
  const evmProviderLoading = computed(() => store.state.web3.evmProviderLoading ?? null);
  const evmAddress = computed(() => store.state.web3.evmAddress ?? '');
  const networkSelected = computed(() => store.state.web3.networkSelected);
  const networkType = computed(() => store.state.web3.networkType);
  const appEvmProviders = computed<AppEIPProvider[]>(() => store.getters.web3.appEvmProviders as AppEIPProvider[]);

  const isSubBridge = computed(() => store.getters.bridge.isSubBridge as boolean);
  const isSubAccountType = computed(() => store.getters.bridge.isSubAccountType as boolean);

  const connectSubWallet = () => {
    store.commit.web3.setSubAccountDialogVisibility(true);
  };

  /**
   * Picks the most appropriate EVM provider when the caller does not specify one.
   * Reuses the previously connected provider if available, falls back to any
   * installed extension, and finally to WalletConnect/AppKit.
   */
  const resolveTargetProvider = (requested?: AppEIPProvider | null): AppEIPProvider => {
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

  const connectEvmWallet = async (provider?: AppEIPProvider): Promise<void> => {
    const target = resolveTargetProvider(provider ?? null);
    await connectEvmProvider(target);
  };

  const disconnectExternalNetwork = () => store.dispatch.web3.disconnectExternalNetwork();
  const disconnectEvmWallet = () => store.dispatch.web3.resetEvmProviderConnection();
  const disconnectSubWallet = () => store.dispatch.web3.resetSubAccount();

  const changeEvmNetworkProvided = () => store.dispatch.web3.changeEvmNetworkProvided();
  const selectEvmProvider = (provider: AppEIPProvider) => store.dispatch.web3.selectEvmProvider(provider);

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
