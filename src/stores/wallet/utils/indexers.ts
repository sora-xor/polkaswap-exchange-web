import { ConnectionStatus, type IndexerState } from '@/shims/wallet-common-types';
import { IndexerType } from '@/shims/wallet-consts';
import type { Nullable } from '@/types/common';

type IndexerTable = Partial<Record<string, Partial<Pick<IndexerState, 'endpoint' | 'status'>>>>;

const DEFAULT_INDEXER_ORDER = Object.values(IndexerType);

/**
 * Returns true when an indexer has a usable endpoint configured.
 */
export function hasConfiguredIndexerEndpoint(indexer?: Partial<Pick<IndexerState, 'endpoint'>>): boolean {
  return typeof indexer?.endpoint === 'string' && indexer.endpoint.length > 0;
}

/**
 * Chooses the best indexer to activate, preferring the requested type only when
 * it actually has an endpoint configured.
 */
export function resolvePreferredIndexer(
  requested: Nullable<string>,
  indexers: IndexerTable,
  order: readonly string[] = DEFAULT_INDEXER_ORDER
): Nullable<string> {
  if (requested && hasConfiguredIndexerEndpoint(indexers[requested])) {
    return requested;
  }

  for (const candidate of order) {
    if (hasConfiguredIndexerEndpoint(indexers[candidate])) {
      return candidate;
    }
  }

  return requested ?? order[0] ?? null;
}

/**
 * Chooses a fallback indexer after the current one becomes unavailable. Only
 * configured and not-yet-unavailable candidates are considered.
 */
export function resolveFallbackIndexer(
  current: Nullable<string>,
  indexers: IndexerTable,
  order: readonly string[] = DEFAULT_INDEXER_ORDER
): Nullable<string> {
  for (const candidate of order) {
    if (candidate === current) continue;

    const entry = indexers[candidate];

    if (!hasConfiguredIndexerEndpoint(entry)) continue;
    if (entry?.status === ConnectionStatus.Unavailable) continue;

    return candidate;
  }

  return null;
}
