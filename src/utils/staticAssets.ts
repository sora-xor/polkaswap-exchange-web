const PROD_ENV_CONFIG_FILENAME = 'env.json';
const DEV_ENV_CONFIG_FILENAME = 'env.dev.json';
const INDEX_DOCUMENT_PATTERN = /index\.html?$/i;

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
    const baseHref = normalizeDirectoryHref(stripQuery(stripFragment(href)));
    return new URL(relativePath, baseHref).toString();
  } catch {
    return relativePath;
  }
}
