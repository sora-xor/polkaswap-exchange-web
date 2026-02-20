/**
 * Determines whether the application should short-circuit Vue bootstrapping
 * and render the minimal offline shell instead.
 *
 * This is intended for explicit IPFS smoke checks (query param `ipfs-check`)
 * and truly offline environments. It must NOT be triggered just because the
 * browser is automated/headless, otherwise UI checks would never exercise the
 * real application.
 */
export function shouldRenderOfflineShell(): boolean {
  if (typeof window !== 'undefined') {
    if ((window as Record<string, unknown>).__PS_FORCE_ONLINE__ === true) {
      return false;
    }

    try {
      if ((window as Window).__PS_IPFS_CHECK__) {
        return true;
      }

      const search = typeof window.location?.search === 'string' ? window.location.search : '';
      const href = typeof window.location?.href === 'string' ? window.location.href : '';
      if (search.includes('ipfs-check') || href.includes('ipfs-check')) {
        return true;
      }
    } catch {
      // ignore location access issues
    }
  }

  if (typeof navigator !== 'undefined') {
    try {
      if ('onLine' in navigator && navigator.onLine === false) {
        return true;
      }
    } catch {
      // ignore navigator access issues and fall through to false
    }
  }

  return false;
}

/**
 * @deprecated Use `shouldRenderOfflineShell` instead.
 */
export const isHeadlessOrOfflineEnv = shouldRenderOfflineShell;
