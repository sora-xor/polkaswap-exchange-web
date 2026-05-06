import { ConnectionStatus, type IndexerState } from '@/lib/soraneo-wallet/src/types/common';
import type { IndexerType } from '@/lib/soraneo-wallet/src/consts';

type IndexerStates = Record<IndexerType, Partial<IndexerState>>;

/**
 * Resolves the footer indexer status with a safe fallback strategy.
 *
 * Some runtime builds can miss `status` on the selected indexer while another
 * configured indexer already reports a definitive state. In that case we
 * surface the best-known status instead of keeping the footer in perpetual
 * "loading".
 */
export function resolveIndexerStatus(
  indexerType: IndexerType,
  indexersData: Partial<IndexerStates> = {}
): ConnectionStatus {
  const selectedStatus = indexersData?.[indexerType]?.status;
  if (selectedStatus) {
    return selectedStatus;
  }

  const fallbackStatuses = Object.values(indexersData)
    .map((entry) => entry?.status)
    .filter((status): status is ConnectionStatus => Boolean(status));

  if (fallbackStatuses.includes(ConnectionStatus.Available)) {
    return ConnectionStatus.Available;
  }

  if (fallbackStatuses.includes(ConnectionStatus.Unavailable)) {
    return ConnectionStatus.Unavailable;
  }

  return ConnectionStatus.Loading;
}
