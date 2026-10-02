/** Terminable exact-runtime131 execution. No network, file-input paths, signing or admission capability. */
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { Worker } from 'node:worker_threads';
import { assertGoalTargetRuntimeState, type GoalTargetRuntimeState } from './goal-target-runtime-state';

const COMPRESSED_SHA256 = 'db948406c5f22d4923b2760019de53bcd0ef756ed05accaf5156ca3041988447';
const CODE_HASH = '0xf062ed07861255f5ec443930de9c5066d1e4133036126d48462c8e233a75f27e';
const METADATA_SHA256 = '18aedaf96860e55c96ac6ad1d26f77cb2dc877ea822edf3242fdbe4f58bdd824';
const HEX = /^0x(?:[0-9a-f]{2})*$/;
const APIS = [
  'Core_version',
  'Metadata_metadata',
  'LiquidityProxyAPI_quote',
  'TransactionPaymentApi_query_info',
  'TransactionPaymentApi_query_fee_details',
] as const;

export type GoalTargetRuntimeApi = (typeof APIS)[number];
export interface GoalTargetRuntimeWorkerOptions {
  readonly compressedBytes: Uint8Array;
  readonly signal?: AbortSignal;
  readonly readinessTimeoutMs?: number;
  readonly invocationTimeoutMs?: number;
}
export interface GoalTargetRuntimeWorkerInvocation {
  readonly api: GoalTargetRuntimeApi;
  readonly inputHex: string;
  /** Must be the actual frozen capability returned by the original raw state verifier. */
  readonly state?: GoalTargetRuntimeState;
}
export interface GoalTargetRuntimeWorkerCallOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}
export interface GoalTargetRuntimeWorkerResult {
  readonly kind: 'hypothetical-target-runtime-read-only-v1';
  readonly api: GoalTargetRuntimeApi;
  readonly success: boolean;
  readonly resultHex?: string;
  readonly error?: string;
  readonly stateSha256: string | null;
  readonly declaredStateBytes: number;
  readonly hostCalls: readonly Readonly<Record<string, string | number | boolean>>[];
  readonly hostCallCounts: Readonly<Record<string, number>>;
  readonly totalHostCalls: number;
  readonly memoryBytes: number;
  readonly storageWrites: 0;
  readonly transactionExecution: false;
  readonly historicalFill: false;
  readonly admissionGranted: false;
}
export interface GoalTargetRuntimeWorker {
  readonly profile: Readonly<{
    specVersion: 131;
    transactionVersion: 131;
    compressedSha256: string;
    codeHash: string;
    metadataSha256: string;
    wasmBytes: number;
    wasmSha256: string;
  }>;
  readonly metadataHex: string;
  invoke(
    value: GoalTargetRuntimeWorkerInvocation,
    options?: GoalTargetRuntimeWorkerCallOptions
  ): Promise<GoalTargetRuntimeWorkerResult>;
  /** Permanently close; resolves only after the worker thread has terminated. */
  dispose(): Promise<void>;
}

const owned = new WeakMap<object, () => void>();

/** Assert factory ownership and a still-live worker lifecycle; this is not trading or evidence authority. */
export function assertGoalTargetRuntimeWorker(value: unknown): asserts value is GoalTargetRuntimeWorker {
  check(value && typeof value === 'object', 'unowned');
  const current = owned.get(value);
  check(current, 'unowned');
  current();
}

const fail = (reason: string): never => {
  throw new Error(`target-worker:${reason}`);
};
const check: (condition: unknown, reason: string) => asserts condition = (condition, reason) => {
  if (!condition) fail(reason);
};
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** Snapshot configuration without running property getters or accepting extra transport/code fields. */
function own(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  check(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype, 'input');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(descriptors).every((name) => typeof name === 'string' && allowed.includes(name)),
    'input'
  );
  check(
    Object.values(descriptors).every((d) => d.enumerable && 'value' in d),
    'input'
  );
  return Object.fromEntries(Object.entries(descriptors).map(([key, d]) => [key, d.value]));
}

function timeout(value: unknown, fallback: number): number {
  const result = value === undefined ? fallback : value;
  check(Number.isSafeInteger(result) && (result as number) >= 1 && (result as number) <= 30000, 'timeout');
  return result as number;
}

function signal(value: unknown): AbortSignal | undefined {
  check(value === undefined || value instanceof AbortSignal, 'signal');
  return value as AbortSignal | undefined;
}

/** Bytes use intrinsic typed-array access, never an overridden iterator, slice, buffer or length getter. */
function copyBinary(value: unknown): Uint8Array {
  check(value instanceof Uint8Array, 'binary');
  const typedArray = Object.getPrototypeOf(Uint8Array.prototype);
  const length = Object.getOwnPropertyDescriptor(typedArray, 'byteLength')!.get!.call(value) as number;
  const buffer = Object.getOwnPropertyDescriptor(typedArray, 'buffer')!.get!.call(value) as ArrayBuffer;
  check(length > 0 && length <= 4 * 1024 * 1024 && !(buffer instanceof SharedArrayBuffer), 'binary');
  const result = new Uint8Array(length);
  Uint8Array.prototype.set.call(result, value);
  check(sha(result) === COMPRESSED_SHA256, 'binary-pin');
  return result;
}

/** Freeze only trusted structured-cloned worker output; callers cannot alter later evidence. */
function frozen<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) frozen(item);
    Object.freeze(value);
  }
  return value;
}

/**
 * Compile and execute only in one fixed worker. The pin is checked before spawning or decompression.
 * Cancellation, any deadline, worker/protocol failure or disposal permanently revokes this instance.
 * Calls are serial and never queued; state ownership is checked before projecting bounded host data.
 */
export async function createGoalTargetRuntimeWorker(
  raw: GoalTargetRuntimeWorkerOptions
): Promise<GoalTargetRuntimeWorker> {
  const input = own(raw, ['compressedBytes', 'signal', 'readinessTimeoutMs', 'invocationTimeoutMs']);
  const lifetimeSignal = signal(input.signal);
  check(!lifetimeSignal?.aborted, 'aborted');
  const readinessTimeout = timeout(input.readinessTimeoutMs, 20000);
  const invocationTimeout = timeout(input.invocationTimeoutMs, 10000);
  const compressedBytes = copyBinary(input.compressedBytes);
  let closed: string | undefined;
  let terminated: Promise<void> | undefined;
  let nextId = 0;
  let ready = false;
  type Pending = {
    id: number;
    deadline: number;
    resolve(value: unknown): void;
    reject(error: Error): void;
    cleanup(): void;
  };
  let pending: Pending | undefined;
  let worker: Worker;
  try {
    worker = new Worker(new URL('./goal-target-runtime-worker.cjs', import.meta.url), {
      workerData: { kind: 'goal-target-runtime-worker-v1', compressedBytes },
      transferList: [compressedBytes.buffer as ArrayBuffer],
      resourceLimits: { maxOldGenerationSizeMb: 256, maxYoungGenerationSizeMb: 32, stackSizeMb: 4 },
    });
  } catch {
    return fail('worker-failed');
  }
  const stop = (reason: string) => {
    if (!closed) {
      closed = reason;
      lifetimeSignal?.removeEventListener('abort', lifetimeAbort);
      const current = pending;
      pending = undefined;
      current?.cleanup();
      current?.reject(new Error(`target-worker:${reason}`));
      terminated = Promise.resolve()
        .then(() => worker.terminate())
        .then(
          () => undefined,
          () => fail('termination-failed')
        );
      // Event handlers can initiate closure without an awaiting caller; disposal still reports failure.
      void terminated.catch(() => undefined);
    }
    return terminated ?? Promise.resolve();
  };
  const lifetimeAbort = () => {
    void stop('aborted');
  };
  const wait = (id: number, duration: number, invocationSignal?: AbortSignal) =>
    new Promise<unknown>((resolve, reject) => {
      const deadline = performance.now() + duration;
      const abort = () => {
        void stop('aborted');
      };
      const timer = setTimeout(() => {
        void stop('timeout');
      }, duration);
      pending = {
        id,
        deadline,
        resolve,
        reject,
        cleanup() {
          clearTimeout(timer);
          invocationSignal?.removeEventListener('abort', abort);
        },
      };
      invocationSignal?.addEventListener('abort', abort, { once: true });
      if (invocationSignal?.aborted || lifetimeSignal?.aborted) void stop('aborted');
    });
  worker.on('error', () => {
    void stop('worker-failed');
  });
  worker.on('exit', () => {
    if (!closed) void stop('worker-exited');
  });
  worker.on('message', (message: unknown) => {
    if (closed) return;
    try {
      const current = pending;
      check(current, 'protocol');
      check(performance.now() < current.deadline, 'timeout');
      check(!lifetimeSignal?.aborted, 'aborted');
      const item = own(message, ['kind', 'profile', 'metadataHex', 'id', 'result']);
      check(item.kind !== 'failure', 'worker-failed');
      if (!ready) {
        check(current.id === 0 && item.kind === 'ready' && Object.keys(item).length === 3, 'protocol');
        const p = own(item.profile, [
          'specVersion',
          'transactionVersion',
          'compressedSha256',
          'codeHash',
          'metadataSha256',
          'wasmBytes',
          'wasmSha256',
        ]);
        check(
          Object.keys(p).length === 7 &&
            p.specVersion === 131 &&
            p.transactionVersion === 131 &&
            p.compressedSha256 === COMPRESSED_SHA256 &&
            p.codeHash === CODE_HASH &&
            p.metadataSha256 === METADATA_SHA256 &&
            p.wasmBytes === 13268578 &&
            typeof p.wasmSha256 === 'string' &&
            /^[0-9a-f]{64}$/.test(p.wasmSha256),
          'profile'
        );
        check(
          typeof item.metadataHex === 'string' &&
            item.metadataHex.length <= 2 + 2 * 2 * 1024 * 1024 &&
            HEX.test(item.metadataHex),
          'metadata'
        );
        check(sha(Buffer.from(item.metadataHex.slice(2), 'hex')) === METADATA_SHA256, 'metadata-pin');
        ready = true;
      } else {
        check(item.kind === 'result' && item.id === current.id && Object.keys(item).length === 3, 'protocol');
      }
      check(performance.now() < current.deadline, 'timeout');
      current.cleanup();
      pending = undefined;
      current.resolve(frozen(item));
    } catch (error) {
      const reason =
        error instanceof Error && /^target-worker:[a-z-]+$/.test(error.message) ? error.message.slice(14) : 'protocol';
      void stop(reason);
    }
  });
  const initialization = wait(0, readinessTimeout);
  lifetimeSignal?.addEventListener('abort', lifetimeAbort, { once: true });
  let initialized: { profile: GoalTargetRuntimeWorker['profile']; metadataHex: string };
  try {
    initialized = (await initialization) as typeof initialized;
  } catch (error) {
    await terminated;
    throw error;
  }
  if (closed) {
    await terminated;
    return fail(closed);
  }
  const api: GoalTargetRuntimeWorker = {
    profile: initialized.profile,
    metadataHex: initialized.metadataHex,
    async invoke(rawValue, rawOptions = {}) {
      check(!closed, closed ?? 'closed');
      check(!pending, 'busy');
      const value = own(rawValue, ['api', 'inputHex', 'state']);
      check(typeof value.api === 'string' && (APIS as readonly string[]).includes(value.api), 'api');
      check(
        typeof value.inputHex === 'string' && value.inputHex.length <= 8194 && HEX.test(value.inputHex),
        'input-hex'
      );
      const options = own(rawOptions, ['signal', 'timeoutMs']);
      const invocationSignal = signal(options.signal);
      const duration = timeout(options.timeoutMs, invocationTimeout);
      if (invocationSignal?.aborted || lifetimeSignal?.aborted) {
        await stop('aborted');
        return fail('aborted');
      }
      const needsState = !['Core_version', 'Metadata_metadata'].includes(value.api);
      check(!needsState || value.state !== undefined, 'state-required');
      if (value.state !== undefined) assertGoalTargetRuntimeState(value.state);
      const state = value.state as GoalTargetRuntimeState | undefined;
      const message = { api: value.api, inputHex: value.inputHex, ...(state ? { state: state.hostState } : {}) };
      const id = ++nextId;
      const response = wait(id, duration, invocationSignal);
      try {
        worker.postMessage({ kind: 'invoke', id, value: message });
      } catch {
        void stop('worker-failed');
      }
      try {
        const received = (await response) as { result: GoalTargetRuntimeWorkerResult };
        const result = received.result;
        check(
          result &&
            result.kind === 'hypothetical-target-runtime-read-only-v1' &&
            result.api === value.api &&
            result.storageWrites === 0 &&
            result.transactionExecution === false &&
            result.historicalFill === false &&
            result.admissionGranted === false &&
            result.stateSha256 === (state?.stateSha256 ?? null),
          'result'
        );
        return result;
      } catch (error) {
        await stop(closed ?? 'result');
        throw error;
      }
    },
    dispose() {
      return stop('disposed');
    },
  };
  owned.set(api, () => {
    check(!closed, closed ?? 'closed');
    check(!lifetimeSignal?.aborted, 'aborted');
  });
  return Object.freeze(api);
}
