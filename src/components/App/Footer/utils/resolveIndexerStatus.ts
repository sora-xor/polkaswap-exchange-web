import { WALLET_CONSTS, WALLET_TYPES } from '@wallet';

type IndexerStates = Record<WALLET_CONSTS.IndexerType, Partial<WALLET_TYPES.IndexerState>>;

/**
 * Resolves the footer indexer status with a safe fallback strategy.
 *
 * Some runtime builds can miss `status` on the selected indexer while another
 * configured indexer already reports a definitive state. In that case we
 * surface the best-known status instead of keeping the footer in perpetual
 * "loading".
 */
export function resolveIndexerStatus(
  indexerType: WALLET_CONSTS.IndexerType,
  indexersData: Partial<IndexerStates> = {}
): WALLET_TYPES.ConnectionStatus {
  const selectedStatus = indexersData?.[indexerType]?.status;
  if (selectedStatus) {
    return selectedStatus;
  }

  const fallbackStatuses = Object.values(indexersData)
    .map((entry) => entry?.status)
    .filter((status): status is WALLET_TYPES.ConnectionStatus => Boolean(status));

  if (fallbackStatuses.includes(WALLET_TYPES.ConnectionStatus.Available)) {
    return WALLET_TYPES.ConnectionStatus.Available;
  }

  if (fallbackStatuses.includes(WALLET_TYPES.ConnectionStatus.Unavailable)) {
    return WALLET_TYPES.ConnectionStatus.Unavailable;
  }

  return WALLET_TYPES.ConnectionStatus.Loading;
}
