import { resolveGlobalPinia } from '@/plugins/pinia';
import { syncWalletCurrentRoute } from '@/platform/wallet/navigation';
import { useWalletStore } from '@/stores/wallet';

import { addSoraWalletLocally } from './services/sorawallet';
import { api, connection } from './api';
import * as WALLET_CONSTS from './consts';
import { initializeWallets } from './services/wallet';
import { delay } from './util';

import type { WithKeyring } from '@sora-substrate/sdk';

type GoogleWalletModule = typeof import('./services/google/wallet');
type WalletConnectServicesModule = typeof import('./services/walletconnect');

let googleWalletModulePromise: Promise<GoogleWalletModule> | null = null;
let walletConnectServicesPromise: Promise<WalletConnectServicesModule> | null = null;

/**
 * Loads Google Drive wallet backup support only for browser wallet setup.
 */
const loadGoogleWalletModule = (): Promise<GoogleWalletModule> => {
  googleWalletModulePromise ??= import('./services/google/wallet');
  return googleWalletModulePromise;
};

/**
 * Loads WalletConnect only after the base wallet shell is ready, keeping its
 * transport stack out of the initial app bundle.
 */
const loadWalletConnectServices = (): Promise<WalletConnectServicesModule> => {
  walletConnectServicesPromise ??= import('./services/walletconnect');
  return walletConnectServicesPromise;
};

const resolveWalletStore = () => {
  try {
    return useWalletStore(resolveGlobalPinia());
  } catch {
    return null;
  }
};

/**
 * Initializes built-in wallet integrations and local storage depending on the
 * runtime environment (desktop vs web). The initialization is intentionally
 * side-effectful because the wallet modules depend on these registrations.
 */
const initLocalWallets = async (apiInstance: WithKeyring, isDesktop = false, appName?: string): Promise<void> => {
  const dAppName = appName ?? WALLET_CONSTS.TranslationConsts.Polkaswap;

  if (isDesktop) {
    addSoraWalletLocally(apiInstance, dAppName);
  } else {
    const { addGDriveWalletLocally } = await loadGoogleWalletModule();
    addGDriveWalletLocally(dAppName);
  }
  initializeWallets(dAppName);

  const walletStore = resolveWalletStore();

  if (walletStore) {
    void walletStore.updateAvailableWallets();
  }
};

const initWalletConnectWallet = async (apiInstance: WithKeyring): Promise<void> => {
  const { addWcSubWalletLocally } = await loadWalletConnectServices();

  addWcSubWalletLocally(apiInstance, (source) => {
    const walletStore = resolveWalletStore();

    if (!walletStore) return;

    void walletStore.checkConnectedAccountSource(source);
    void walletStore.updateAvailableWallets();
  });
};

/**
 * Ensures the Pinia wallet store instance is ready before running logic. The
 * wallet can work with either host-app Pinia or the internal standalone Pinia
 * store used by wallet-local development.
 */
const waitForStore = async (): Promise<void> => {
  if (resolveWalletStore()) {
    return;
  }

  await delay(100);
  await waitForStore();
};

let walletCoreLoaded = false;
let walletInitPromise: Promise<void> | null = null;
let walletAssetFiltersPromise: Promise<void> | null = null;

const primeWalletAssetFilters = (walletStore: ReturnType<typeof resolveWalletStore>): Promise<void> => {
  if (!walletStore) {
    return Promise.resolve();
  }

  if (!walletAssetFiltersPromise) {
    walletAssetFiltersPromise = Promise.allSettled([
      Promise.resolve().then(() => walletStore.getWhitelist()),
      Promise.resolve().then(() => walletStore.getNftBlacklist()),
    ]).then(() => undefined);
  }

  return walletAssetFiltersPromise;
};

/**
 * Lazily bootstraps the wallet core by waiting for the store and keyring to
 * initialize, then fetching runtime data and applying permission overrides.
 * The function is idempotent so subsequent calls resolve immediately.
 */
const waitForCore = async ({ permissions }: WALLET_CONSTS.WalletInitOptions = {}): Promise<void> => {
  if (!walletCoreLoaded) {
    await Promise.all([waitForStore(), api.initKeyring(true)]);

    const walletStore = resolveWalletStore();

    if (!walletStore) return;

    if (permissions) {
      walletStore.setPermissions(permissions);
    }

    primeWalletAssetFilters(walletStore);

    walletCoreLoaded = true;
  }
};

/**
 * Waits for an active blockchain connection before continuing. The helper
 * retries until the API instance is ready so that higher level flows can be
 * written without defensive checks at every stage.
 */
const waitForConnection = async (): Promise<void> => {
  if (connection.loading) {
    await delay(100);
    await waitForConnection();
  } else if (!connection.api) {
    const endpoint = (connection as Record<string, unknown>).endpoint;
    if (!endpoint) return;

    try {
      await connection.open();
      console.info('Connected to blockchain', connection.endpoint);
    } catch (error) {
      console.warn('[wallet] connection.open skipped', error);
    }
  }
};

/**
 * Restores the last active account and refreshes all computed state that
 * depends on it. This includes route guards and wallet availability checks.
 */
const checkActiveAccount = async (): Promise<void> => {
  await api.restoreActiveAccount?.();
  const walletStore = resolveWalletStore();

  if (!walletStore) return;

  await walletStore.checkWalletAvailability();
  syncWalletCurrentRoute();
};

/**
 * Public initializer that brings the wallet online. Consumers should await
 * this function before interacting with any wallet services.
 */
async function initWallet(options: WALLET_CONSTS.WalletInitOptions = {}): Promise<void> {
  if (walletInitPromise) {
    return walletInitPromise;
  }

  walletInitPromise = (async () => {
    await waitForCore(options);

    const walletStore = resolveWalletStore();

    if (!walletStore) return;

    try {
      // Keep the wallet shell responsive even if websocket connection is still
      // settling. The network-dependent pieces continue below on a best-effort
      // basis.
      await initLocalWallets(api, Boolean(walletStore?.isDesktop), options.appName);
      void walletStore.activateInternalSubscriptions();
      void walletStore.selectIndexer('');
    } catch (error) {
      console.warn('[wallet] initWallet shell skipped', error);
    } finally {
      walletStore.setWalletLoaded(true);
    }

    try {
      await waitForConnection();
    } catch (error) {
      console.warn('[wallet] initWallet connection wait skipped', error);
    }

    try {
      await initWalletConnectWallet(api);
      await checkActiveAccount();
      walletStore.setIsMstAvailable(walletStore.accountSource === WALLET_CONSTS.AppWallet.FearlessWallet);
    } catch (error) {
      console.warn('[wallet] initWallet provider setup skipped', error);
    }

    // wait for finalization of network subscriptions (best effort).
    // In some static/IPFS contexts the chain connection may be intentionally skipped,
    // so `api.initialize` can fail. Do not block UI rendering in that case.
    try {
      await Promise.all(
        [
          typeof api.initialize === 'function' ? api.initialize(false) : undefined,
          primeWalletAssetFilters(walletStore).then(() => walletStore.activateNetworkSubscriptions()),
        ].filter(Boolean) as Array<Promise<unknown>>
      );
    } catch (error) {
      console.warn('[wallet] initWallet network subscriptions skipped', error);
    }

    try {
      walletStore.initMultisigAddress();
    } catch (error) {
      console.warn('[wallet] initMultisigAddress skipped', error);
    }
  })();

  return walletInitPromise;
}

export { initWallet, waitForCore };
