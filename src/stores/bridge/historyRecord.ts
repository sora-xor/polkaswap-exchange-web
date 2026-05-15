import type { IBridgeTransaction } from '@sora-substrate/sdk';

import type { BridgeHistoryState } from '@/stores/bridge/types';
import type { Nullable } from '@/types/common';

export type BridgeHistoryTransactionEntry = {
  key: string;
  transaction: IBridgeTransaction;
};

export type BridgePinnedHistoryState = Pick<
  BridgeHistoryState,
  'id' | 'inProgressIds' | 'internal' | 'waitingForApprove'
>;

/**
 * Resolves bridge transactions by their storage key or chain-level aliases.
 */
export const findBridgeHistoryTransactionEntry = (
  history: Record<string, IBridgeTransaction>,
  id?: Nullable<string>
): Nullable<BridgeHistoryTransactionEntry> => {
  if (!id) return null;

  const keyedTransaction = history[id];
  if (keyedTransaction) {
    return { key: id, transaction: keyedTransaction };
  }

  const entry = Object.entries(history).find(([, item]) => {
    return item?.id === id || item?.hash === id || item?.txId === id || item?.externalHash === id;
  });

  if (!entry) return null;

  const [key, transaction] = entry;
  return { key, transaction };
};

/**
 * Returns the transaction matching a storage key or chain-level alias.
 */
export const findBridgeHistoryTransaction = (
  history: Record<string, IBridgeTransaction>,
  id?: Nullable<string>
): Nullable<IBridgeTransaction> => findBridgeHistoryTransactionEntry(history, id)?.transaction ?? null;

/**
 * Builds the public id-keyed history record consumed by bridge views.
 */
export const buildBridgeHistoryRecord = (
  history: Record<string, IBridgeTransaction>
): Record<string, IBridgeTransaction> => {
  return Object.values(history).reduce<Record<string, IBridgeTransaction>>((buffer, item) => {
    if (!item?.id) return buffer;

    buffer[item.id] = item;
    return buffer;
  }, {});
};

/**
 * Keeps active, in-progress, or approval-pending transactions visible while the
 * indexer catches up to the local execution state.
 */
export const preservePinnedBridgeHistoryTransactions = (
  previous: BridgePinnedHistoryState,
  history: Record<string, IBridgeTransaction>
): Record<string, IBridgeTransaction> => {
  const previousHistory = previous.internal ?? {};
  const pinnedIds = new Set<string>(
    [previous.id, ...Object.keys(previous.inProgressIds), ...Object.keys(previous.waitingForApprove)].filter(Boolean)
  );

  if (!pinnedIds.size) return history;

  const nextHistory = { ...history };

  pinnedIds.forEach((id) => {
    if (findBridgeHistoryTransaction(nextHistory, id)) return;

    const previousEntry = findBridgeHistoryTransactionEntry(previousHistory, id);
    if (!previousEntry) return;

    nextHistory[previousEntry.key] = previousEntry.transaction;
  });

  return nextHistory;
};
