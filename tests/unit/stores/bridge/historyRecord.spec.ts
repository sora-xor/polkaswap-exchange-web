import { Operation } from '@sora-substrate/sdk';
import { describe, expect, it } from 'vitest';

import {
  buildBridgeHistoryRecord,
  findBridgeHistoryTransaction,
  findBridgeHistoryTransactionEntry,
  preservePinnedBridgeHistoryTransactions,
} from '@/stores/bridge/historyRecord';

import type { IBridgeTransaction } from '@sora-substrate/sdk';
import type { BridgePinnedHistoryState } from '@/stores/bridge/historyRecord';

const tx = (data: Partial<IBridgeTransaction>): IBridgeTransaction =>
  ({
    type: Operation.EthBridgeOutgoing,
    ...data,
  }) as IBridgeTransaction;

const pinnedState = (history: Record<string, IBridgeTransaction>): BridgePinnedHistoryState => ({
  id: '',
  internal: history,
  inProgressIds: {},
  waitingForApprove: {},
});

describe('bridge history record helpers', () => {
  it('finds transactions by storage key or chain aliases', () => {
    const transaction = tx({
      id: 'local-id',
      hash: 'sora-hash',
      txId: 'sora-tx',
      externalHash: 'external-hash',
    });
    const history = {
      storageKey: transaction,
    };

    expect(findBridgeHistoryTransactionEntry(history, 'storageKey')).toEqual({
      key: 'storageKey',
      transaction,
    });
    expect(findBridgeHistoryTransaction(history, 'sora-hash')).toBe(transaction);
    expect(findBridgeHistoryTransaction(history, 'sora-tx')).toBe(transaction);
    expect(findBridgeHistoryTransaction(history, 'external-hash')).toBe(transaction);
    expect(findBridgeHistoryTransaction(history, 'missing')).toBeNull();
  });

  it('builds an id-keyed history record and skips malformed entries', () => {
    const valid = tx({ id: 'valid-id' });
    const history = {
      storageKey: valid,
      malformed: tx({ id: undefined }),
    };

    expect(buildBridgeHistoryRecord(history)).toEqual({
      'valid-id': valid,
    });
  });

  it('deduplicates transactions that share chain identifiers', () => {
    const local = tx({
      id: 'local-id',
      hash: 'sora-hash',
      txId: 'sora-tx',
      amount: '1',
    });
    const restored = tx({
      id: 'restored-id',
      txId: 'sora-tx',
      externalHash: 'external-hash',
      amount: '1',
      endTime: 2,
    });
    const distinct = tx({
      id: 'distinct-id',
      txId: 'distinct-tx',
    });

    expect(
      buildBridgeHistoryRecord({
        localStorage: local,
        restoredStorage: restored,
        distinctStorage: distinct,
      })
    ).toEqual({
      'restored-id': {
        ...local,
        ...restored,
      },
      'distinct-id': distinct,
    });
  });

  it('preserves active and pending transactions while refreshed history catches up', () => {
    const active = tx({ id: 'active-id', hash: 'active-hash' });
    const approving = tx({ id: 'approval-id' });
    const inProgress = tx({ id: 'progress-id' });
    const refreshed = {
      refreshed: tx({ id: 'refreshed-id' }),
    };
    const previous = {
      ...pinnedState({
        activeStorage: active,
        approvalStorage: approving,
        progressStorage: inProgress,
      }),
      id: 'active-hash',
      inProgressIds: {
        'progress-id': true,
      },
      waitingForApprove: {
        'approval-id': true,
      },
    };

    expect(preservePinnedBridgeHistoryTransactions(previous, refreshed)).toEqual({
      ...refreshed,
      activeStorage: active,
      approvalStorage: approving,
      progressStorage: inProgress,
    });
  });

  it('does not duplicate pinned transactions already present in refreshed history', () => {
    const active = tx({ id: 'active-id', hash: 'active-hash' });
    const previous = {
      ...pinnedState({
        activeStorage: active,
      }),
      id: 'active-hash',
    };
    const refreshed = {
      refreshedStorage: active,
    };

    expect(preservePinnedBridgeHistoryTransactions(previous, refreshed)).toEqual(refreshed);
  });
});
