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
 * Static builds use the configured endpoint from `env.json`. Local development
 * only falls back to the sibling `polkaswap-indexer` service when no endpoint is
 * configured, so ordinary previews can still render live statistics.
 */
export function resolvePolkaswapIndexerEndpoint(configuredEndpoint: unknown, hostname = getBrowserHostname()): string {
  const endpoint = typeof configuredEndpoint === 'string' ? configuredEndpoint.trim() : '';

  if (endpoint) return endpoint;

  return isLocalDevelopmentHost(hostname) ? LOCAL_POLKASWAP_INDEXER_ENDPOINT : '';
}
