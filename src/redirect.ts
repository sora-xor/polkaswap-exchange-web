type LocationLike = Pick<Location, 'protocol' | 'hostname' | 'pathname'> & {
  [key: string]: any;
};

const HTTPS_PROTOCOL = 'https:';
const HTTP_PROTOCOL = 'http:';
const IPFS_PREFIX = /^\/(ipfs|ipns)\/[^/]+/i;
const INDEX_DOCUMENT = /index\.html?$/i;

const PRIVATE_HOSTNAME = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i;
const PRIVATE_IPV4_RANGES = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./, /^169\.254\./];

const isPrivateHostname = (hostname: string): boolean => {
  if (PRIVATE_HOSTNAME.test(hostname)) return true;
  return PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(hostname));
};

export function shouldForceHttps(location: LocationLike): boolean {
  if (!location?.protocol || !location?.hostname) return false;

  return location.protocol === HTTP_PROTOCOL && !isPrivateHostname(location.hostname);
}

export function ensureHttps(location: LocationLike): void {
  if (!location) return;

  if (shouldForceHttps(location)) {
    location.protocol = HTTPS_PROTOCOL;
  }
}

const normaliseIndexDocument = (pathname: string): string => {
  const trimmed = pathname.replace(INDEX_DOCUMENT, '');
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
};

export function ensureTrailingSlash(location: LocationLike): void {
  if (!location?.pathname) return;

  const { pathname } = location;

  if (pathname === '/' || pathname.endsWith('/')) return;

  if (INDEX_DOCUMENT.test(pathname)) {
    if (IPFS_PREFIX.test(pathname)) {
      // Preserve explicit IPFS index documents to avoid breaking deep links.
      return;
    }

    location.pathname = normaliseIndexDocument(pathname);
    return;
  }

  if (IPFS_PREFIX.test(pathname)) {
    location.pathname = `${pathname}/`;
    return;
  }

  location.pathname = `${pathname}/`;
}

export function normalizeLocation(location: LocationLike): void {
  ensureHttps(location);
  ensureTrailingSlash(location);
}

if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
  normalizeLocation(window.location);
}
