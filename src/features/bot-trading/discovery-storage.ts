import type { DiscoverySession } from './discovery';

const DATABASE = 'polkaswap-discovery-v1';
const STORE = 'checkpoints';
const HOLDOUT_STORE = 'holdout-reservations';
const MAX_BYTES = 32_000_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Public research persistence has no provider credential or wallet signing fields. */
export interface DiscoveryStore {
  load(): Promise<DiscoverySession | null>;
  save(session: DiscoverySession): Promise<void>;
  /** Atomically reserve one candidate's holdout across every tab and later checkpoint reset. */
  reserveHoldout(reservation: DiscoveryHoldoutReservation): Promise<DiscoveryHoldoutReservationResult>;
  /** Advisory read of previously exposed date ranges; reserveHoldout remains authoritative. */
  findHoldoutOverlaps(startAt: number, endAt: number): Promise<DiscoveryHoldoutOverlap[]>;
  clear(): Promise<void>;
}

export interface DiscoveryHoldoutOverlap {
  startAt: number;
  endAt: number;
}

export interface DiscoveryHoldoutReservation {
  sessionId: string;
  candidateId: string;
  startAt: number;
  endAt: number;
  reservedAt: number;
  checkpointRevision: number;
}

export type DiscoveryHoldoutReservationResult = 'reserved' | 'overlap' | 'alreadyReserved';

function validReservation(value: DiscoveryHoldoutReservation): boolean {
  return Boolean(
    value &&
    typeof value.sessionId === 'string' &&
    /^[a-zA-Z0-9-]{1,100}$/.test(value.sessionId) &&
    typeof value.candidateId === 'string' &&
    /^[a-zA-Z0-9-]{1,120}$/.test(value.candidateId) &&
    Number.isSafeInteger(value.startAt) &&
    value.startAt > 0 &&
    Number.isSafeInteger(value.endAt) &&
    value.endAt >= value.startAt &&
    Number.isSafeInteger(value.reservedAt) &&
    value.reservedAt >= value.endAt &&
    Number.isSafeInteger(value.checkpointRevision) &&
    value.checkpointRevision >= 1
  );
}

const invalid = () => new Error('bots.errors.storage');

/** Accept only a canonical hostname and optional port; a saved host cannot smuggle a URL or credential. */
function validProviderHost(value: unknown): boolean {
  if (typeof value !== 'string' || value.length < 1 || value.length > 255 || !/^[a-z0-9.:[\]-]+$/.test(value))
    return false;
  try {
    const url = new URL(`https://${value}/`);
    if (url.host !== value || url.username || url.password || url.search || url.hash || url.pathname !== '/')
      return false;
    if (url.hostname.startsWith('[')) return true;
    return url.hostname.split('.').every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
  } catch {
    return false;
  }
}

/** Return unique exposed windows only, without session or candidate identifiers. */
export function findDiscoveryHoldoutOverlaps(
  reservations: readonly (DiscoveryHoldoutReservation & { key?: unknown })[],
  startAt: number,
  endAt: number
): DiscoveryHoldoutOverlap[] {
  if (!Number.isSafeInteger(startAt) || startAt <= 0 || !Number.isSafeInteger(endAt) || endAt < startAt)
    throw invalid();
  const intervals = new Map<string, DiscoveryHoldoutOverlap>();
  for (const reservation of reservations) {
    if (
      !validReservation(reservation) ||
      (reservation.key !== undefined && reservation.key !== `${reservation.sessionId}:${reservation.candidateId}`)
    )
      throw invalid();
    if (reservation.endAt < startAt || reservation.startAt > endAt) continue;
    const key = `${reservation.startAt}:${reservation.endAt}`;
    intervals.set(key, { startAt: reservation.startAt, endAt: reservation.endAt });
  }
  return [...intervals.values()].sort((left, right) => left.startAt - right.startAt || left.endAt - right.endAt);
}

/** Reject hidden extensions and secret-bearing fields before a checkpoint reaches IndexedDB. */
export function copyDiscoveryCheckpoint(value: DiscoverySession): DiscoverySession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const raw = value as DiscoverySession;
  if (
    raw.version !== 1 ||
    !Number.isSafeInteger(raw.createdAt) ||
    !Number.isSafeInteger(raw.updatedAt) ||
    (raw.revision !== undefined && (!Number.isSafeInteger(raw.revision) || raw.revision < 0)) ||
    raw.createdAt < 90 * DAY ||
    raw.updatedAt < raw.createdAt ||
    !Number.isSafeInteger(raw.callCap) ||
    raw.callCap < 1 ||
    raw.callCap > 36 ||
    !Number.isSafeInteger(raw.callsUsed) ||
    raw.callsUsed < 0 ||
    raw.callsUsed > raw.callCap ||
    !Number.isSafeInteger(raw.failedCalls) ||
    raw.failedCalls < 0 ||
    raw.failedCalls > raw.callsUsed ||
    !Array.isArray(raw.assets) ||
    !Array.isArray(raw.pairs) ||
    !Array.isArray(raw.candidates) ||
    !Array.isArray(raw.finalists) ||
    raw.candidates.length > 36 ||
    raw.finalists.length > 3 ||
    raw.pairs.length !== raw.assets.length * Math.max(0, raw.assets.length - 1) ||
    typeof raw.feedbackExploratory !== 'boolean' ||
    (raw.holdoutReuse !== undefined && typeof raw.holdoutReuse !== 'boolean') ||
    (raw.feedbackExploratory && raw.finalists.length > 0) ||
    (raw.holdoutReuse && raw.finalists.length > 0) ||
    (raw.lastDispatchAt !== undefined &&
      (!Number.isSafeInteger(raw.lastDispatchAt) || raw.lastDispatchAt < 0 || raw.lastDispatchAt > raw.updatedAt)) ||
    typeof raw.idea !== 'string' ||
    raw.idea.length > 500 ||
    (raw.provider !== undefined &&
      (!raw.provider ||
        typeof raw.provider !== 'object' ||
        Array.isArray(raw.provider) ||
        !['openai', 'claude', 'jev', 'custom', 'codex', 'claude-code'].includes(raw.provider.kind) ||
        ![1, 2, 3].includes(Object.keys(raw.provider).length) ||
        Object.keys(raw.provider).some((key) => !['kind', 'model', 'endpointHost'].includes(key)) ||
        (raw.provider.model !== undefined &&
          (typeof raw.provider.model !== 'string' ||
            !/^[A-Za-z0-9][A-Za-z0-9._:/+-]{0,127}$/.test(raw.provider.model))) ||
        (raw.provider.endpointHost !== undefined &&
          (raw.provider.kind !== 'custom' || !validProviderHost(raw.provider.endpointHost))))) ||
    (raw.researchProgress !== undefined &&
      (!raw.researchProgress ||
        typeof raw.researchProgress !== 'object' ||
        Array.isArray(raw.researchProgress) ||
        Object.keys(raw.researchProgress).sort().join(',') !== 'pairKey,stage' ||
        !raw.pairs.some((pair) => pair.key === raw.researchProgress?.pairKey) ||
        !['evidence', 'cooldown', 'request', 'training', 'holdout'].includes(raw.researchProgress.stage) ||
        (raw.researchProgress.stage === 'holdout' ? raw.phase !== 'finalizing' : raw.phase !== 'researching'))) ||
    !['created', 'scanning', 'researching', 'finalizing', 'paused', 'complete', 'error'].includes(raw.status) ||
    !['scanning', 'researching', 'finalizing', 'complete'].includes(raw.phase)
  )
    throw invalid();
  const window = raw.window;
  if (
    !window ||
    !Number.isSafeInteger(window.startAt) ||
    !Number.isSafeInteger(window.trainingEndAt) ||
    !Number.isSafeInteger(window.holdoutStartAt) ||
    !Number.isSafeInteger(window.endAt) ||
    window.startAt < 0 ||
    window.endAt !== Math.floor(raw.createdAt / HOUR) * HOUR ||
    window.trainingEndAt - window.startAt !== 76 * DAY ||
    window.holdoutStartAt !== window.trainingEndAt + HOUR ||
    window.endAt - window.trainingEndAt !== 14 * DAY
  )
    throw invalid();
  if (raw.liveFeedback !== undefined) {
    const feedback = raw.liveFeedback;
    if (
      !raw.feedbackExploratory ||
      Object.keys(feedback).sort().join(',') !==
        'activeHours,drawdownPercent,excessReturnPercent,feesPaidXor,netReturnPercent,pairKey,successfulSwaps' ||
      !raw.pairs.some((pair) => pair.key === feedback.pairKey) ||
      !Number.isSafeInteger(feedback.activeHours) ||
      feedback.activeHours < 0 ||
      feedback.activeHours > 100_000 ||
      !Number.isSafeInteger(feedback.successfulSwaps) ||
      feedback.successfulSwaps < 0 ||
      feedback.successfulSwaps > 1_000_000 ||
      ![feedback.netReturnPercent, feedback.excessReturnPercent, feedback.drawdownPercent, feedback.feesPaidXor].every(
        (item) => typeof item === 'string' && /^-?(?:0|[1-9]\d{0,23})(?:\.\d{1,40})?$/.test(item)
      )
    )
      throw invalid();
  }
  const forbidden = new Set([
    'apiKey',
    'privateKey',
    'secret',
    'password',
    'authorization',
    'sessionToken',
    'signedBytes',
    'signature',
    'bearer',
    'walletAddress',
    'txHash',
  ]);
  const inspect = (item: unknown, depth = 0): void => {
    if (depth > 22) throw invalid();
    if (item === null || typeof item === 'boolean' || typeof item === 'number' || typeof item === 'string') return;
    if (Array.isArray(item)) {
      if (item.length > 100_000) throw invalid();
      for (const child of item) inspect(child, depth + 1);
      return;
    }
    if (!item || typeof item !== 'object' || Object.getPrototypeOf(item) !== Object.prototype) throw invalid();
    const descriptors = Object.getOwnPropertyDescriptors(item);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (forbidden.has(key) || !('value' in descriptor)) throw invalid();
      inspect(descriptor.value, depth + 1);
    }
  };
  inspect(raw);
  for (const candidate of [...raw.candidates, ...raw.finalists]) {
    if (
      candidate.template &&
      (candidate.template.mode !== 'paper' ||
        candidate.template.account !== 'paper' ||
        candidate.template.network !== 'paper' ||
        candidate.template.sessionExpiresAt !== 0 ||
        candidate.template.model !== '' ||
        candidate.template.endpoint !== '')
    )
      throw invalid();
  }
  const serialized = JSON.stringify(raw);
  if (serialized.length > MAX_BYTES) throw invalid();
  return { revision: 0, holdoutReuse: false, ...JSON.parse(serialized) } as DiscoverySession;
}

/** A dedicated IndexedDB record keeps research separate from funded bot/order state. */
export function createIndexedDbDiscoveryStore(): DiscoveryStore {
  const database = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(invalid());
      const request = indexedDB.open(DATABASE, 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
        if (!request.result.objectStoreNames.contains(HOLDOUT_STORE)) {
          request.result.createObjectStore(HOLDOUT_STORE, { keyPath: 'key' }).createIndex('endAt', 'endAt');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(invalid());
    });
  const transact = async <T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore, setResult: (value: T) => void) => void
  ): Promise<T> => {
    const db = await database();
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode, mode === 'readwrite' ? { durability: 'strict' } : undefined);
        let result: T;
        let hasResult = false;
        transaction.onerror = () => reject(invalid());
        transaction.onabort = () => reject(invalid());
        transaction.oncomplete = () => (hasResult ? resolve(result) : reject(invalid()));
        operation(transaction.objectStore(STORE), (value) => {
          result = value;
          hasResult = true;
        });
      });
    } finally {
      db.close();
    }
  };
  return {
    async load() {
      return transact<DiscoverySession | null>('readonly', (store, resolve) => {
        const request = store.get('latest');
        request.onsuccess = () => resolve(request.result ? copyDiscoveryCheckpoint(request.result) : null);
      });
    },
    async save(session) {
      const checkpoint = copyDiscoveryCheckpoint(session);
      await transact<void>('readwrite', (store, resolve) => {
        const request = store.get('latest');
        request.onsuccess = () => {
          let previous: DiscoverySession | null;
          try {
            previous = request.result ? copyDiscoveryCheckpoint(request.result) : null;
          } catch {
            store.transaction.abort();
            return;
          }
          const sameSession = previous?.id === checkpoint.id;
          const validAdvance = sameSession && previous !== null && checkpoint.revision === previous.revision + 1;
          const validNewSession =
            !sameSession &&
            checkpoint.revision === 1 &&
            checkpoint.status === 'created' &&
            (!previous || ['paused', 'error', 'complete'].includes(previous.status));
          if (!validAdvance && !validNewSession) {
            store.transaction.abort();
            return;
          }
          const write = store.put(checkpoint, 'latest');
          write.onsuccess = () => resolve();
        };
      });
    },
    async reserveHoldout(reservation) {
      if (!validReservation(reservation)) throw invalid();
      const db = await database();
      try {
        return await new Promise<DiscoveryHoldoutReservationResult>((resolve, reject) => {
          // The read and conditional write share one readwrite transaction. IndexedDB serializes
          // this object store across tabs, so two overlapping first exposures cannot both win.
          const transaction = db.transaction([STORE, HOLDOUT_STORE], 'readwrite', { durability: 'strict' });
          const reservations = transaction.objectStore(HOLDOUT_STORE);
          let result: DiscoveryHoldoutReservationResult | undefined;
          transaction.onerror = () => reject(invalid());
          transaction.onabort = () => reject(invalid());
          transaction.oncomplete = () => (result ? resolve(result) : reject(invalid()));
          const checkpointRequest = transaction.objectStore(STORE).get('latest');
          checkpointRequest.onsuccess = () => {
            const checkpoint = checkpointRequest.result as DiscoverySession | undefined;
            if (
              !checkpoint ||
              checkpoint.id !== reservation.sessionId ||
              checkpoint.revision !== reservation.checkpointRevision
            ) {
              transaction.abort();
              return;
            }
            const request = reservations.index('endAt').getAll(IDBKeyRange.lowerBound(reservation.startAt));
            request.onsuccess = () => {
              const previous = request.result as Array<DiscoveryHoldoutReservation & { key: string }>;
              if (
                previous.some((item) => !validReservation(item) || item.key !== `${item.sessionId}:${item.candidateId}`)
              ) {
                transaction.abort();
                return;
              }
              if (
                previous.some(
                  (item) => item.sessionId === reservation.sessionId && item.candidateId === reservation.candidateId
                )
              ) {
                result = 'alreadyReserved';
                return;
              }
              if (
                previous.some((item) => item.sessionId !== reservation.sessionId && item.startAt <= reservation.endAt)
              ) {
                result = 'overlap';
                return;
              }
              const key = `${reservation.sessionId}:${reservation.candidateId}`;
              reservations.put({ ...reservation, key });
              result = 'reserved';
            };
          };
        });
      } finally {
        db.close();
      }
    },
    async findHoldoutOverlaps(startAt, endAt) {
      // Validate before opening IndexedDB so malformed windows never become index bounds.
      findDiscoveryHoldoutOverlaps([], startAt, endAt);
      const db = await database();
      try {
        return await new Promise<DiscoveryHoldoutOverlap[]>((resolve, reject) => {
          const transaction = db.transaction(HOLDOUT_STORE, 'readonly');
          let result: DiscoveryHoldoutOverlap[] | undefined;
          transaction.onerror = () => reject(invalid());
          transaction.onabort = () => reject(invalid());
          transaction.oncomplete = () => (result ? resolve(result) : reject(invalid()));
          const request = transaction.objectStore(HOLDOUT_STORE).index('endAt').getAll(IDBKeyRange.lowerBound(startAt));
          request.onsuccess = () => {
            try {
              result = findDiscoveryHoldoutOverlaps(request.result as DiscoveryHoldoutReservation[], startAt, endAt);
            } catch {
              transaction.abort();
            }
          };
        });
      } finally {
        db.close();
      }
    },
    async clear() {
      // Research resets do not clear holdout exposure. A new search cannot reuse it as untouched.
      await transact<void>('readwrite', (store, resolve) => {
        const request = store.delete('latest');
        request.onsuccess = () => resolve();
      });
    },
  };
}

/** Recover only validated public state; callers must reconnect the selected AI provider. */
export async function loadDiscoverySession(): Promise<DiscoverySession | null> {
  if (typeof indexedDB === 'undefined') return null;
  return createIndexedDbDiscoveryStore().load();
}
