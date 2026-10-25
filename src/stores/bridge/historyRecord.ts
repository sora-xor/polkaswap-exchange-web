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

const BridgeHistoryIdentityFields = ['id', 'hash', 'txId', 'externalHash'] as const;

/**
 * Returns stable transaction identifiers that can point to the same bridge row
 * across locally generated and indexer-restored history entries.
 */
const getBridgeHistoryIdentityValues = (transaction: IBridgeTransaction): string[] => {
  return BridgeHistoryIdentityFields.reduce<string[]>((buffer, field) => {
    const value = transaction[field];

    if (typeof value === 'string' && value) {
      buffer.push(value);
    }

    return buffer;
  }, []);
};

/**
 * Finds the existing canonical history key when a transaction shares any known
 * bridge identifier with an item already written to the record.
 */
const findDuplicateBridgeHistoryKey = (
  history: Record<string, IBridgeTransaction>,
  transaction: IBridgeTransaction
): Nullable<string> => {
  const identities = new Set(getBridgeHistoryIdentityValues(transaction));

  if (!identities.size) return null;

  const duplicate = Object.entries(history).find(([, item]) => {
    return getBridgeHistoryIdentityValues(item).some((identity) => identities.has(identity));
  });

  return duplicate?.[0] ?? null;
};

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
 * Entries that share chain-level aliases are merged so the same bridge transfer
 * cannot appear more than once when restored history overlaps local history.
 */
export const buildBridgeHistoryRecord = (
  history: Record<string, IBridgeTransaction>
): Record<string, IBridgeTransaction> => {
  return Object.values(history).reduce<Record<string, IBridgeTransaction>>((buffer, item) => {
    if (!item?.id) return buffer;

    const duplicateKey = findDuplicateBridgeHistoryKey(buffer, item);

    if (!duplicateKey) {
      buffer[item.id] = item;
      return buffer;
    }

    const transaction = { ...buffer[duplicateKey], ...item };

    delete buffer[duplicateKey];
    buffer[transaction.id] = transaction;

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
