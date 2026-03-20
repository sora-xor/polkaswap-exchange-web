import { createRouter, createWebHashHistory } from 'vue-router';

import { setLegacyRouterLoading, syncLegacyRoute } from '@/adapters/router/navigation';
import { isValidWalletAddress } from '@/adapters/wallet/addresses';
import { persistReferralAddress } from '@/adapters/wallet/referrals';
import { PageNames } from '@/consts';
import { createBeforeEachGuard } from '@/router/guards/navigation';
import { routes } from '@/router/modules';
import { lazyComponent, lazyView } from '@/router/lazy';
import { useBridgeHistoryStore } from '@/stores/bridge/history';
import { useRouterStore } from '@/stores/router';
import { useWalletStore } from '@/stores/wallet';
import { registerDocumentTitleResolver, updateDocumentTitle } from '@/utils';

const WALLET_DEFAULT_ROUTE = PageNames.Wallet;
const WALLET_CONNECTION_ROUTE = 'WalletConnection';

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

if (typeof registerDocumentTitleResolver === 'function') {
  registerDocumentTitleResolver(() => router.currentRoute.value);
}

const beforeEachGuard = createBeforeEachGuard({
  routerStore: useRouterStore(),
  walletStore: useWalletStore(),
  bridgeHistoryStore: useBridgeHistoryStore(),
  syncRoute: syncLegacyRoute,
  persistReferral: persistReferralAddress,
  validateAddress: isValidWalletAddress,
  updateDocumentTitle,
});

router.beforeEach(beforeEachGuard);

/**
 * Use this function instead just `router.push` when page loading is required.
 *
 * It checks wallet routing, page loading and the current route.
 * if the current route isn't the same as param, then it will wait for `router.push`
 */
const goTo = async (name: PageNames): Promise<void> => {
  const current = router.currentRoute.value?.name as PageNames | undefined;
  const routerStore = useRouterStore();
  const walletStore = useWalletStore();
  if (name === PageNames.Wallet) {
    if (!walletStore.isLoggedIn) {
      routerStore.navigate({ name: WALLET_CONNECTION_ROUTE });
    } else if (routerStore.current !== WALLET_DEFAULT_ROUTE) {
      routerStore.navigate({ name: WALLET_DEFAULT_ROUTE });
    }
  }
  if (current === name) {
    return;
  }
  try {
    routerStore.setLoading(true);
    setLegacyRouterLoading(true);
    await router.push({ name });
  } finally {
    routerStore.setLoading(false);
    setLegacyRouterLoading(false);
  }
};

export { lazyComponent, lazyView, goTo };
export default router;
