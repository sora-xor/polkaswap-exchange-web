export function isHeadlessOrOfflineEnv(): boolean {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as ImportMeta).env : undefined;
  if (metaEnv?.PS_IPFS_CHECK_FORCE_ONLINE === 'true') {
    return false;
  }
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

      if ((navigator as Record<string, unknown>).webdriver === true) {
        return true;
      }

      const userAgent = navigator.userAgent || '';
      if (/HeadlessChrome/i.test(userAgent) || /Electron\//i.test(userAgent)) {
        return true;
      }
    } catch {
      // ignore navigator access issues and fall through to false
    }
  }

  return false;
}
