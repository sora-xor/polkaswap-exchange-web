/** Recorded, bounded indexer acquisition retries. Opt-in transport only; never study or trading authority. */
import { createHash } from 'node:crypto';

const ENDPOINT = 'https://pi.soramitsu.io/graphql';
const QUERY =
  'query GoalQualificationPoolHistory($filter:AssetSnapshotFilter!,$after:Cursor){assetSnapshots(first:100,after:$after,orderBy:[TIMESTAMP_ASC],filter:$filter){pageInfo{hasNextPage endCursor}edges{node{id assetId type timestamp denominator closeEvidence}}}}';
const ASSETS = new Set([
  '0x0200000000000000000000000000000000000000000000000000000000000000',
  '0x02000c0000000000000000000000000000000000000000000000000000000000',
]);
/** Immutable policy for a newly declared acquisition. Existing no-retry study contracts are unaffected. */
export const GOAL_ACQUISITION_RETRY_POLICY = Object.freeze({
  kind: 'recorded-indexer-history-retry-v1' as const,
  maximumAttempts: 3,
  statuses: Object.freeze([502, 503, 504]),
  backoffMs: Object.freeze([1000, 3000]),
});

export interface GoalAcquisitionRequest {
  url: typeof ENDPOINT;
  method: 'POST';
  headers: Readonly<Record<string, string>>;
  body: string;
  redirect: 'error';
  credentials: 'omit';
}
export interface GoalAcquisitionAttemptContext {
  operationId: string;
  requestIndex: number;
  attemptIndex: number;
  requestSha256: string;
  carriedAttempts: 0 | 1 | 2;
}
export interface GoalAcquisitionCarriedAttempt {
  requestSha256: string;
  attempts: 1 | 2;
}
type Reason =
  | 'invalid-input'
  | 'concurrent-request'
  | 'request-limit'
  | 'aborted'
  | 'deadline'
  | 'clock-regressed'
  | 'budget-failed'
  | 'network-failed'
  | 'body-failed'
  | 'response-limit'
  | 'invalid-response'
  | 'retention-failed';
export interface GoalAcquisitionAttempt extends GoalAcquisitionAttemptContext {
  kind: 'goal-acquisition-attempt-v1';
  policySha256: string;
  operationDeadlineAtMs: number;
  request: Readonly<GoalAcquisitionRequest>;
  requestedAtMs: number;
  completedAtMs: number;
  /** A complete HTTP error is still a response. Partial/error attempts never authorize retry. */
  outcome: 'response' | Reason;
  response: null | {
    status: number;
    url: string;
    redirected: boolean;
    headers: Readonly<Record<string, string>>;
    bodyBase64: string;
    bytesRead: number;
    retainedBytes: number;
    bodySha256: string;
    complete: boolean;
  };
}
export interface GoalAcquisitionTransportOptions {
  /** Unique declared operation identity used by the caller's write-once evidence sink. */
  operationId: string;
  fetch: typeof fetch;
  signal: AbortSignal;
  /** Original absolute deadline, shared by all pages. Must be within the next30s at construction. */
  operationDeadlineAtMs: number;
  /** Each response is bounded independently; aggregate bytes must also be charged below. Maximum16MiB. */
  maximumResponseBytes: number;
  /** Exactly one request's previously retained failures, authenticated by the owning continuation. */
  carriedAttempt?: GoalAcquisitionCarriedAttempt;
  budget: {
    /** Reserve/charge every physical attempt, including first attempts, before invoking the network. */
    beforeAttempt(context: Readonly<GoalAcquisitionAttemptContext>): void | Promise<void>;
    /** Synchronously charge every observed chunk, including errors and an over-limit final chunk. */
    consumeResponseBytes(bytes: number): void;
  };
  /** Resolve only after durable retention. Acknowledgement hashes the exact canonical attempt object. */
  retainAttempt(attempt: Readonly<GoalAcquisitionAttempt>): Promise<{ sha256: string; bytes: number }>;
}
/** Transport failures are distinct from an economic result or a qualification decision. */
export class GoalAcquisitionTransportError extends Error {
  constructor(readonly reason: Reason) {
    super(`Goal acquisition transport: ${reason}`);
    this.name = 'GoalAcquisitionTransportError';
  }
}
const fail = (reason: Reason): never => {
  throw new GoalAcquisitionTransportError(reason);
};
function check(value: unknown, reason: Reason = 'invalid-input'): asserts value {
  if (!value) fail(reason);
}
function own(value: unknown, required: string[], optional: string[] = []): Record<string, unknown> {
  check(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype);
  const fields = Object.getOwnPropertyDescriptors(value),
    keys = Reflect.ownKeys(fields);
  check(required.every((key) => fields[key]) && keys.length <= required.length + optional.length);
  check(
    keys.every(
      (key) =>
        typeof key === 'string' &&
        [...required, ...optional].includes(key) &&
        fields[key].enumerable &&
        'value' in fields[key]
    )
  );
  return Object.fromEntries(keys.map((key) => [key, fields[key as string].value]));
}
function signalValue(value: unknown): AbortSignal {
  check(
    value instanceof AbortSignal &&
      Object.getPrototypeOf(value) === AbortSignal.prototype &&
      !['aborted', 'addEventListener', 'removeEventListener'].some((key) => Object.hasOwn(value, key))
  );
  Object.getOwnPropertyDescriptor(AbortSignal.prototype, 'aborted')!.get!.call(value);
  return value;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
/** Accept only the existing fixed history query; no GraphQL mutations or alternative market requests. */
function requestCopy(url: Parameters<typeof fetch>[0], input: RequestInit | undefined) {
  check(typeof url === 'string' && url === ENDPOINT);
  const init = own(input, ['method', 'headers', 'body', 'redirect', 'credentials'], ['signal']);
  check(init.method === 'POST' && init.redirect === 'error' && init.credentials === 'omit');
  check(typeof init.body === 'string' && Buffer.byteLength(init.body) <= 16384);
  const headers = own(init.headers, ['content-type'], ['cache-control']);
  check(
    headers['content-type'] === 'application/json' &&
      (!Object.hasOwn(headers, 'cache-control') ||
        (typeof headers['cache-control'] === 'string' && ['no-cache', 'no-store'].includes(headers['cache-control'])))
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(init.body);
  } catch {
    return fail('invalid-input');
  }
  const body = own(parsed, ['query', 'variables']);
  check(body.query === QUERY);
  const variables = own(body.variables, ['filter', 'after']);
  check(
    variables.after === null ||
      (typeof variables.after === 'string' && variables.after.length > 0 && variables.after.length <= 2048)
  );
  const filter = own(variables.filter, ['assetId', 'type', 'timestamp']);
  const assetId = own(filter.assetId, ['equalTo']).equalTo;
  check(typeof assetId === 'string' && ASSETS.has(assetId) && own(filter.type, ['equalTo']).equalTo === 'HOUR');
  const range = own(filter.timestamp, ['greaterThanOrEqualTo', 'lessThan']);
  const from = range.greaterThanOrEqualTo as number,
    to = range.lessThan as number;
  check(
    Number.isSafeInteger(from) &&
      Number.isSafeInteger(to) &&
      from >= 0 &&
      to > from &&
      from % 3600 === 0 &&
      to % 3600 === 0 &&
      to - from <= 201 * 3600
  );
  return {
    request: freeze({
      url: ENDPOINT,
      method: 'POST',
      headers,
      body: init.body,
      redirect: 'error',
      credentials: 'omit',
    }) as Readonly<GoalAcquisitionRequest>,
    callerSignal: init.signal === undefined ? undefined : signalValue(init.signal),
  };
}

/** Hash the same validated request snapshot used by the transport; this pure binding grants no replay authority. */
export function goalAcquisitionRequestSha256(url: Parameters<typeof fetch>[0], input: RequestInit): string {
  return hash(canonical(requestCopy(url, input).request));
}

/**
 * Construct one bounded reader-operation transport. Only this adapter counts physical retries;
 * callers must wire shared old+new attempt/byte budgets and declare it in a new acquisition protocol.
 * Returning a response proves durable retention, not valid history, profitability, or qualification.
 */
export function createGoalAcquisitionTransport(input: GoalAcquisitionTransportOptions) {
  const options = own(
    input,
    ['operationId', 'fetch', 'signal', 'operationDeadlineAtMs', 'maximumResponseBytes', 'budget', 'retainAttempt'],
    ['carriedAttempt']
  );
  const budget = own(options.budget, ['beforeAttempt', 'consumeResponseBytes']);
  check(typeof options.operationId === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(options.operationId));
  check(
    typeof options.fetch === 'function' &&
      typeof options.retainAttempt === 'function' &&
      typeof budget.beforeAttempt === 'function' &&
      typeof budget.consumeResponseBytes === 'function'
  );
  const signal = signalValue(options.signal),
    startedAt = Date.now();
  const deadline = options.operationDeadlineAtMs as number,
    maximumResponseBytes = options.maximumResponseBytes as number;
  check(Number.isSafeInteger(deadline) && deadline > startedAt && deadline - startedAt <= 30000);
  check(
    Number.isSafeInteger(maximumResponseBytes) && maximumResponseBytes >= 1 && maximumResponseBytes <= 16 * 1024 * 1024
  );
  let carriedAttempt: Readonly<GoalAcquisitionCarriedAttempt> | undefined;
  if (Object.hasOwn(options, 'carriedAttempt')) {
    const carried = own(options.carriedAttempt, ['requestSha256', 'attempts']);
    check(
      typeof carried.requestSha256 === 'string' &&
        /^[0-9a-f]{64}$/.test(carried.requestSha256) &&
        (carried.attempts === 1 || carried.attempts === 2)
    );
    carriedAttempt = Object.freeze({ requestSha256: carried.requestSha256, attempts: carried.attempts });
  }
  const upstream = options.fetch as typeof fetch;
  const retain = options.retainAttempt as GoalAcquisitionTransportOptions['retainAttempt'];
  const beforeAttempt = budget.beforeAttempt as GoalAcquisitionTransportOptions['budget']['beforeAttempt'];
  const consumeBytes = budget.consumeResponseBytes as GoalAcquisitionTransportOptions['budget']['consumeResponseBytes'];
  const lifetime = new AbortController(),
    policySha256 = hash(canonical(GOAL_ACQUISITION_RETRY_POLICY));
  let active = false,
    requests = 0,
    previousTime = startedAt;
  const seen = new Set<string>();
  const fetcher: typeof fetch = async (url, init) => {
    check(!active, 'concurrent-request');
    const { request, callerSignal } = requestCopy(url, init);
    check(++requests <= 8, 'request-limit');
    const requestIndex = requests,
      requestSha256 = hash(canonical(request));
    const carriedAttempts = carriedAttempt?.requestSha256 === requestSha256 ? carriedAttempt.attempts : 0;
    check(!seen.has(requestSha256), 'request-limit');
    seen.add(requestSha256);
    const operation = new AbortController();
    let stopReason: Reason | undefined;
    const abort = () => {
      stopReason ??= 'aborted';
      operation.abort();
    };
    const timeout = () => {
      stopReason ??= 'deadline';
      operation.abort();
    };
    const sources = [signal, lifetime.signal, ...(callerSignal ? [callerSignal] : [])];
    sources.forEach((source) => source.addEventListener('abort', abort, { once: true }));
    if (sources.some((source) => source.aborted)) abort();
    const timer = setTimeout(timeout, Math.max(0, deadline - Date.now()));
    const fresh = () => {
      if (operation.signal.aborted) fail(stopReason ?? 'aborted');
      const now = Date.now();
      check(Number.isSafeInteger(now) && now >= previousTime, 'clock-regressed');
      previousTime = now;
      if (now >= deadline) {
        timeout();
        fail('deadline');
      }
      return now;
    };
    const race = <T>(promise: Promise<T>, late?: (value: T) => void): Promise<T> =>
      new Promise((resolve, reject) => {
        const onAbort = () => {
          operation.signal.removeEventListener('abort', onAbort);
          reject(new GoalAcquisitionTransportError(stopReason ?? 'aborted'));
        };
        operation.signal.addEventListener('abort', onAbort, { once: true });
        promise.then(
          (value) => {
            operation.signal.removeEventListener('abort', onAbort);
            if (operation.signal.aborted) {
              try {
                late?.(value);
              } catch {
                /* Cleanup cannot revive cancelled work. */
              }
              onAbort();
            } else resolve(value);
          },
          (error: unknown) => {
            operation.signal.removeEventListener('abort', onAbort);
            reject(error);
          }
        );
        if (operation.signal.aborted) onAbort();
      });
    const persist = async (record: GoalAcquisitionAttempt) => {
      const frozen = freeze(record),
        encoded = canonical(frozen);
      try {
        // Invoke even after cancellation so the sink can retain the terminal partial receipt.
        // A late sink completion is audit-only; race() cannot authorize another physical attempt.
        const result = await race(Promise.resolve(retain(frozen)));
        const ack = own(result, ['sha256', 'bytes'], ['name']);
        check(
          ack.name === undefined ||
            (typeof ack.name === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(ack.name)),
          'retention-failed'
        );
        check(ack.sha256 === hash(encoded) && ack.bytes === Buffer.byteLength(encoded), 'retention-failed');
      } catch (error) {
        if (operation.signal.aborted) fail(stopReason ?? 'aborted');
        if (error instanceof GoalAcquisitionTransportError && error.reason === 'deadline') throw error;
        fail('retention-failed');
      }
      fresh();
    };
    active = true;
    try {
      for (let attemptIndex = carriedAttempts + 1; attemptIndex <= 3; attemptIndex++) {
        fresh();
        if (attemptIndex > 1) {
          const delay = GOAL_ACQUISITION_RETRY_POLICY.backoffMs[attemptIndex - 2];
          check(fresh() + delay < deadline, 'deadline');
          let delayTimer: ReturnType<typeof setTimeout> | undefined;
          try {
            await race(
              new Promise<void>((resolve) => {
                delayTimer = setTimeout(resolve, delay);
              })
            );
          } finally {
            clearTimeout(delayTimer);
          }
          fresh();
        }
        const context = freeze<GoalAcquisitionAttemptContext>({
          operationId: options.operationId as string,
          requestIndex,
          attemptIndex,
          requestSha256,
          carriedAttempts,
        });
        try {
          await race(Promise.resolve(beforeAttempt(context)));
        } catch (error) {
          if (operation.signal.aborted) fail(stopReason ?? 'aborted');
          throw new GoalAcquisitionTransportError('budget-failed');
        }
        const requestedAtMs = fresh();
        const record: GoalAcquisitionAttempt = {
          ...context,
          kind: 'goal-acquisition-attempt-v1',
          policySha256,
          operationDeadlineAtMs: deadline,
          request,
          requestedAtMs,
          completedAtMs: requestedAtMs,
          outcome: 'response',
          response: null,
        };
        let result: Response | undefined,
          stage: 'network-failed' | 'body-failed' = 'network-failed';
        const chunks: Uint8Array[] = [];
        let bytesRead = 0,
          retainedBytes = 0,
          complete = false;
        try {
          result = await race(
            Promise.resolve(
              upstream(request.url, {
                method: request.method,
                body: request.body,
                headers: { ...request.headers },
                redirect: request.redirect,
                credentials: request.credentials,
                signal: operation.signal,
              })
            ),
            (late) => {
              void late.body?.cancel().catch(() => undefined);
            }
          );
          stage = 'body-failed';
          record.response = {
            status: result.status,
            url: result.url,
            redirected: result.redirected,
            headers: Object.fromEntries(result.headers),
            bodyBase64: '',
            bytesRead: 0,
            retainedBytes: 0,
            bodySha256: hash(''),
            complete: false,
          };
          check(
            Number.isInteger(result.status) &&
              result.status >= 200 &&
              result.status <= 599 &&
              !result.redirected &&
              (!result.url || result.url === ENDPOINT),
            'invalid-response'
          );
          check(result.body, 'invalid-response');
          const reader = result.body.getReader();
          let reads = 0;
          try {
            for (;;) {
              fresh();
              check(++reads <= maximumResponseBytes + 1, 'response-limit');
              const item = await race(reader.read());
              if (item.done) {
                complete = true;
                break;
              }
              bytesRead += item.value.byteLength;
              const keep = Math.max(0, Math.min(item.value.byteLength, maximumResponseBytes - retainedBytes));
              if (keep) {
                chunks.push(Uint8Array.from(item.value.subarray(0, keep)));
                retainedBytes += keep;
              }
              try {
                const value: unknown = consumeBytes(item.value.byteLength);
                if (value instanceof Promise) void value.catch(() => undefined);
                check(value === undefined, 'budget-failed');
              } catch {
                fail('budget-failed');
              }
              check(bytesRead <= maximumResponseBytes, 'response-limit');
            }
          } finally {
            if (!complete) void reader.cancel().catch(() => undefined);
            try {
              reader.releaseLock();
            } catch {
              /* A cancelled read may still be unwinding. */
            }
          }
          fresh();
        } catch (error) {
          record.outcome = error instanceof GoalAcquisitionTransportError ? error.reason : stage;
          if (result && !complete && !result.body?.locked) void result.body?.cancel().catch(() => undefined);
        }
        const raw = Buffer.concat(chunks);
        record.completedAtMs = Date.now();
        if (record.response)
          Object.assign(record.response, {
            bodyBase64: raw.toString('base64'),
            bytesRead,
            retainedBytes,
            bodySha256: hash(raw),
            complete,
          });
        await persist(record);
        if (record.outcome !== 'response') fail(record.outcome);
        check(result && complete, 'invalid-response');
        const metadata = record.response!;
        if (!GOAL_ACQUISITION_RETRY_POLICY.statuses.includes(metadata.status) || attemptIndex === 3) {
          const response = new Response(raw, { status: metadata.status, headers: metadata.headers });
          return new Proxy(response, {
            get(target, key) {
              if (key === 'url') return metadata.url;
              if (key === 'redirected') return metadata.redirected;
              const value = Reflect.get(target, key, target);
              return typeof value === 'function' ? value.bind(target) : value;
            },
          });
        }
      }
      return fail('request-limit');
    } finally {
      active = false;
      clearTimeout(timer);
      sources.forEach((source) => source.removeEventListener('abort', abort));
    }
  };
  return Object.freeze({ fetch: fetcher, dispose: () => lifetime.abort() });
}
