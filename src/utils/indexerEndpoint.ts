/**
 * Resolves the Polkaswap indexer endpoint used by the static UI.
 *
 * Static builds use only the configured endpoint from `env.json`. An empty
 * value intentionally disables indexer-backed features until configuration is
 * provided.
 */
export function resolvePolkaswapIndexerEndpoint(configuredEndpoint: unknown): string {
  return typeof configuredEndpoint === 'string' ? configuredEndpoint.trim() : '';
}
