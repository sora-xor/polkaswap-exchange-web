/** Opt-in, two-lane acquisition composition. Budgets include retained failure, replay, retries and fresh responses. */
import { createHash } from 'node:crypto';
import {
  assertGoalAcquisitionReplayPreparation,
  assertGoalAcquisitionReplayCompletion,
  createGoalAcquisitionReplay,
  type GoalAcquisitionReplayCompletion,
  type GoalAcquisitionReplayPreparation,
} from './goal-acquisition-replay';
import {
  createGoalAcquisitionTransport,
  goalAcquisitionRequestSha256,
  type GoalAcquisitionCarriedAttempt,
} from './goal-acquisition-transport';

const HISTORY = 'https://pi.soramitsu.io/graphql',
  RPC = 'https://mof2.sora.org/';
const MAX_BYTES = 256 * 1024 * 1024;
const RPC_METHODS = new Set([
  'chain_getBlockHash',
  'chain_getFinalizedHead',
  'chain_getHeader',
  'state_getRuntimeVersion',
  'state_getStorageHash',
  'state_getMetadata',
  'state_getStorage',
  'state_queryStorageAt',
  'state_call',
]);
export interface GoalAcquisitionEpisodeFetchOptions {
  preparation?: GoalAcquisitionReplayPreparation;
  /** Single physical-start adapter; global start/spacing controls belong to the caller. */
  fetch: typeof fetch;
  /** Normal metadata replay, with its pool delegation already wired through that same physical adapter. */
  marketFetch: typeof fetch;
  sink: { retainEvidence(name: string, value: unknown): Promise<{ sha256: string; bytes: number; name?: string }> };
  signal: AbortSignal;
  maximumHttpRequests: number;
  maximumResponseBytes: number;
  timeoutMs: number;
}
interface HistoryOperation {
  id: number;
  pages: number;
  responseBytes: number;
  startedAtMs: number;
  deadlineAtMs: number;
  lastAtMs: number;
  signal: AbortSignal;
  transport?: ReturnType<typeof createGoalAcquisitionTransport>;
}
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
function check(ok: unknown, reason: string): asserts ok {
  if (!ok) throw Error(`goal-acquisition-episode:${reason}`);
}
function own(v: unknown): Record<string, unknown> {
  check(v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype, 'own-data');
  const ds = Object.getOwnPropertyDescriptors(v);
  check(
    Reflect.ownKeys(ds).every((k) => typeof k === 'string' && ds[k].enumerable && 'value' in ds[k]),
    'own-data'
  );
  return Object.fromEntries(Object.entries(ds).map(([k, d]) => [k, d.value]));
}
/** Charges only actual observed bytes; an over-limit chunk remains counted even though it cannot be released. */
export function createGoalAcquisitionEpisodeFetch(raw: GoalAcquisitionEpisodeFetchOptions) {
  const input = own(raw);
  check(
    Object.keys(input).every((k) =>
      [
        'preparation',
        'fetch',
        'marketFetch',
        'sink',
        'signal',
        'maximumHttpRequests',
        'maximumResponseBytes',
        'timeoutMs',
      ].includes(k)
    ),
    'options'
  );
  check(
    typeof input.fetch === 'function' && typeof input.marketFetch === 'function' && input.signal instanceof AbortSignal,
    'options'
  );
  const sink = own(input.sink);
  check(typeof sink.retainEvidence === 'function', 'sink');
  const preparation = input.preparation as GoalAcquisitionReplayPreparation | undefined;
  if (preparation) assertGoalAcquisitionReplayPreparation(preparation);
  const maximumHttpRequests = input.maximumHttpRequests as number,
    maximumResponseBytes = input.maximumResponseBytes as number,
    timeoutMs = input.timeoutMs as number;
  check(
    Number.isSafeInteger(maximumHttpRequests) &&
      maximumHttpRequests > 0 &&
      maximumHttpRequests <= 10000 &&
      Number.isSafeInteger(maximumResponseBytes) &&
      maximumResponseBytes > 0 &&
      maximumResponseBytes <= MAX_BYTES &&
      Number.isSafeInteger(timeoutMs) &&
      timeoutMs >= 1000 &&
      timeoutMs <= 30000,
    'limits'
  );
  const upstream = input.fetch as typeof fetch,
    marketUpstream = input.marketFetch as typeof fetch;
  const retain = sink.retainEvidence as GoalAcquisitionEpisodeFetchOptions['sink']['retainEvidence'];
  const lifetime = new AbortController(),
    signal = AbortSignal.any([input.signal, lifetime.signal] as AbortSignal[]);
  let stopped = false,
    active = false,
    bodyOpen = false,
    requests = preparation ? 1 : 0,
    responseBytes = preparation?.inspection.failedResponseBytes ?? 0,
    replayRequests = 0,
    historyPhysicalStarts = 0,
    ordinaryRpcStarts = 0,
    operationId = 0;
  check(requests <= maximumHttpRequests && responseBytes <= maximumResponseBytes, 'initial-budget');
  const operations = new WeakMap<AbortSignal, HistoryOperation>(),
    transports = new Set<ReturnType<typeof createGoalAcquisitionTransport>>();
  let captured: GoalAcquisitionReplayCompletion | undefined;
  let currentHistory: { operation: HistoryOperation; charged: boolean } | undefined;
  const fail = () => {
    stopped = true;
    lifetime.abort();
    transports.forEach((t) => t.dispose());
  };
  const fresh = () => check(!stopped && !signal.aborted, 'aborted');
  const chargeRequest = () => {
    fresh();
    check(requests < maximumHttpRequests, 'request-budget');
    requests++;
  };
  const chargeBytes = (bytes: number) => {
    check(Number.isSafeInteger(bytes) && bytes >= 0, 'byte-count');
    responseBytes += bytes;
    check(Number.isSafeInteger(responseBytes) && responseBytes <= maximumResponseBytes, 'response-budget');
  };
  const chargeOperationBytes = (op: HistoryOperation, bytes: number) => {
    op.responseBytes += bytes;
    check(Number.isSafeInteger(op.responseBytes) && op.responseBytes <= 8 * 1024 * 1024, 'operation-response-budget');
  };
  const persist = async (name: string, value: unknown) => {
    const encoded = canonical(value),
      expected = createHash('sha256').update(encoded).digest('hex');
    const ack = await retain(name, value);
    check(ack && ack.sha256 === expected && ack.bytes === Buffer.byteLength(encoded), 'retention');
    return ack;
  };
  const historyOperation = (init: RequestInit): HistoryOperation => {
    check(init.signal instanceof AbortSignal, 'history-operation-signal');
    let op = operations.get(init.signal);
    const now = Date.now();
    check(Number.isSafeInteger(now) && now >= 0, 'clock');
    if (!op) {
      const deadlineAtMs = now + timeoutMs;
      op = {
        id: ++operationId,
        pages: 0,
        responseBytes: 0,
        startedAtMs: now,
        deadlineAtMs,
        lastAtMs: now,
        signal: AbortSignal.any([signal, init.signal, AbortSignal.timeout(timeoutMs)]),
      };
      operations.set(init.signal, op);
    }
    check(!op.signal.aborted && now >= op.lastAtMs && now < op.deadlineAtMs, 'operation-deadline');
    op.lastAtMs = now;
    check(op.pages < 8, 'operation-pages');
    op.pages++;
    return op;
  };
  const acquiredHistory = (
    op: HistoryOperation,
    url: string,
    init: RequestInit,
    carriedAttempt?: GoalAcquisitionCarriedAttempt
  ) => {
    if (!op.transport) {
      op.transport = createGoalAcquisitionTransport({
        operationId: `episode-history-${op.id}`,
        fetch: (url, init) => {
          historyPhysicalStarts++;
          return upstream(url, init);
        },
        signal: op.signal,
        operationDeadlineAtMs: op.deadlineAtMs,
        maximumResponseBytes: Math.min(2 * 1024 * 1024, maximumResponseBytes),
        ...(carriedAttempt ? { carriedAttempt } : {}),
        budget: {
          beforeAttempt: (context) => {
            fresh();
            if (context.attemptIndex > context.carriedAttempts + 1) chargeRequest();
          },
          consumeResponseBytes: (bytes) => {
            chargeBytes(bytes);
            chargeOperationBytes(op, bytes);
          },
        },
        retainAttempt: (attempt) =>
          persist(`acquisition-${op.id}-${attempt.requestIndex}-${attempt.attemptIndex}`, attempt),
      });
      transports.add(op.transport);
    } else check(!carriedAttempt, 'carried-attempt-reused');
    return op.transport.fetch(url, { ...init, signal: op.signal });
  };
  const replay = preparation
    ? createGoalAcquisitionReplay(preparation, {
        signal,
        retainEvidence: async (receipt) => {
          await persist(`acquisition-prefix-${receipt.lane}-${receipt.sequence}`, receipt);
        },
        acquireFailedRequest: (url, init) => {
          check(currentHistory && !currentHistory.charged, 'history-boundary');
          currentHistory.charged = true;
          chargeOperationBytes(currentHistory.operation, preparation!.inspection.failedResponseBytes);
          return acquiredHistory(currentHistory.operation, url, init, {
            requestSha256: goalAcquisitionRequestSha256(url, init),
            attempts: 1,
          });
        },
      })
    : undefined;
  const capture = () => {
    if (!replay || captured) return;
    try {
      const proof = replay.completion();
      assertGoalAcquisitionReplayCompletion(proof, preparation!.bindings);
      captured = proof;
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'goal-acquisition-replay:incomplete') throw error;
    }
  };
  const wait = <T>(promise: Promise<T>, operation: AbortSignal, late?: (v: T) => void) =>
    new Promise<T>((resolve, reject) => {
      const abort = () => {
        operation.removeEventListener('abort', abort);
        reject(Error('goal-acquisition-episode:aborted'));
      };
      operation.addEventListener('abort', abort, { once: true });
      promise.then(
        (v) => {
          operation.removeEventListener('abort', abort);
          if (operation.aborted) {
            try {
              late?.(v);
            } catch {
              /* Cleanup is audit-only. */
            }
            abort();
          } else resolve(v);
        },
        (e) => {
          operation.removeEventListener('abort', abort);
          reject(e);
        }
      );
      if (operation.aborted) abort();
    });
  /** Preserve origin/redirect metadata while accounting the exact bytes delivered to existing readers. */
  const response = (original: Response, operation: AbortSignal, charge: boolean, history?: HistoryOperation) => {
    check(original.body, 'response-body');
    const reader = original.body.getReader();
    bodyOpen = true;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const part = await wait(reader.read(), operation);
          fresh();
          if (part.done) {
            bodyOpen = false;
            reader.releaseLock();
            capture();
            controller.close();
          } else {
            if (charge) {
              chargeBytes(part.value.byteLength);
              if (history) chargeOperationBytes(history, part.value.byteLength);
            }
            controller.enqueue(part.value);
          }
        } catch (error) {
          bodyOpen = false;
          fail();
          void reader.cancel().catch(() => undefined);
          controller.error(error);
        }
      },
      cancel() {
        bodyOpen = false;
        fail();
        return reader.cancel();
      },
    });
    const wrapped = new Response(stream, {
      status: original.status,
      statusText: original.statusText,
      headers: original.headers,
    });
    return new Proxy(wrapped, {
      get(target, key) {
        if (key === 'url') return original.url;
        if (key === 'redirected') return original.redirected;
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  };
  const laneFetch =
    (market: boolean): typeof fetch =>
    async (url, init) => {
      try {
        fresh();
        check(!active && !bodyOpen, 'concurrent-request');
        active = true;
        check(
          typeof url === 'string' &&
            init &&
            init.method === 'POST' &&
            typeof init.body === 'string' &&
            init.credentials === 'omit' &&
            init.redirect === 'error' &&
            (!init.signal || !init.signal.aborted),
          'request'
        );
        check(url === RPC || (!market && url === HISTORY), 'endpoint');
        if (url === RPC) {
          let rpc: Record<string, unknown>;
          try {
            rpc = JSON.parse(init.body);
          } catch {
            throw Error('goal-acquisition-episode:rpc-request');
          }
          check(rpc.jsonrpc === '2.0' && typeof rpc.method === 'string' && RPC_METHODS.has(rpc.method), 'rpc-method');
        }
        capture();
        chargeRequest();
        const op = url === HISTORY ? historyOperation(init) : undefined;
        const operation =
          op?.signal ??
          AbortSignal.any([signal, AbortSignal.timeout(timeoutMs), ...(init.signal ? [init.signal] : [])]);
        const pendingPrefix = !!replay && !captured;
        let result: Response,
          charge = true;
        if (pendingPrefix) {
          currentHistory = op ? { operation: op, charged: false } : undefined;
          result = await wait((market ? replay!.marketFetch : replay!.fetch)(url, init), operation, (r) => {
            void r.body?.cancel().catch(() => undefined);
          });
          charge = !currentHistory?.charged;
          if (charge) replayRequests++;
        } else if (op) {
          result = await wait(acquiredHistory(op, url, init), operation, (r) => {
            void r.body?.cancel().catch(() => undefined);
          });
          charge = false;
        } else {
          if (!market) ordinaryRpcStarts++;
          result = await wait(
            (market ? marketUpstream : upstream)(url, { ...init, signal: operation }),
            operation,
            (r) => {
              void r.body?.cancel().catch(() => undefined);
            }
          );
        }
        fresh();
        return response(result, operation, charge, op);
      } catch (error) {
        fail();
        throw error;
      } finally {
        active = false;
        currentHistory = undefined;
      }
    };
  return Object.freeze({
    fetch: laneFetch(false),
    marketFetch: laneFetch(true),
    completion(): GoalAcquisitionReplayCompletion {
      if (!captured) capture();
      check(captured, 'no-completed-prefix');
      assertGoalAcquisitionReplayCompletion(captured, preparation!.bindings);
      return captured;
    },
    counts: () =>
      Object.freeze({
        requests,
        responseBytes,
        replayRequests,
        historyPhysicalStarts,
        ordinaryRpcStarts,
        historyOperations: operationId,
      }),
    dispose() {
      lifetime.abort();
      transports.forEach((t) => t.dispose());
      replay?.dispose();
    },
  });
}
