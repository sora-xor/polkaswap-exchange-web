/**
 * Coordinates transaction-history lookups across concurrent notification flows.
 * A shared coordinator is keyed by the API instance so app and wallet composables
 * cannot reserve the same newly inserted history item.
 */

export interface TransactionHistoryEntry {
  id?: string;
  startTime?: number | string;
}

interface TransactionHistoryCoordinator {
  activeLookups: number;
  claimedIds: Set<string>;
}

export interface TransactionHistoryLookup {
  readonly source: object;
  readonly startedAt: number;
  readonly existingIds: ReadonlySet<string>;
  completed: boolean;
}

const coordinators = new WeakMap<object, TransactionHistoryCoordinator>();

const getCoordinator = (source: object): TransactionHistoryCoordinator => {
  const existing = coordinators.get(source);
  if (existing) return existing;

  const coordinator: TransactionHistoryCoordinator = {
    activeLookups: 0,
    claimedIds: new Set<string>(),
  };
  coordinators.set(source, coordinator);
  return coordinator;
};

const getHistoryId = (entry: TransactionHistoryEntry): string => (entry.id == null ? '' : String(entry.id));

/**
 * Starts a lookup and snapshots history IDs that existed before submission.
 */
export const beginTransactionHistoryLookup = (
  source: object,
  history: readonly TransactionHistoryEntry[],
  startedAt: number
): TransactionHistoryLookup => {
  const coordinator = getCoordinator(source);
  coordinator.activeLookups += 1;

  return {
    source,
    startedAt,
    existingIds: new Set(history.map(getHistoryId).filter(Boolean)),
    completed: false,
  };
};

/**
 * Claims the newest eligible history entry for one submission.
 * Claiming is synchronous, making the check-and-reserve operation atomic between
 * JavaScript tasks even when multiple lookup loops resume together.
 */
export const claimTransactionHistoryEntry = <T extends TransactionHistoryEntry>(
  lookup: TransactionHistoryLookup,
  history: readonly T[]
): T | undefined => {
  const coordinator = getCoordinator(lookup.source);

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    const id = getHistoryId(entry);
    const startTime = Number(entry.startTime);

    if (
      !id ||
      !Number.isFinite(startTime) ||
      startTime < lookup.startedAt ||
      lookup.existingIds.has(id) ||
      coordinator.claimedIds.has(id)
    ) {
      continue;
    }

    coordinator.claimedIds.add(id);
    return entry;
  }

  return undefined;
};

/**
 * Completes a lookup and releases reservations after every overlapping lookup ends.
 */
export const finishTransactionHistoryLookup = (lookup: TransactionHistoryLookup): void => {
  if (lookup.completed) return;

  lookup.completed = true;
  const coordinator = coordinators.get(lookup.source);
  if (!coordinator) return;

  coordinator.activeLookups = Math.max(0, coordinator.activeLookups - 1);
  if (coordinator.activeLookups === 0) {
    coordinator.claimedIds.clear();
    coordinators.delete(lookup.source);
  }
};
