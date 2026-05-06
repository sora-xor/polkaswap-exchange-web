import { normalizePrefix } from '../testing/ipfs-preview-config.mjs';

const DEFAULT_IPFS_PREFIX = '/ipfs/polkaswap-e2e';

/**
 * Resolve the app base URL used by standalone Playwright smoke scripts.
 * When the provided base URL points at the server root, default to the same
 * IPFS-style prefix as the shared preview server.
 *
 * @param {string} rawBaseUrl
 * @param {unknown} rawPrefix
 * @returns {string}
 */
export function resolveAppBaseUrl(rawBaseUrl, rawPrefix = process.env.PS_IPFS_TEST_PREFIX) {
  const url = new URL(String(rawBaseUrl));
  const currentPath = url.pathname || '/';

  if (currentPath !== '/' && currentPath !== '') {
    url.pathname = currentPath.endsWith('/') ? currentPath : `${currentPath}/`;
    return url.toString();
  }

  url.pathname = normalizePrefix(rawPrefix, DEFAULT_IPFS_PREFIX);
  return url.toString();
}

/**
 * Append a hash route to the resolved app base URL.
 *
 * @param {string} rawBaseUrl
 * @param {string} routeHash
 * @param {unknown} rawPrefix
 * @returns {string}
 */
export function resolveRouteUrl(rawBaseUrl, routeHash, rawPrefix = process.env.PS_IPFS_TEST_PREFIX) {
  return `${resolveAppBaseUrl(rawBaseUrl, rawPrefix)}${routeHash}`;
}
