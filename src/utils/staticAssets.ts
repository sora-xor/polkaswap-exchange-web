const PROD_ENV_CONFIG_FILENAME = 'env.json';
const DEV_ENV_CONFIG_FILENAME = 'env.dev.json';
const INDEX_DOCUMENT_PATTERN = /index\.html?$/i;
const IPFS_SCOPE_PATTERN = /^\/(?:ipfs|ipns)\/[^/]+/i;
const SORAFS_SCOPE_PATTERN = /^\/sorafs\/cid\/[^/]+/i;

/**
 * Picks which static environment configuration file should be requested
 * based on the current build mode. IPFS deployments ship with the production
 * configuration (`env.json`), while the local dev server should continue to
 * consume the testnet settings (`env.dev.json`).
 *
 * @param isDevMode - Optional override used by tests to avoid depending on
 *                    runtime globals.
 */
export function getEnvConfigFilename(isDevMode: boolean = Boolean((import.meta as any)?.env?.DEV)): string {
  return isDevMode ? DEV_ENV_CONFIG_FILENAME : PROD_ENV_CONFIG_FILENAME;
}

/**
 * Returns environment configuration candidates in lookup order.
 *
 * In development builds we first try `env.dev.json`, then gracefully fall back
 * to `env.json` so local/testing contexts do not hard-fail when only the
 * production config is present under an IPFS path.
 */
export function getEnvConfigCandidates(isDevMode: boolean = Boolean((import.meta as any)?.env?.DEV)): string[] {
  const primary = getEnvConfigFilename(isDevMode);
  if (primary === PROD_ENV_CONFIG_FILENAME) {
    return [primary];
  }
  return [primary, PROD_ENV_CONFIG_FILENAME];
}

/**
 * Normalizes static asset paths so that they resolve correctly when the
 * application is hosted from a non-root base path (e.g. on IPFS gateways).
 *
 * Absolute URLs are returned unchanged while leading slashes are stripped
 * from relative paths to keep requests scoped to the current base URL.
 *
 * @param assetPath - Path to a static asset served from the Vite `public/` directory.
 * @returns The asset path without a leading slash so it remains relative to the current base.
 */
export function ensureRelativeAssetPath(assetPath: string): string {
  if (!assetPath) {
    throw new Error('Static asset path is required');
  }

  if (/^(?:[a-z][a-z\d+.-]*:)?\/\/[^/]/i.test(assetPath)) {
    return assetPath;
  }

  return assetPath.replace(/^\/+/g, '');
}

const stripFragment = (href: string): string => {
  const hashIndex = href.indexOf('#');
  return hashIndex >= 0 ? href.slice(0, hashIndex) : href;
};

const stripQuery = (href: string): string => {
  const queryIndex = href.indexOf('?');
  return queryIndex >= 0 ? href.slice(0, queryIndex) : href;
};

const normalizeDirectoryHref = (href: string): string => {
  const trimmed = href.replace(INDEX_DOCUMENT_PATTERN, '');
  if (!trimmed) return '/';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
};

const resolveRuntimeBasePath = (pathname: string): string => {
  const normalized = pathname || '/';
  const sorafsScope = normalized.match(SORAFS_SCOPE_PATTERN)?.[0];
  const ipfsScope = normalized.match(IPFS_SCOPE_PATTERN)?.[0];

  if (sorafsScope) {
    return normalizeDirectoryHref(sorafsScope);
  }

  if (ipfsScope) {
    return normalizeDirectoryHref(ipfsScope);
  }

  if (INDEX_DOCUMENT_PATTERN.test(normalized)) {
    return normalizeDirectoryHref(normalized);
  }

  // The app uses hash routing and should not scope static assets to route paths
  // such as `/swap/` or `/wallet/` on direct deep links.
  return '/';
};

/**
 * Resolves a static asset path against the current location so requests do not
 * fall back to the origin root (which breaks when the app is hosted under a
 * nested path such as an IPFS CID).
 */
export function resolveStaticAssetUrl(assetPath: string): string {
  const relativePath = ensureRelativeAssetPath(assetPath);

  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    return relativePath;
  }

  const href = window.location.href;
  if (typeof href !== 'string' || href.length === 0) {
    return relativePath;
  }

  try {
    const url = new URL(href);
    const pathname = stripQuery(stripFragment(url.pathname));
    const basePath = resolveRuntimeBasePath(pathname);
    const baseHref = new URL(basePath, url.origin).toString();
    return new URL(relativePath, baseHref).toString();
  } catch {
    return relativePath;
  }
}
