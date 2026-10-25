/** Bounded read-only indexed KUSD/XOR history. Indexed seconds are never modeled browser arrivals. */
import { createHash } from 'node:crypto';
import {
  parseIndexedPoolHistoryWithEvidence,
  type IndexedPoolHistoryWithEvidence,
  type IndexedPoolHistoryRow,
} from '../../src/features/bot-trading/pool-history';
import type { BotDefinition } from '../../src/features/bot-trading/types';
const ENDPOINT = 'https://pi.soramitsu.io/graphql';
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const XOR = {
  address: '0x0200000000000000000000000000000000000000000000000000000000000000',
  symbol: 'XOR',
  decimals: 18,
};
const KUSD = {
  address: '0x02000c0000000000000000000000000000000000000000000000000000000000',
  symbol: 'KUSD',
  decimals: 18,
};
const HOUR = 3600000,
  MAX_RESPONSE = 2097152,
  MAX_TOTAL = 8388608,
  MAX_REQUESTS = 8;
const QUERY =
  'query GoalQualificationPoolHistory($filter:AssetSnapshotFilter!,$after:Cursor){assetSnapshots(first:100,after:$after,orderBy:[TIMESTAMP_ASC],filter:$filter){pageInfo{hasNextPage endCursor}edges{node{id assetId type timestamp denominator closeEvidence}}}}';
export interface GoalQualificationHistoryInput {
  startAtMs: number;
  endAtMs: number;
  genesisHash: string;
  denominator: string;
}
export interface GoalQualificationHistoryOptions {
  fetch?: typeof fetch;
  signal?: AbortSignal;
  /** Whole operation, including all pages and decoding: default20s, maximum30s. */ timeoutMs?: number;
}
export interface GoalQualificationHistoryRpcEvidence {
  index: number;
  assetId: string;
  page: number;
  requestBody: string;
  requestedAtMs: number;
  completedAtMs?: number;
  httpStatus?: number;
  responseBody?: string;
  responseBodyBase64?: string;
  responseSha256?: string;
  bytes?: number;
  complete: boolean;
}
type Reason =
  | 'invalid-input'
  | 'aborted'
  | 'timeout'
  | 'network-failed'
  | 'http-error'
  | 'response-limit'
  | 'request-limit'
  | 'graphql-error'
  | 'page-invalid'
  | 'history-incomplete';
/** Diagnostic retains bounded raw receipts, never arbitrary error messages or fabricated fallback prices. */
export class GoalQualificationHistoryReadError extends Error {
  constructor(
    readonly diagnostic: Readonly<{
      stage: 'input' | 'request' | 'response' | 'history';
      reason: Reason;
      rpcEvidence: readonly Readonly<GoalQualificationHistoryRpcEvidence>[];
      financialActions: false;
    }>
  ) {
    super(`Indexed qualification history unavailable: ${diagnostic.stage}/${diagnostic.reason}`);
    this.name = 'GoalQualificationHistoryReadError';
  }
}
function check(ok: unknown, reason: Reason): asserts ok {
  if (!ok) throw reason;
}
function copy<T>(value: T): T {
  let nodes = 0,
    chars = 0;
  const visit = (v: unknown, depth: number): unknown => {
    check(++nodes <= 50000 && depth <= 16, 'page-invalid');
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') {
      check(Number.isSafeInteger(v), 'page-invalid');
      return v;
    }
    if (typeof v === 'string') {
      chars += v.length;
      check(v.length <= 2 * MAX_RESPONSE && chars <= 2 * MAX_TOTAL, 'page-invalid');
      return v;
    }
    check(v && typeof v === 'object', 'page-invalid');
    const ds = Object.getOwnPropertyDescriptors(v),
      keys = Reflect.ownKeys(ds);
    if (Array.isArray(v)) {
      check(
        Object.getPrototypeOf(v) === Array.prototype && v.length <= 400 && keys.length === v.length + 1,
        'page-invalid'
      );
      return Object.freeze(
        Array.from({ length: v.length }, (_, i) => {
          check(ds[i]?.enumerable && 'value' in ds[i], 'page-invalid');
          return visit(ds[i].value, depth + 1);
        })
      );
    }
    check([Object.prototype, null].includes(Object.getPrototypeOf(v)) && keys.length <= 128, 'page-invalid');
    return Object.freeze(
      Object.fromEntries(
        keys.map((k) => {
          check(typeof k === 'string' && ds[k].enumerable && 'value' in ds[k], 'page-invalid');
          return [k, visit(ds[k].value, depth + 1)];
        })
      )
    );
  };
  return visit(value, 0) as T;
}
function inputCopy(value: GoalQualificationHistoryInput) {
  const v = copy(value);
  check(
    v &&
      typeof v === 'object' &&
      Object.keys(v).length === 4 &&
      ['startAtMs', 'endAtMs', 'genesisHash', 'denominator'].every((k) => Object.hasOwn(v, k)),
    'invalid-input'
  );
  check(
    Number.isSafeInteger(v.startAtMs) &&
      Number.isSafeInteger(v.endAtMs) &&
      v.startAtMs >= 0 &&
      v.startAtMs % HOUR === 0 &&
      v.endAtMs % HOUR === 0 &&
      v.endAtMs > v.startAtMs &&
      v.endAtMs - v.startAtMs <= 201 * HOUR,
    'invalid-input'
  );
  check(
    v.genesisHash === GENESIS &&
      typeof v.denominator === 'string' &&
      /^[1-9]\d{0,38}$/.test(v.denominator) &&
      BigInt(v.denominator) < 1n << 128n,
    'invalid-input'
  );
  return v;
}
function optionsCopy(raw: GoalQualificationHistoryOptions): GoalQualificationHistoryOptions {
  check(raw && typeof raw === 'object' && Object.getPrototypeOf(raw) === Object.prototype, 'invalid-input');
  const d = Object.getOwnPropertyDescriptors(raw),
    keys = Reflect.ownKeys(d);
  check(
    keys.every(
      (k) => typeof k === 'string' && ['fetch', 'signal', 'timeoutMs'].includes(k) && d[k].enumerable && 'value' in d[k]
    ),
    'invalid-input'
  );
  const fetcher = d.fetch?.value,
    signal = d.signal?.value,
    timeoutMs = d.timeoutMs?.value;
  check(fetcher === undefined || typeof fetcher === 'function', 'invalid-input');
  if (signal !== undefined) {
    check(
      signal instanceof AbortSignal &&
        Object.getPrototypeOf(signal) === AbortSignal.prototype &&
        !['aborted', 'addEventListener', 'removeEventListener'].some((k) => Object.hasOwn(signal, k)),
      'invalid-input'
    );
    Object.getOwnPropertyDescriptor(AbortSignal.prototype, 'aborted')!.get!.call(signal);
  }
  check(
    timeoutMs === undefined || (Number.isSafeInteger(timeoutMs) && timeoutMs >= 1 && timeoutMs <= 30000),
    'invalid-input'
  );
  return Object.freeze({
    ...(fetcher !== undefined ? { fetch: fetcher } : {}),
    ...(signal !== undefined ? { signal } : {}),
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
  });
}
function abortable<T>(pending: Promise<T>, signal: AbortSignal, disposeLate?: (value: T) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener('abort', abort);
      reject('aborted');
    };
    signal.addEventListener('abort', abort, { once: true });
    pending.then(
      (value) => {
        signal.removeEventListener('abort', abort);
        if (signal.aborted) {
          try {
            disposeLate?.(value);
          } catch {
            /* late cleanup is best effort */
          }
          reject('aborted');
        } else resolve(value);
      },
      () => {
        signal.removeEventListener('abort', abort);
        reject('network-failed');
      }
    );
    if (signal.aborted) abort();
  });
}
/** The parser reads only these asset/policy fields; this idle paper carrier cannot fund or execute anything. */
function parserBot(): BotDefinition {
  return {
    version: 1,
    id: 'history-reader-only',
    name: '',
    mode: 'paper',
    status: 'idle',
    account: '',
    network: GENESIS,
    assetIn: KUSD,
    assetOut: XOR,
    strategy: {
      kind: 'dca',
      amount: '0',
      intervalMs: HOUR,
      threshold: '0',
      direction: 'below',
      fastWindow: 2,
      slowWindow: 3,
      prompt: '',
    },
    policy: {
      feeAsset: XOR,
      maxTradeCodec: {},
      slippagePercent: '0.5',
      maxPriceImpactPercent: '1',
      feeBudgetCodec: '0',
      sessionDurationMs: 0,
    },
    portfolio: { initial: {}, holdings: {}, feesPaidCodec: '0', trades: 0 },
    state: { lastEvaluatedAt: 0, lastTradeAt: 0 },
    provider: 'custom',
    model: '',
    endpoint: '',
    createdAt: 0,
    sessionExpiresAt: 0,
    activity: [],
    equity: [],
    apiUsage: { inputTokens: 0, outputTokens: 0, requests: 0 },
  };
}
/**
 * Fetch exact opening buckets[start,end), whose accepted closes are start+1hour through end.
 * Requires all hours and both assets. No USD field, fallback, retry, quote, strategy or qualification.
 */
export async function readGoalQualificationHistory(
  input: GoalQualificationHistoryInput,
  options: GoalQualificationHistoryOptions = {}
): Promise<
  Readonly<{
    history: IndexedPoolHistoryWithEvidence;
    rpcEvidence: readonly Readonly<GoalQualificationHistoryRpcEvidence>[];
  }>
> {
  const evidence: GoalQualificationHistoryRpcEvidence[] = [];
  let stage: 'input' | 'request' | 'response' | 'history' = 'input',
    timer: ReturnType<typeof setTimeout> | undefined,
    totalBytes = 0;
  const timeout = new AbortController();
  let ownedOptions: GoalQualificationHistoryOptions = {};
  try {
    ownedOptions = optionsCopy(options);
    const bound = inputCopy(input),
      timeoutMs = ownedOptions.timeoutMs ?? 20000;
    check(Number.isSafeInteger(timeoutMs) && timeoutMs >= 1 && timeoutMs <= 30000, 'invalid-input');
    const started = Date.now(),
      deadline = started + timeoutMs,
      signal = ownedOptions.signal ? AbortSignal.any([ownedOptions.signal, timeout.signal]) : timeout.signal;
    timer = setTimeout(() => timeout.abort(), timeoutMs);
    const fresh = () => {
      check(!ownedOptions.signal?.aborted, 'aborted');
      check(!timeout.signal.aborted && Date.now() < deadline, 'timeout');
      check(Date.now() >= started, 'invalid-input');
    };
    fresh();
    const fetcher = ownedOptions.fetch ?? globalThis.fetch,
      rows = new Map<string, IndexedPoolHistoryRow[]>(),
      hours = (bound.endAtMs - bound.startAtMs) / HOUR;
    for (const asset of [KUSD, XOR]) {
      const selected: IndexedPoolHistoryRow[] = [],
        seenIds = new Set<string>(),
        cursors = new Set<string>();
      let after: string | null = null,
        previous = -1,
        finished = false;
      for (let page = 0; !finished; page++) {
        fresh();
        stage = 'request';
        check(evidence.length < MAX_REQUESTS, 'request-limit');
        const requestBody = JSON.stringify({
          query: QUERY,
          variables: {
            filter: {
              assetId: { equalTo: asset.address },
              type: { equalTo: 'HOUR' },
              timestamp: { greaterThanOrEqualTo: bound.startAtMs / 1000, lessThan: bound.endAtMs / 1000 },
            },
            after,
          },
        });
        const receipt: GoalQualificationHistoryRpcEvidence = {
          index: evidence.length,
          assetId: asset.address,
          page,
          requestBody,
          requestedAtMs: Date.now(),
          complete: false,
        };
        evidence.push(receipt);
        const response = await abortable(
          fetcher(ENDPOINT, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'cache-control': 'no-cache' },
            body: requestBody,
            redirect: 'error',
            credentials: 'omit',
            signal,
          }),
          signal,
          (late) => {
            void late.body?.cancel().catch(() => undefined);
          }
        );
        fresh();
        stage = 'response';
        receipt.httpStatus = response.status;
        check(!response.redirected && (!response.url || response.url === ENDPOINT), 'http-error');
        check(response.body, 'http-error');
        const reader = response.body.getReader(),
          chunks: Uint8Array[] = [];
        let bytes = 0,
          reads = 0,
          done = false,
          invalidUtf8 = false;
        try {
          for (;;) {
            check(++reads <= MAX_RESPONSE + 1, 'response-limit');
            const next = await abortable(reader.read(), signal);
            fresh();
            if (next.done) {
              done = true;
              break;
            }
            const retained = Math.max(0, Math.min(next.value.length, MAX_RESPONSE - bytes, MAX_TOTAL - totalBytes));
            if (retained) chunks.push(next.value.subarray(0, retained));
            bytes += next.value.length;
            totalBytes += next.value.length;
            check(bytes <= MAX_RESPONSE && totalBytes <= MAX_TOTAL, 'response-limit');
          }
        } finally {
          if (!done) void reader.cancel().catch(() => undefined);
          reader.releaseLock();
          const raw = Buffer.concat(chunks);
          receipt.bytes = raw.length;
          receipt.responseSha256 = createHash('sha256').update(raw).digest('hex');
          if (done) {
            try {
              receipt.responseBody = new TextDecoder('utf-8', { fatal: true }).decode(raw);
            } catch {
              receipt.responseBodyBase64 = raw.toString('base64');
              invalidUtf8 = true;
            }
            if (!invalidUtf8) {
              receipt.complete = true;
              receipt.completedAtMs = Date.now();
            }
          } else receipt.responseBodyBase64 = raw.toString('base64');
        }
        check(!invalidUtf8, 'page-invalid');
        check(response.status === 200, 'http-error');
        let parsed: unknown;
        try {
          parsed = JSON.parse(receipt.responseBody!);
        } catch {
          throw 'page-invalid';
        }
        const body = copy(parsed) as {
          errors?: unknown;
          data?: {
            assetSnapshots?: {
              edges?: Array<{ node: IndexedPoolHistoryRow & { id: string; assetId: string; type: string } }>;
              pageInfo?: { hasNextPage: boolean; endCursor: string | null };
            };
          };
        };
        check(body && typeof body === 'object' && !Array.isArray(body), 'page-invalid');
        check(!Object.hasOwn(body, 'errors'), 'graphql-error');
        const data = body.data?.assetSnapshots;
        check(
          data &&
            Array.isArray(data.edges) &&
            data.edges.length <= 100 &&
            data.pageInfo &&
            typeof data.pageInfo.hasNextPage === 'boolean',
          'page-invalid'
        );
        for (const edge of data.edges) {
          const row = edge?.node,
            ts = row?.timestamp;
          check(
            row &&
              typeof row.id === 'string' &&
              row.id.length <= 256 &&
              row.assetId === asset.address &&
              row.type === 'HOUR' &&
              Number.isSafeInteger(ts) &&
              Number(ts) >= bound.startAtMs / 1000 &&
              Number(ts) < bound.endAtMs / 1000 &&
              Number(ts) > previous &&
              !seenIds.has(row.id),
            'page-invalid'
          );
          check(row.id === `asset-${asset.address}-HOUR-${Math.floor(Number(ts) / 3600) * 3600}`, 'page-invalid');
          seenIds.add(row.id);
          previous = Number(ts);
          selected.push(row);
          check(selected.length <= hours, 'page-invalid');
        }
        if (!data.pageInfo.hasNextPage) {
          check(selected.length === hours, 'history-incomplete');
          finished = true;
        } else {
          const next = data.pageInfo.endCursor;
          check(
            data.edges.length > 0 &&
              typeof next === 'string' &&
              next.length > 0 &&
              next.length <= 4096 &&
              !cursors.has(next),
            'page-invalid'
          );
          cursors.add(next);
          after = next;
        }
      }
      rows.set(asset.address, selected);
    }
    fresh();
    stage = 'history';
    const history = parseIndexedPoolHistoryWithEvidence(rows, parserBot(), {
      startAt: bound.startAtMs,
      endAt: bound.endAtMs,
      genesisHash: bound.genesisHash,
      denominator: bound.denominator,
    });
    check(
      history.history.missing === 0 &&
        history.history.candles.length === hours &&
        history.boundaries.length === hours &&
        history.history.denominationVerified,
      'history-incomplete'
    );
    const result = copy({ history, rpcEvidence: evidence });
    fresh();
    return result;
  } catch (error) {
    const allowed: readonly string[] = [
      'invalid-input',
      'aborted',
      'timeout',
      'network-failed',
      'http-error',
      'response-limit',
      'request-limit',
      'graphql-error',
      'page-invalid',
      'history-incomplete',
    ];
    const reason: Reason = ownedOptions.signal?.aborted
      ? 'aborted'
      : timeout.signal.aborted
        ? 'timeout'
        : stage === 'input'
          ? 'invalid-input'
          : typeof error === 'string' && allowed.includes(error)
            ? (error as Reason)
            : stage === 'history'
              ? 'history-incomplete'
              : 'page-invalid';
    throw new GoalQualificationHistoryReadError(
      copy({ stage, reason, rpcEvidence: evidence, financialActions: false })
    );
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
