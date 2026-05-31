import { computed, nextTick } from 'vue';

import { goTo } from '@/app/router';
import { PageNames } from '@/consts';
import pinia from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';
import { useWeb3Store } from '@/stores/web3';
import { formatAddress } from '@/utils/formatAddress';

/**
 * Provides wallet connection helpers and derived state formerly powered by
 * `InternalConnectMixin`.
 */
export function useInternalConnect() {
  const walletStore = useWalletStore(pinia);
  const web3Store = useWeb3Store(pinia);

  const soraAddress = computed(() => walletStore.address);
  const isLoggedIn = computed(() => walletStore.isLoggedIn);
  const isSoraAccountDialogVisible = computed(() => Boolean(web3Store.soraAccountDialogVisibility));

  const connectSoraWallet = async () => {
    if (web3Store.soraAccountDialogVisibility) {
      web3Store.setSoraAccountDialogVisibility(false);
      await nextTick();
    }

    web3Store.setSoraAccountDialogVisibility(true);
  };

  const disconnectSoraWallet = () => walletStore.logout();

  const navigateToWallet = () => {
    goTo(PageNames.Wallet);
  };

  return {
    soraAddress,
    isLoggedIn,
    isSoraAccountDialogVisible,
    connectSoraWallet,
    disconnectSoraWallet,
    navigateToWallet,
    formatAddress,
  };
}

export type InternalConnectComposable = ReturnType<typeof useInternalConnect>;
