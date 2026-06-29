import type { IndexerState } from '@/lib/soraneo-wallet/src/types/common';
import { IndexerType } from '@/lib/soraneo-wallet/src/consts';
import type { Nullable } from '@/types/common';

type IndexerTable = Partial<Record<string, Partial<Pick<IndexerState, 'endpoint' | 'status'>>>>;

const DEFAULT_INDEXER_ORDER = [IndexerType.POLKASWAP];

/**
 * Returns true when an indexer has a usable endpoint configured.
 */
export function hasConfiguredIndexerEndpoint(indexer?: Partial<Pick<IndexerState, 'endpoint'>>): boolean {
  return typeof indexer?.endpoint === 'string' && indexer.endpoint.length > 0;
}

/** Resolves the requested indexer only when it is supported and configured. */
export function resolvePreferredIndexer(
  requested: Nullable<string>,
  indexers: IndexerTable,
  order: readonly string[] = DEFAULT_INDEXER_ORDER
): Nullable<string> {
  const supportedRequested = requested && order.includes(requested) ? requested : null;

  if (supportedRequested && hasConfiguredIndexerEndpoint(indexers[supportedRequested])) {
    return supportedRequested;
  }

  return null;
}
