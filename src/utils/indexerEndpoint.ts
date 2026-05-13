export const LOCAL_POLKASWAP_INDEXER_ENDPOINT = 'http://localhost:4350/graphql';
const HOSTED_POLKASWAP_INDEXER_ENDPOINTS = new Set(['https://pi.soramitsu.io/graphql']);

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
 * Local previews should talk to the sibling `polkaswap-indexer` service when
 * env.json points at the hosted Polkaswap endpoint, because localhost browsers
 * cannot rely on hosted indexer CORS. Production/IPFS hosts and custom local
 * endpoints keep the endpoint supplied by env.json.
 */
export function resolvePolkaswapIndexerEndpoint(configuredEndpoint: unknown, hostname = getBrowserHostname()): string {
  const endpoint = typeof configuredEndpoint === 'string' ? configuredEndpoint.trim() : '';

  if (!isLocalDevelopmentHost(hostname)) return endpoint;
  if (!endpoint || HOSTED_POLKASWAP_INDEXER_ENDPOINTS.has(endpoint.toLowerCase())) {
    return LOCAL_POLKASWAP_INDEXER_ENDPOINT;
  }

  return endpoint;
}
