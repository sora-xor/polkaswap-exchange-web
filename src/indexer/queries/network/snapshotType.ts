import { SnapshotTypes } from '@/lib/soraneo-wallet/src/services/indexer/types';

/**
 * Resolves the snapshot granularity used for network history queries.
 * Monthly network snapshots are sparse on the Polkaswap indexer, so callers
 * that still request monthly history are served from daily snapshots instead.
 */
export const resolveNetworkHistorySnapshotType = (type: SnapshotTypes): SnapshotTypes => {
  return type === SnapshotTypes.MONTH ? SnapshotTypes.DAY : type;
};
