import { describe, expect, it } from 'vitest';

import { resolveNetworkHistorySnapshotType } from '@/indexer/queries/network/snapshotType';
import { SnapshotTypes } from '@/lib/soraneo-wallet/src/services/indexer/types';

describe('network snapshot type resolver', () => {
  it('uses daily snapshots when callers request sparse monthly network history', () => {
    expect(resolveNetworkHistorySnapshotType(SnapshotTypes.MONTH)).toBe(SnapshotTypes.DAY);
    expect(resolveNetworkHistorySnapshotType(SnapshotTypes.DAY)).toBe(SnapshotTypes.DAY);
    expect(resolveNetworkHistorySnapshotType(SnapshotTypes.HOUR)).toBe(SnapshotTypes.HOUR);
  });
});
