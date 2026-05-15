export const LOCAL_POLKASWAP_INDEXER_ENDPOINT = 'http://localhost:4350/graphql';
const HOSTED_POLKASWAP_INDEXER_ENDPOINT = 'https://pi.soramitsu.io/graphql';

const getBrowserHostname = (): string => {
  if (typeof window === 'undefined') return '';

  return window.location?.hostname ?? '';
};

const normalizeEndpoint = (endpoint: string): string => endpoint.replace(/\/+$/, '');

/**
 * Returns true when the app is being served from a local browser origin.
 */
export function isLocalDevelopmentHost(hostname = getBrowserHostname()): boolean {
  const normalized = hostname.trim().toLowerCase();

  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized === '0.0.0.0' ||
    normalized === '::1' ||
    normalized === '[::1]' ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized)
  );
}

/**
 * Resolves the Polkaswap indexer endpoint used by the static UI.
 *
 * Production/IPFS builds use the configured hosted endpoint. Local previews use
 * the sibling `polkaswap-indexer` service unless a custom endpoint was supplied
 * for focused integration testing.
 */
export function resolvePolkaswapIndexerEndpoint(configuredEndpoint: unknown, hostname = getBrowserHostname()): string {
  const endpoint = typeof configuredEndpoint === 'string' ? configuredEndpoint.trim() : '';

  if (isLocalDevelopmentHost(hostname)) {
    return !endpoint || normalizeEndpoint(endpoint) === HOSTED_POLKASWAP_INDEXER_ENDPOINT
      ? LOCAL_POLKASWAP_INDEXER_ENDPOINT
      : endpoint;
  }

  if (endpoint) return endpoint;

  return endpoint;
}
