import { createRouter, createWebHashHistory } from 'vue-router';

import { setRouterLoading, syncRoute } from '@/adapters/router/navigation';
import { isValidWalletAddress } from '@/adapters/wallet/addresses';
import { persistReferralAddress } from '@/adapters/wallet/referrals';
import { PageNames } from '@/consts';
import { createBeforeEachGuard } from './guards/navigation';
import { useWalletStore } from '@/stores/wallet';
import { registerDocumentTitleResolver, updateDocumentTitle } from '@/utils';

import { routes } from './routes';

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

if (typeof registerDocumentTitleResolver === 'function') {
  registerDocumentTitleResolver(() => router.currentRoute.value);
}

const beforeEachGuard = createBeforeEachGuard({
  setRoute: syncRoute,
  walletStore: useWalletStore(),
  resetBridgeHistoryPage: async () => {
    const { useBridgeStore } = await import('@/stores/bridge');
    useBridgeStore().resetHistoryPage();
  },
  persistReferral: persistReferralAddress,
  validateAddress: isValidWalletAddress,
  updateDocumentTitle,
});

router.beforeEach(beforeEachGuard);

/**
 * Shared navigation helper that keeps the router loading state in sync.
 */
const goTo = async (name: PageNames): Promise<void> => {
  const current = router.currentRoute.value?.name as PageNames | undefined;
  const walletStore = useWalletStore();

  if (name === PageNames.Wallet) {
    walletStore.prepareWalletEntryNavigation();
  }

  if (current === name) {
    return;
  }

  try {
    setRouterLoading(true);
    await router.push({ name });
  } finally {
    setRouterLoading(false);
  }
};

export { goTo };
export default router;
