const RETIRED_LEGACY_SERVICE_WORKER_KEY = 'polkaswap:legacy-service-worker-retired';

type ServiceWorkerCleanupOptions = {
  reloadControlledPage?: boolean;
};

type ServiceWorkerCleanupResult = {
  cacheNames: string[];
  reloaded: boolean;
  registrationsFound: number;
  registrationsRetired: number;
};

/**
 * Removes same-origin service workers left by older IPFS gateway experiments.
 *
 * Polkaswap no longer registers a service worker, so any registration under
 * the current origin is legacy state that can keep serving the generic IPFS
 * bootstrap screen before the app shell has a chance to mount.
 */
export async function retireLegacyServiceWorkers(
  options: ServiceWorkerCleanupOptions = {}
): Promise<ServiceWorkerCleanupResult> {
  const result: ServiceWorkerCleanupResult = {
    cacheNames: [],
    reloaded: false,
    registrationsFound: 0,
    registrationsRetired: 0,
  };

  if (typeof navigator === 'undefined' || !navigator.serviceWorker?.getRegistrations) {
    return result;
  }

  let registrations: readonly ServiceWorkerRegistration[] = [];

  try {
    registrations = await navigator.serviceWorker.getRegistrations();
  } catch (error) {
    console.warn('[service-worker-cleanup] unable to inspect registrations', error);
    return result;
  }

  result.registrationsFound = registrations.length;

  if (registrations.length === 0) {
    return result;
  }

  const unregisterResults = await Promise.all(
    registrations.map((registration) =>
      registration.unregister().catch((error) => {
        console.warn('[service-worker-cleanup] unable to retire registration', error);
        return false;
      })
    )
  );
  result.registrationsRetired = unregisterResults.filter(Boolean).length;

  if (typeof caches !== 'undefined' && typeof caches.keys === 'function' && typeof caches.delete === 'function') {
    try {
      const cacheNames = await caches.keys();
      result.cacheNames = cacheNames;
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    } catch (error) {
      console.warn('[service-worker-cleanup] unable to clear service-worker caches', error);
    }
  }

  if (
    options.reloadControlledPage &&
    result.registrationsRetired > 0 &&
    navigator.serviceWorker.controller &&
    typeof window !== 'undefined'
  ) {
    try {
      if (window.sessionStorage?.getItem(RETIRED_LEGACY_SERVICE_WORKER_KEY) !== '1') {
        window.sessionStorage.setItem(RETIRED_LEGACY_SERVICE_WORKER_KEY, '1');
        window.location.reload();
        result.reloaded = true;
      }
    } catch (error) {
      console.warn('[service-worker-cleanup] unable to reload after retirement', error);
    }
  }

  return result;
}
