import { computed, nextTick, readonly, ref } from 'vue';
import { AppWallet } from '@/lib/soraneo-wallet/src/consts';

import { goTo } from '@/app/router';
import { PageNames } from '@/consts';
import pinia from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';
import { useWeb3Store } from '@/stores/web3';
import { formatAddress } from '@/utils/formatAddress';

// Ephemeral UI intent only; a URL or saved session cannot initiate a provider connection.
const preferredWallet = ref<AppWallet.GoogleDrive | null>(null);
export const preferredSoraWallet = readonly(preferredWallet);

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
    preferredWallet.value = null;
    if (web3Store.soraAccountDialogVisibility) {
      web3Store.setSoraAccountDialogVisibility(false);
      await nextTick();
    }

    web3Store.setSoraAccountDialogVisibility(true);
  };

  /** Opens Google's existing encrypted-wallet flow only in response to its explicit account button. */
  const connectGoogleWallet = async () => {
    if (web3Store.soraAccountDialogVisibility) {
      web3Store.setSoraAccountDialogVisibility(false);
      await nextTick();
    }
    preferredWallet.value = AppWallet.GoogleDrive;
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
    connectGoogleWallet,
    disconnectSoraWallet,
    navigateToWallet,
    formatAddress,
  };
}

export type InternalConnectComposable = ReturnType<typeof useInternalConnect>;
