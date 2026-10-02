import { AUTOPILOT_AGGREGATE_REASONS, type AutopilotQualificationDiagnostics } from './autopilot-diagnostics';

/** Durable, origin-scoped quarantine for holdout windows already dispatched by Bots GO. */
export interface AutopilotValidationWindow {
  readonly from: number;
  readonly to: number;
  /** Only the bounded rejection of this exact reserved window, never holdout observations. */
  readonly diagnostics?: AutopilotQualificationDiagnostics;
}

export interface AutopilotValidationExposureStore {
  read(key: string): Promise<AutopilotValidationWindow | null>;
  /** Atomically refuse a window overlapping any previously dispatched holdout. */
  reserve(key: string, window: AutopilotValidationWindow, legacyKey?: string): Promise<void>;
  /** Attach an allowlisted rejection only while this exact window remains the latest reservation. */
  saveDiagnostics(
    key: string,
    window: AutopilotValidationWindow,
    diagnostics: AutopilotQualificationDiagnostics
  ): Promise<void>;
}

const DATABASE = 'polkaswap-bots-validation-v1';
const OBJECT_STORE = 'exposure';
const STABLE_KEY_VERSION = 'bots-holdout-v2';
const HOUR = 3_600_000;
const WEEK = 7 * 24 * HOUR;
const storageError = () => new Error('bots.errors.storage');
const staleError = () => new Error('bots.errors.stale');

interface StableExposureScope {
  readonly genesis: string;
  readonly pair: readonly [string, string];
}

/** Bind holdout exposure to the chain and unordered pair, not a changeable RPC endpoint or runtime version. */
export function autopilotValidationExposureKey(network: string, assetIn: string, assetOut: string): string {
  const parsed = parseNetworkIdentity(network);
  if (!parsed || parsed[0] !== true || !validAsset(assetIn) || !validAsset(assetOut) || assetIn === assetOut)
    throw storageError();
  const key = JSON.stringify([STABLE_KEY_VERSION, parsed[1], ...[assetIn, assetOut].sort()]);
  if (key.length > 512) throw storageError();
  return key;
}

/** Parse the controller's four-field node identity without trusting malformed or incomplete chain context. */
function parseNetworkIdentity(value: unknown): readonly [boolean, string, string | null, number | null] | null {
  if (typeof value !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 4 ||
      typeof parsed[0] !== 'boolean' ||
      typeof parsed[1] !== 'string' ||
      !parsed[1] ||
      parsed[1].length > 256 ||
      !(typeof parsed[2] === 'string' || parsed[2] === null) ||
      !(parsed[3] === null || (Number.isSafeInteger(parsed[3]) && parsed[3] >= 0))
    )
      return null;
    return parsed as [boolean, string, string | null, number | null];
  } catch {
    return null;
  }
}

/** Asset identifiers are exact strings; sorting prevents reversing a pair from reopening its holdout. */
function validAsset(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 256;
}

/** Recognize only the v2 key produced by this module. */
function stableScope(key: string): StableExposureScope | null {
  try {
    const parsed: unknown = JSON.parse(key);
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 4 ||
      parsed[0] !== STABLE_KEY_VERSION ||
      typeof parsed[1] !== 'string' ||
      !parsed[1] ||
      !validAsset(parsed[2]) ||
      !validAsset(parsed[3]) ||
      parsed[2] >= parsed[3]
    )
      return null;
    return { genesis: parsed[1], pair: [parsed[2], parsed[3]] };
  } catch {
    return null;
  }
}

/** A malformed old key for this pair is ambiguous and must fail closed instead of resetting the watermark. */
function matchingLegacyKey(key: IDBValidKey, scope: StableExposureScope): boolean {
  if (typeof key !== 'string') return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(key);
  } catch {
    return false;
  }
  if (!Array.isArray(parsed) || parsed.length !== 3) return false;
  if (!validAsset(parsed[1]) || !validAsset(parsed[2])) return false;
  const pair = [parsed[1], parsed[2]].sort();
  if (pair[0] !== scope.pair[0] || pair[1] !== scope.pair[1]) return false;
  const network = parseNetworkIdentity(parsed[0]);
  if (!network) throw storageError();
  return network[1] === scope.genesis;
}

/** Only one candidate's allowlisted verdict may survive a reload; prices and provider text cannot enter storage. */
function validValidationDiagnostics(value: unknown): value is AutopilotQualificationDiagnostics {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const fields = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(fields).length !== 2 ||
    !fields.stage ||
    !fields.failures ||
    !('value' in fields.stage) ||
    !('value' in fields.failures) ||
    fields.stage.value !== 'validation'
  )
    return false;
  const failures = fields.failures.value as unknown;
  if (!Array.isArray(failures) || Object.getPrototypeOf(failures) !== Array.prototype || failures.length !== 1)
    return false;
  const failureFields = Object.getOwnPropertyDescriptors(failures);
  if (Reflect.ownKeys(failureFields).length !== 2 || !failureFields['0'] || !('value' in failureFields['0']))
    return false;
  const failure = failureFields['0'].value as unknown;
  if (!failure || typeof failure !== 'object' || Object.getPrototypeOf(failure) !== Object.prototype) return false;
  const entry = Object.getOwnPropertyDescriptors(failure);
  if (
    Reflect.ownKeys(entry).length !== 2 ||
    !entry.candidate ||
    !entry.reasons ||
    !('value' in entry.candidate) ||
    !('value' in entry.reasons) ||
    !Number.isSafeInteger(entry.candidate.value) ||
    entry.candidate.value < 1 ||
    entry.candidate.value > 3
  )
    return false;
  const reasons = entry.reasons.value as unknown;
  if (
    !Array.isArray(reasons) ||
    Object.getPrototypeOf(reasons) !== Array.prototype ||
    reasons.length < 1 ||
    reasons.length > AUTOPILOT_AGGREGATE_REASONS.length
  )
    return false;
  const reasonFields = Object.getOwnPropertyDescriptors(reasons);
  if (Reflect.ownKeys(reasonFields).length !== reasons.length + 1) return false;
  const values: unknown[] = [];
  for (let index = 0; index < reasons.length; index++) {
    const field = reasonFields[String(index)];
    if (!field || !('value' in field)) return false;
    values.push(field.value as unknown);
  }
  return (
    new Set(values).size === values.length &&
    values.every((reason) =>
      AUTOPILOT_AGGREGATE_REASONS.includes(reason as (typeof AUTOPILOT_AGGREGATE_REASONS)[number])
    )
  );
}

/** Reject malformed stored records instead of treating corruption as an untouched holdout. */
function validWindow(value: unknown, allowDiagnostics = true): value is AutopilotValidationWindow {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const fields = Object.getOwnPropertyDescriptors(value);
  const hasDiagnostics = Boolean(fields.diagnostics);
  if (
    Reflect.ownKeys(fields).length !== (hasDiagnostics ? 3 : 2) ||
    !fields.from ||
    !fields.to ||
    (hasDiagnostics &&
      (!allowDiagnostics || !('value' in fields.diagnostics) || !validValidationDiagnostics(fields.diagnostics.value)))
  )
    return false;
  if (!('value' in fields.from) || !('value' in fields.to)) return false;
  const from = fields.from.value as unknown;
  const to = fields.to.value as unknown;
  return (
    Number.isSafeInteger(from) &&
    Number.isSafeInteger(to) &&
    (from as number) > 0 &&
    (from as number) % HOUR === 0 &&
    (to as number) % HOUR === 0 &&
    (to as number) > (from as number) &&
    (to as number) - (from as number) <= WEEK
  );
}

/** IndexedDB readwrite transactions serialize competing tabs before either reads the old watermark. */
export function createAutopilotValidationExposureStore(
  factory: IDBFactory | undefined = globalThis.indexedDB
): AutopilotValidationExposureStore {
  const open = (): Promise<IDBDatabase> => {
    if (!factory) return Promise.reject(storageError());
    return new Promise((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        request = factory.open(DATABASE, 1);
      } catch {
        reject(storageError());
        return;
      }
      let failed = false;
      request.onupgradeneeded = () => {
        try {
          if (!request.result.objectStoreNames.contains(OBJECT_STORE)) request.result.createObjectStore(OBJECT_STORE);
        } catch {
          failed = true;
          reject(storageError());
        }
      };
      request.onerror = request.onblocked = () => {
        failed = true;
        reject(storageError());
      };
      request.onsuccess = () => {
        if (failed) request.result.close();
        else resolve(request.result);
      };
    });
  };
  const transact = async <T>(
    key: string,
    write: boolean,
    action: (old: AutopilotValidationWindow | null, store: IDBObjectStore) => T
  ): Promise<T> => {
    if (typeof key !== 'string' || key.length < 3 || key.length > 512) throw storageError();
    const database = await open();
    return new Promise((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction = database.transaction(
          OBJECT_STORE,
          write ? 'readwrite' : 'readonly',
          write ? { durability: 'strict' } : undefined
        );
      } catch {
        database.close();
        reject(storageError());
        return;
      }
      let result!: T;
      let failure: Error | undefined;
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        database.close();
        if (error) reject(error);
        else resolve(result);
      };
      transaction.oncomplete = () => finish();
      transaction.onerror = transaction.onabort = () => finish(failure ?? storageError());
      try {
        const store = transaction.objectStore(OBJECT_STORE);
        const request = store.get(key);
        request.onsuccess = () => {
          try {
            const old = request.result === undefined ? null : request.result;
            if (request.result !== undefined && !validWindow(request.result)) throw storageError();
            result = action(old, store);
          } catch (error) {
            failure = error instanceof Error ? error : storageError();
            transaction.abort();
          }
        };
      } catch {
        failure = storageError();
        transaction.abort();
      }
    });
  };
  /** Scan and migrate all known v1 endpoint keys in the same transaction as the v2 reservation. */
  const transactStable = async (
    key: string,
    scope: StableExposureScope,
    window?: AutopilotValidationWindow,
    legacyKey?: string
  ): Promise<AutopilotValidationWindow | null> => {
    if (
      legacyKey !== undefined &&
      (legacyKey.length < 3 || legacyKey.length > 512 || !matchingLegacyKey(legacyKey, scope))
    )
      throw storageError();
    const database = await open();
    return new Promise((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction = database.transaction(
          OBJECT_STORE,
          window ? 'readwrite' : 'readonly',
          window ? { durability: 'strict' } : undefined
        );
      } catch {
        database.close();
        reject(storageError());
        return;
      }
      let latest: AutopilotValidationWindow | null = null;
      let latestIsExact = false;
      const priorLegacyKeys = new Set<string>();
      let failure: Error | undefined;
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        database.close();
        if (error) reject(error);
        else resolve(latest);
      };
      transaction.oncomplete = () => finish();
      transaction.onerror = transaction.onabort = () => finish(failure ?? storageError());
      try {
        const store = transaction.objectStore(OBJECT_STORE);
        const cursorRequest = store.openCursor();
        cursorRequest.onsuccess = () => {
          try {
            const cursor = cursorRequest.result;
            if (cursor) {
              const exact = cursor.key === key;
              const legacy = !exact && matchingLegacyKey(cursor.key, scope);
              if (exact || legacy) {
                if (!validWindow(cursor.value)) throw storageError();
                const candidate = cursor.value;
                if (
                  !latest ||
                  candidate.to > latest.to ||
                  (candidate.to === latest.to &&
                    (candidate.from < latest.from || (candidate.from === latest.from && exact && !latestIsExact)))
                ) {
                  latest = candidate;
                  latestIsExact = exact;
                }
                if (legacy) priorLegacyKeys.add(cursor.key as string);
              }
              cursor.continue();
              return;
            }
            if (window) {
              if (latest && window.from <= latest.to) throw staleError();
              const record = { from: window.from, to: window.to };
              store.put(record, key);
              if (legacyKey) priorLegacyKeys.add(legacyKey);
              for (const prior of priorLegacyKeys) store.put(record, prior);
              latest = record;
            }
          } catch (error) {
            failure = error instanceof Error ? error : storageError();
            transaction.abort();
          }
        };
      } catch {
        failure = storageError();
        transaction.abort();
      }
    });
  };
  return {
    read: (key) => {
      if (typeof key !== 'string' || key.length < 3 || key.length > 512) return Promise.reject(storageError());
      const scope = stableScope(key);
      return scope ? transactStable(key, scope) : transact(key, false, (old) => old);
    },
    reserve: (key, window, legacyKey) => {
      if (!validWindow(window, false)) return Promise.reject(storageError());
      if (typeof key !== 'string' || key.length < 3 || key.length > 512) return Promise.reject(storageError());
      const scope = stableScope(key);
      if (scope) return transactStable(key, scope, window, legacyKey).then(() => undefined);
      if (legacyKey !== undefined) return Promise.reject(storageError());
      return transact(key, true, (old, store) => {
        if (old && window.from <= old.to) throw staleError();
        store.put({ from: window.from, to: window.to }, key);
      });
    },
    saveDiagnostics: (key, window, diagnostics) => {
      if (!validWindow(window, false) || !validValidationDiagnostics(diagnostics))
        return Promise.reject(storageError());
      const copied = {
        stage: 'validation' as const,
        failures: [{ candidate: diagnostics.failures[0].candidate, reasons: [...diagnostics.failures[0].reasons] }],
      };
      return transact(key, true, (old, store) => {
        if (!old || old.from !== window.from || old.to !== window.to) throw staleError();
        store.put({ from: old.from, to: old.to, diagnostics: copied }, key);
      });
    },
  };
}
