import { createRouter, createWebHashHistory } from 'vue-router';

import { setRouterLoading, syncRoute } from '@/adapters/router/navigation';
import { PageNames } from '@/consts/navigation';
import { createBeforeEachGuard } from './guards/navigation';
import { registerDocumentTitleResolver, updateDocumentTitle } from '@/utils/documentTitle';

import { routes } from './routes';

type WalletStoreModule = typeof import('@/stores/wallet');
type WalletAddressAdapterModule = typeof import('@/adapters/wallet/addresses');
type WalletReferralAdapterModule = typeof import('@/adapters/wallet/referrals');

let walletStoreModulePromise: Promise<WalletStoreModule> | null = null;
let walletAddressAdapterModulePromise: Promise<WalletAddressAdapterModule> | null = null;
let walletReferralAdapterModulePromise: Promise<WalletReferralAdapterModule> | null = null;

const getWalletStore = async () => {
  walletStoreModulePromise ??= import('@/stores/wallet');
  const { useWalletStore } = await walletStoreModulePromise;
  return useWalletStore();
};

const validateWalletAddress = async (address?: string | null): Promise<boolean> => {
  walletAddressAdapterModulePromise ??= import('@/adapters/wallet/addresses');
  const { isValidWalletAddress } = await walletAddressAdapterModulePromise;
  return isValidWalletAddress(address);
};

const persistReferral = async (address: string): Promise<void> => {
  walletReferralAdapterModulePromise ??= import('@/adapters/wallet/referrals');
  const { persistReferralAddress } = await walletReferralAdapterModulePromise;
  persistReferralAddress(address);
};

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

if (typeof registerDocumentTitleResolver === 'function') {
  registerDocumentTitleResolver(() => router.currentRoute.value);
}

const beforeEachGuard = createBeforeEachGuard({
  setRoute: syncRoute,
  getWalletStore,
  resetBridgeHistoryPage: async () => {
    const { useBridgeStore } = await import('@/stores/bridge');
    useBridgeStore().resetHistoryPage();
  },
  persistReferral,
  validateAddress: validateWalletAddress,
  updateDocumentTitle,
});

router.beforeEach(beforeEachGuard);

/**
 * Shared navigation helper that keeps the router loading state in sync.
 */
/** Menu pages whose sections share one route name; selecting the menu item again returns to the page home. */
const SECTION_HOME_PAGES: ReadonlySet<string> = new Set([PageNames.Bots]);

/** A route is at its home when it carries no section params or view query. */
const isPageHome = (route?: { params?: Record<string, unknown>; query?: Record<string, unknown> }): boolean =>
  [...Object.values(route?.params ?? {}), ...Object.values(route?.query ?? {})].every(
    (value) => value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)
  );

const goTo = async (name: PageNames): Promise<void> => {
  const current = router.currentRoute.value?.name as PageNames | undefined;

  if (name === PageNames.Wallet) {
    const walletStore = await getWalletStore();
    walletStore.prepareWalletEntryNavigation();
  }

  if (current === name && (!SECTION_HOME_PAGES.has(name) || isPageHome(router.currentRoute.value))) {
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
