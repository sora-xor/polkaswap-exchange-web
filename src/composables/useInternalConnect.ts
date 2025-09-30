import { computed } from 'vue';

import { PageNames } from '@/consts';
import { goTo } from '@/router';
import store from '@/store';
import { formatAddress } from '@/utils';

/**
 * Provides wallet connection helpers and derived state formerly powered by
 * `InternalConnectMixin`.
 */
export function useInternalConnect() {
  const soraAddress = computed(() => store.state.wallet.account.address);
  const isLoggedIn = computed(() => store.getters.wallet.account.isLoggedIn);

  const connectSoraWallet = () => {
    store.commit.web3.setSoraAccountDialogVisibility(true);
  };

  const disconnectSoraWallet = () => store.dispatch.wallet.account.logout();

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
