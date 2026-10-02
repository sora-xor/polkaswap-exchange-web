/** One prospective public completed-hour read. No native quotes, model, wallet or admission authority. */
import { createHash } from 'node:crypto';
import {
  parseIndexedPoolHistoryWithEvidence,
  type IndexedPoolHistoryRow,
} from '../../src/features/bot-trading/pool-history';
import type { BotDefinition } from '../../src/features/bot-trading/types';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from './historical-execution-codec';

const ENDPOINT = 'https://pi.soramitsu.io/graphql';
const HOUR = 3_600_000;
const RESPONSE_LIMIT = 65_536;
// Same AssetSnapshotFilter/closeEvidence schema used by goal-qualification-history-reader.ts.
const FIELDS = 'pageInfo{hasNextPage endCursor}edges{node{id assetId type timestamp denominator closeEvidence}}';
const QUERY = `query AccumulationCompletedClose($kusd:AssetSnapshotFilter!,$xor:AssetSnapshotFilter!){kusd:assetSnapshots(first:2,orderBy:[TIMESTAMP_ASC],filter:$kusd){${FIELDS}}xor:assetSnapshots(first:2,orderBy:[TIMESTAMP_ASC],filter:$xor){${FIELDS}}}`;
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const owned = new WeakSet<object>();

/** The caller must store exact UTF-8 bytes durably and exclusively before acknowledging them. */
export interface AccumulationCloseSourceOptions {
  fetch: typeof globalThis.fetch;
  retain(name: string, exactUtf8JsonWithLF: string): Promise<{ sha256: string; bytes: number }>;
  timeoutMs: number;
  retentionTimeoutMs?: number;
  signal?: AbortSignal;
}
export interface AccumulationCloseSourceReceipt {
  readonly kind: 'accumulation-close-source-receipt-v1';
  readonly endpoint: typeof ENDPOINT;
  readonly boundaryUtcMs: number;
  readonly requestBodyBase64: string;
  readonly requestSha256: string;
  readonly responseBodyBase64: string;
  readonly responseSha256: string;
  readonly requestedAtMs: number;
  /** Original end-of-body clock; on interrupted transport, the actual failure clock. */
  readonly completedAtMs: number;
  readonly elapsedNs: string;
  readonly httpStatus: number | null;
  readonly fetchStarted: boolean;
  readonly receivedBytes: number;
  readonly retainedBytes: number;
  readonly responseComplete: boolean;
  readonly failure: string | null;
  readonly rawRowsSha256: string | null;
}
export interface AccumulationCloseSourceResult {
  readonly kind: 'accumulation-close-source-v1';
  readonly status: 'complete' | 'failed';
  readonly receipt: AccumulationCloseSourceReceipt;
  readonly sourceReceiptSha256: string;
  readonly closeRowsJson: string | null;
  readonly completedClose: Readonly<{
    timestampMs: number;
    availableAtMs: number;
    rawRowsSha256: string;
    sourceReceiptSha256: string;
  }> | null;
  readonly independentConsensusVerified: false;
  readonly historicalBrowserArrivalVerified: false;
  readonly admissionAuthorized: false;
}
/** Retention uncertainty is not a completed collection, even if transport bytes are available. */
export class AccumulationCloseRetentionError extends Error {
  constructor(readonly retainedReceipt: AccumulationCloseSourceReceipt | null) {
    super('accumulation-close-retention-unconfirmed');
  }
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function integer(value: unknown, low: number, high: number): value is number {
  return Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= low && Number(value) <= high;
}
function check(value: unknown, code: string): asserts value {
  if (!value) throw Error(code);
}
function record(value: unknown): Record<string, unknown> {
  check(value && typeof value === 'object' && !Array.isArray(value), 'invalid-response-shape');
  return value as Record<string, unknown>;
}

/** Strict JSON scan also preserves the exact UTF-8-decoded node substrings, including their whitespace. */
function responseJson(text: string) {
  let at = 0;
  const nodes = new Map<string, string>();
  const space = () => {
    while (at < text.length && /[\t\r\n ]/.test(text[at])) at++;
  };
  const string = (): string => {
    check(text[at] === '"', 'malformed-json');
    const start = at++;
    while (at < text.length) {
      const c = text[at++];
      if (c === '"') return JSON.parse(text.slice(start, at));
      if (c === '\\') at++;
    }
    throw Error('malformed-json');
  };
  const scan = (path: (string | number)[], depth: number): void => {
    check(depth < 24, 'malformed-json');
    space();
    const start = at;
    if (text[at] === '"') string();
    else if (text[at] === '{' || text[at] === '[') {
      const object = text[at++] === '{',
        end = object ? '}' : ']',
        keys = new Set<string>();
      let index = 0;
      space();
      if (text[at] === end) at++;
      else {
        while (true) {
          space();
          let key: string | number = index++;
          if (object) {
            key = string();
            check(!keys.has(key), 'duplicate-json-key');
            keys.add(key);
            space();
            check(text[at++] === ':', 'malformed-json');
          }
          scan([...path, key], depth + 1);
          space();
          if (text[at] === end) {
            at++;
            break;
          }
          check(text[at++] === ',', 'malformed-json');
        }
      }
    } else {
      const token = /(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/y;
      token.lastIndex = at;
      const found = token.exec(text);
      check(found, 'malformed-json');
      at = token.lastIndex;
      if (/^[-\d]/.test(found[0]))
        check(
          /^-?(?:0|[1-9]\d*)$/.test(found[0]) && found[0] !== '-0' && Number.isSafeInteger(Number(found[0])),
          'inexact-json-number'
        );
    }
    if (
      path.length === 5 &&
      path[0] === 'data' &&
      ['kusd', 'xor'].includes(String(path[1])) &&
      path[2] === 'edges' &&
      path[3] === 0 &&
      path[4] === 'node'
    )
      nodes.set(String(path[1]), text.slice(start, at));
  };
  scan([], 0);
  space();
  check(at === text.length, 'malformed-json');
  return { value: JSON.parse(text) as unknown, nodes };
}

/** Validate indexed identities with the existing parser; native ancestry remains the later bridge's obligation. */
function extractRows(text: string, boundary: number, receivedAt: number): string {
  const parsed = responseJson(text),
    body = record(parsed.value);
  check(!Object.hasOwn(body, 'errors'), 'graphql-error');
  const data = record(body.data),
    rows = new Map<string, IndexedPoolHistoryRow[]>();
  const start = (boundary - HOUR) / 1000,
    end = boundary / 1000;
  for (const [alias, assetId] of [
    ['kusd', KUSD],
    ['xor', XOR],
  ]) {
    const connection = record(data[alias]),
      page = record(connection.pageInfo);
    check(
      page.hasNextPage === false &&
        (page.endCursor === null || (typeof page.endCursor === 'string' && page.endCursor.length <= 4096)),
      'unexpected-page'
    );
    check(Array.isArray(connection.edges) && connection.edges.length === 1, 'missing-or-ambiguous-row');
    const node = record(record(connection.edges[0]).node);
    check(
      node.id === `asset-${assetId}-HOUR-${start}` &&
        node.assetId === assetId &&
        node.type === 'HOUR' &&
        integer(node.timestamp, start, end - 1),
      'row-identity'
    );
    check(parsed.nodes.has(alias), 'missing-original-node');
    rows.set(assetId, [node as unknown as IndexedPoolHistoryRow]);
  }
  const denominator = rows.get(KUSD)![0].denominator;
  check(
    typeof denominator === 'string' && /^[1-9]\d{0,38}$/.test(denominator) && BigInt(denominator) < 1n << 128n,
    'invalid-denominator'
  );
  const bot = {
    assetIn: { address: KUSD, symbol: 'KUSD', decimals: 18 },
    assetOut: { address: XOR, symbol: 'XOR', decimals: 18 },
    policy: { feeAsset: { address: XOR, symbol: 'XOR', decimals: 18 } },
  } as BotDefinition;
  let proof;
  try {
    proof = parseIndexedPoolHistoryWithEvidence(rows, bot, {
      startAt: boundary - HOUR,
      endAt: boundary,
      genesisHash: GENESIS,
      denominator,
    });
  } catch {
    throw Error('invalid-close-evidence');
  }
  check(
    proof.history.missing === 0 &&
      proof.history.candles.length === 1 &&
      proof.boundaries.length === 1 &&
      proof.history.denominationVerified,
    'invalid-close-evidence'
  );
  check(
    receivedAt >= boundary && receivedAt >= proof.boundaries[0].successor.timestampSeconds * 1000 + 999,
    'future-close-evidence'
  );
  // Only the outer two-key wrapper is constructed: each node is an exact original substring, not reserialized.
  return `{${JSON.stringify(KUSD)}:[${parsed.nodes.get('kusd')}],${JSON.stringify(XOR)}:[${parsed.nodes.get('xor')}]}`;
}

/** True only for this module's complete, durably acknowledged result; JSON cannot restore this ownership. */
export function isAccumulationCloseSourceResult(value: unknown): value is AccumulationCloseSourceResult {
  return !!value && typeof value === 'object' && owned.has(value);
}

/**
 * One instance makes at most one fixed-endpoint request; it never retries or paginates.
 * The injected recorder is the caller's durability boundary, not independent source authentication.
 */
export function createAccumulationCloseSource(input: AccumulationCloseSourceOptions) {
  check(input && Object.getPrototypeOf(input) === Object.prototype, 'invalid-close-options');
  const descriptors = Object.getOwnPropertyDescriptors(input);
  check(
    Reflect.ownKeys(descriptors).every(
      (k) =>
        typeof k === 'string' &&
        ['fetch', 'retain', 'timeoutMs', 'retentionTimeoutMs', 'signal'].includes(k) &&
        descriptors[k].enumerable &&
        'value' in descriptors[k]
    ),
    'invalid-close-options'
  );
  const { fetch: fetcher, retain, timeoutMs, signal } = input,
    retentionTimeoutMs = input.retentionTimeoutMs ?? 5000;
  check(
    typeof fetcher === 'function' &&
      typeof retain === 'function' &&
      integer(timeoutMs, 1, 15000) &&
      integer(retentionTimeoutMs, 1, 15000) &&
      (signal === undefined || signal instanceof AbortSignal),
    'invalid-close-options'
  );
  let attempted = false,
    closed = false,
    cancel: ((reason: string) => void) | undefined;
  const close = () => {
    closed = true;
    cancel?.('aborted');
  };
  const persist = async (
    name: string,
    value: unknown,
    receipt: AccumulationCloseSourceReceipt | null
  ): Promise<string> => {
    const bytes = JSON.stringify(value) + '\n',
      digest = sha(bytes);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const ack = await Promise.race([
        Promise.resolve().then(() => retain(name, bytes)),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(Error('retention-timeout')), retentionTimeoutMs);
        }),
      ]);
      check(ack && ack.sha256 === digest && ack.bytes === Buffer.byteLength(bytes), 'retention-ack');
      return digest;
    } catch {
      close();
      throw new AccumulationCloseRetentionError(receipt);
    } finally {
      clearTimeout(timer);
    }
  };
  const collect = async (value: { boundaryUtcMs: number }): Promise<AccumulationCloseSourceResult> => {
    check(value && Object.getPrototypeOf(value) === Object.prototype, 'invalid-close-boundary');
    const d = Object.getOwnPropertyDescriptors(value);
    check(
      Reflect.ownKeys(d).length === 1 && d.boundaryUtcMs?.enumerable && 'value' in d.boundaryUtcMs,
      'invalid-close-boundary'
    );
    const boundary = d.boundaryUtcMs.value,
      now = Date.now();
    check(
      integer(now, 0, Number.MAX_SAFE_INTEGER) &&
        integer(boundary, HOUR, 2_147_483_647_000) &&
        boundary % HOUR === 0 &&
        boundary <= now,
      'invalid-close-boundary'
    );
    check(!attempted && !closed && !signal?.aborted, 'close-source-unavailable');
    attempted = true;
    const filter = (assetId: string) => ({
      assetId: { equalTo: assetId },
      type: { equalTo: 'HOUR' },
      timestamp: { greaterThanOrEqualTo: (boundary - HOUR) / 1000, lessThan: boundary / 1000 },
    });
    const body = JSON.stringify({ query: QUERY, variables: { kusd: filter(KUSD), xor: filter(XOR) } }),
      requestBytes = Buffer.from(body),
      requestSha256 = sha(requestBytes);
    await persist(
      `close-${boundary}-start.json`,
      {
        kind: 'accumulation-close-source-start-v1',
        endpoint: ENDPOINT,
        boundaryUtcMs: boundary,
        requestBodyBase64: requestBytes.toString('base64'),
        requestSha256,
      },
      null
    );
    const outcome = await new Promise<{ receipt: AccumulationCloseSourceReceipt; rows: string | null }>((resolve) => {
      const requestedAtMs = Date.now(),
        startedNs = process.hrtime.bigint(),
        controller = new AbortController();
      let settled = false,
        fetchStarted = false,
        responseComplete = false,
        receivedBytes = 0,
        retainedBytes = 0;
      let httpStatus: number | null = null,
        receivedAt: number | undefined,
        receivedNs: bigint | undefined;
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined, timer: ReturnType<typeof setTimeout> | undefined;
      const chunks: Buffer[] = [];
      const finish = (failure: string | null, rows: string | null = null) => {
        if (settled) return;
        const completedAtMs = receivedAt ?? Date.now(),
          elapsed = (receivedNs ?? process.hrtime.bigint()) - startedNs;
        if (
          !integer(requestedAtMs, 0, Number.MAX_SAFE_INTEGER) ||
          !integer(completedAtMs, 0, Number.MAX_SAFE_INTEGER) ||
          completedAtMs < requestedAtMs ||
          requestedAtMs < boundary ||
          elapsed < 0n
        )
          failure = 'clock-regression';
        else if (process.hrtime.bigint() - startedNs >= BigInt(timeoutMs) * 1_000_000n) failure = 'timeout';
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        cancel = undefined;
        const bytes = Buffer.concat(chunks, retainedBytes);
        const receipt: AccumulationCloseSourceReceipt = freeze({
          kind: 'accumulation-close-source-receipt-v1',
          endpoint: ENDPOINT,
          boundaryUtcMs: boundary,
          requestBodyBase64: requestBytes.toString('base64'),
          requestSha256,
          responseBodyBase64: bytes.toString('base64'),
          responseSha256: sha(bytes),
          requestedAtMs,
          completedAtMs,
          elapsedNs: elapsed.toString(),
          httpStatus,
          fetchStarted,
          receivedBytes,
          retainedBytes,
          responseComplete,
          failure,
          rawRowsSha256: failure === null && rows !== null ? sha(rows) : null,
        });
        resolve({ receipt, rows: failure === null ? rows : null });
        if (!responseComplete) {
          controller.abort();
          void reader?.cancel().catch(() => undefined);
        }
      };
      const onAbort = () => finish('aborted');
      cancel = finish;
      signal?.addEventListener('abort', onAbort, { once: true });
      if (closed || signal?.aborted) {
        finish('aborted');
        return;
      }
      timer = setTimeout(() => finish('timeout'), timeoutMs);
      void (async () => {
        let reading = false;
        try {
          fetchStarted = true;
          const response = await fetcher(ENDPOINT, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'cache-control': 'no-cache' },
            body,
            credentials: 'omit',
            redirect: 'error',
            cache: 'no-store',
            signal: controller.signal,
          });
          if (settled) {
            void response.body?.cancel().catch(() => undefined);
            return;
          }
          check(integer(response.status, 100, 599), 'invalid-http-status');
          httpStatus = response.status;
          const redirected = response.redirected || (response.url !== '' && response.url !== ENDPOINT);
          if (response.body) {
            reader = response.body.getReader();
            reading = true;
            while (!settled) {
              const part = await reader.read();
              if (settled) return;
              if (part.done) {
                responseComplete = true;
                receivedAt = Date.now();
                receivedNs = process.hrtime.bigint();
                break;
              }
              check(part.value instanceof Uint8Array && part.value.byteLength > 0, 'invalid-response-chunk');
              receivedBytes += part.value.byteLength;
              const take = Math.min(part.value.byteLength, RESPONSE_LIMIT - retainedBytes);
              if (take > 0) {
                chunks.push(Buffer.from(part.value.subarray(0, take)));
                retainedBytes += take;
              }
              if (receivedBytes > RESPONSE_LIMIT) {
                finish('response-too-large');
                return;
              }
              if (process.hrtime.bigint() - startedNs >= BigInt(timeoutMs) * 1_000_000n) {
                finish('timeout');
                return;
              }
            }
          } else {
            responseComplete = true;
            receivedAt = Date.now();
            receivedNs = process.hrtime.bigint();
          }
          if (settled) return;
          if (redirected || (httpStatus >= 300 && httpStatus < 400)) {
            finish('redirect-disallowed');
            return;
          }
          if (httpStatus !== 200) {
            finish('http-status');
            return;
          }
          let text: string;
          try {
            text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
              Buffer.concat(chunks, retainedBytes)
            );
          } catch {
            finish('invalid-utf8');
            return;
          }
          try {
            finish(null, extractRows(text, boundary, receivedAt!));
          } catch (error) {
            const reason = error instanceof Error ? error.message : '';
            finish(/^[a-z-]{1,64}$/.test(reason) ? reason : 'malformed-json');
          }
        } catch {
          finish(reading ? 'response-read-failed' : 'network-failed');
        }
      })();
    });
    const sourceReceiptSha256 = await persist(`close-${boundary}-outcome.json`, outcome.receipt, outcome.receipt);
    const complete = outcome.receipt.failure === null && outcome.rows !== null;
    const result: AccumulationCloseSourceResult = freeze({
      kind: 'accumulation-close-source-v1',
      status: complete ? 'complete' : 'failed',
      receipt: outcome.receipt,
      sourceReceiptSha256,
      closeRowsJson: outcome.rows,
      completedClose: complete
        ? {
            timestampMs: boundary,
            availableAtMs: outcome.receipt.completedAtMs,
            rawRowsSha256: sha(outcome.rows!),
            sourceReceiptSha256,
          }
        : null,
      independentConsensusVerified: false,
      historicalBrowserArrivalVerified: false,
      admissionAuthorized: false,
    });
    if (complete) owned.add(result);
    return result;
  };
  return Object.freeze({ collect, close });
}
