import type { ExplorerRequestOptions } from '@/lib/soraneo-wallet/src/services/indexer/explorer/base';

/** Market lists need a fresh core view for each requested page. */
export const marketRequestOptions: ExplorerRequestOptions = { requestPolicy: 'network-only', retryPendingCore: true };

// Pi's public GraphQL service accepts at most 100 entries in a filter array.
const MAX_ASSET_IDS = 100;

/**
 * Loads disjoint asset filters in stable order. Each read follows its own pagination.
 * An empty selection keeps the caller's unfiltered query. A failed batch invalidates the whole selection.
 */
export async function fetchByAssetIds<T>(
  ids: readonly string[],
  fetchAllPages: (batch: string[]) => Promise<Nullable<T[]>>
): Promise<Nullable<T[]>> {
  const unique = [...new Set(ids)].sort();
  if (!unique.length) return fetchAllPages([]);

  const result: T[] = [];
  for (let start = 0; start < unique.length; start += MAX_ASSET_IDS) {
    const rows = await fetchAllPages(unique.slice(start, start + MAX_ASSET_IDS));
    if (!rows) return null;
    for (const row of rows) result.push(row);
  }
  return result;
}
