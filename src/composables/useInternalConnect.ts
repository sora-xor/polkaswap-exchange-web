import { computed } from 'vue';

import { PageNames } from '@/consts';
import pinia from '@/plugins/pinia';
import { goTo } from '@/router';
import store from '@/store';
import { useWalletStore } from '@/stores/wallet';
import { formatAddress } from '@/utils/formatAddress';

/**
 * Provides wallet connection helpers and derived state formerly powered by
 * `InternalConnectMixin`.
 */
export function useInternalConnect() {
  const walletStore = useWalletStore(pinia);

  const soraAddress = computed(() => walletStore.address);
  const isLoggedIn = computed(() => walletStore.isLoggedIn);

  const connectSoraWallet = () => {
    store.commit.web3.setSoraAccountDialogVisibility(true);
  };

  const disconnectSoraWallet = () => walletStore.logout();

  const navigateToWallet = () => {
    goTo(PageNames.Wallet);
  };

  return {
    soraAddress,
    isLoggedIn,
    connectSoraWallet,
    disconnectSoraWallet,
    navigateToWallet,
    formatAddress,
  };
}

export type InternalConnectComposable = ReturnType<typeof useInternalConnect>;
