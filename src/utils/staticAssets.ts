const PROD_ENV_CONFIG_FILENAME = 'env.json';
const DEV_ENV_CONFIG_FILENAME = 'env.dev.json';

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

  try {
    return new URL(relativePath, window.location.href).toString();
  } catch {
    return relativePath;
  }
}
