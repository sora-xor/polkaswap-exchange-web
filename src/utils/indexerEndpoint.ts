export const LOCAL_POLKASWAP_INDEXER_ENDPOINT = 'http://localhost:4350/graphql';

const getBrowserHostname = (): string => {
  if (typeof window === 'undefined') return '';

  return window.location?.hostname ?? '';
};

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
 * Configured endpoints are authoritative for both production/IPFS and local
 * previews. Local development only falls back to the sibling
 * `polkaswap-indexer` service when env.json does not provide an endpoint.
 */
export function resolvePolkaswapIndexerEndpoint(configuredEndpoint: unknown, hostname = getBrowserHostname()): string {
  const endpoint = typeof configuredEndpoint === 'string' ? configuredEndpoint.trim() : '';

  if (endpoint) return endpoint;
  if (isLocalDevelopmentHost(hostname)) return LOCAL_POLKASWAP_INDEXER_ENDPOINT;

  return endpoint;
}
