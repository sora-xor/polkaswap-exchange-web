import { ConnectionStatus, type IndexerState } from '@/lib/soraneo-wallet/src/types/common';
import type { IndexerType } from '@/lib/soraneo-wallet/src/consts';

type IndexerStates = Record<IndexerType, Partial<IndexerState>>;

/**
 * Resolves the footer status for the selected indexer only.
 */
export function resolveIndexerStatus(
  indexerType: IndexerType,
  indexersData: Partial<IndexerStates> = {}
): ConnectionStatus {
  const selectedStatus = indexersData?.[indexerType]?.status;
  if (selectedStatus) {
    return selectedStatus;
  }

  return ConnectionStatus.Loading;
}
