/** Bounded prospective raw recorder. No sampling, source registration, wallet or submission authority. */
import { createHash } from 'node:crypto';
import {
  isAccumulationQuoteRequestDescriptor,
  type AccumulationQuoteRequestDescriptor,
} from './accumulation-quote-requests';
import type { AccumulationRpcReceipt } from './accumulation-evidence-bridge';
import {
  isAccumulationBootstrapRequestDescriptor,
  type AccumulationBootstrapRequestDescriptor,
} from './accumulation-bootstrap-requests';

const ENDPOINT = 'https://ws.mof.sora.org/';
const RESPONSE_LIMIT = 65_536;
const sha = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** The caller must durably store exact UTF-8 bytes before acknowledging their digest/length. */
export interface AccumulationQuoteTransportOptions {
  /** Bootstrap is explicit; the default quote request/count/response limits remain unchanged. */
  profile?: 'quote' | 'bootstrap';
  fetch: typeof globalThis.fetch;
  retain(name: string, bytes: string): Promise<{ sha256: string; bytes: number }>;
  maximumRequests: number;
  maximumTotalResponseBytes: number;
  timeoutMs: number;
  maximumInFlight?: number;
  retentionTimeoutMs?: number;
  signal?: AbortSignal;
}
export interface AccumulationQuoteTransportOutcome {
  /** Compatible projection; malformed UTF-8 has no invented text response. */
  readonly receipt: Readonly<AccumulationRpcReceipt>;
  readonly raw: Readonly<{
    attempt: number;
    fetchStarted: boolean;
    requestBodyBase64: string;
    responseBodyBase64: string;
    requestedAtMs: number;
    completedAtMs: number;
    elapsedNs: string;
    receivedBytes: number;
    retainedBytes: number;
    responseComplete: boolean;
  }>;
  readonly result: unknown;
}
/** Retention uncertainty keeps the completed evidence available to the caller and stops further collection. */
export class AccumulationQuoteRetentionError extends Error {
  constructor(readonly retainedOutcome: AccumulationQuoteTransportOutcome | null) {
    super('accumulation-quote-retention-unconfirmed');
  }
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function boundedInteger(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= minimum && Number(value) <= maximum;
}
/** Reject duplicate decoded keys, noninteger numeric lexemes and deep JSON before normal parsing. */
function decodeJson(text: string): unknown {
  let at = 0;
  const space = () => {
    while (at < text.length && /[\t\n\r ]/.test(text[at])) at++;
  };
  const string = (): string => {
    const start = at++;
    while (at < text.length) {
      const c = text[at++];
      if (c === '"') return JSON.parse(text.slice(start, at));
      if (c === '\\') at++;
    }
    throw Error('json');
  };
  const scan = (depth: number): void => {
    if (depth >= 24) throw Error('json');
    space();
    if (text[at] === '"') {
      string();
      return;
    }
    if (text[at] === '{' || text[at] === '[') {
      const object = text[at++] === '{',
        end = object ? '}' : ']',
        keys = new Set<string>();
      space();
      if (text[at] === end) {
        at++;
        return;
      }
      while (at < text.length) {
        space();
        if (object) {
          if (text[at] !== '"') throw Error('json');
          const key = string();
          if (keys.has(key)) throw Error('json');
          keys.add(key);
          space();
          if (text[at++] !== ':') throw Error('json');
        }
        scan(depth + 1);
        space();
        if (text[at] === end) {
          at++;
          return;
        }
        if (text[at++] !== ',') throw Error('json');
      }
      throw Error('json');
    }
    for (const literal of ['true', 'false', 'null'])
      if (text.startsWith(literal, at)) {
        at += literal.length;
        return;
      }
    const start = at;
    if (text[at] === '-') at++;
    if (text[at] === '0') at++;
    else while (at < text.length && /[0-9]/.test(text[at]) && at - start <= 20) at++;
    const token = text.slice(start, at);
    if (!/^-?(?:0|[1-9][0-9]*)$/.test(token) || token === '-0' || !Number.isSafeInteger(Number(token)))
      throw Error('json');
  };
  scan(0);
  space();
  if (at !== text.length) throw Error('json');
  return JSON.parse(text);
}

/**
 * Only descriptors issued by the pure producer are accepted. One descriptor is
 * attempted once per instance; capacity exhaustion rejects rather than queues.
 * The injected retainer is the durability boundary, not independent provenance.
 */
export function createAccumulationQuoteTransport(input: AccumulationQuoteTransportOptions) {
  if (!input || Object.getPrototypeOf(input) !== Object.prototype) throw Error('invalid-transport-options');
  const ds = Object.getOwnPropertyDescriptors(input);
  const allowed = [
    'fetch',
    'retain',
    'maximumRequests',
    'maximumTotalResponseBytes',
    'timeoutMs',
    'maximumInFlight',
    'retentionTimeoutMs',
    'signal',
    'profile',
  ];
  if (
    Reflect.ownKeys(ds).some(
      (k) => typeof k !== 'string' || !allowed.includes(k) || !ds[k].enumerable || !('value' in ds[k])
    )
  )
    throw Error('invalid-transport-options');
  const { fetch: fetcher, retain, maximumRequests, maximumTotalResponseBytes, timeoutMs, signal } = input;
  const maximumInFlight = input.maximumInFlight ?? 1,
    retentionTimeoutMs = input.retentionTimeoutMs ?? 5000,
    profile = input.profile ?? 'quote';
  if (
    typeof fetcher !== 'function' ||
    typeof retain !== 'function' ||
    !['quote', 'bootstrap'].includes(profile) ||
    !boundedInteger(maximumRequests, 1, profile === 'bootstrap' ? 16 : 28) ||
    !boundedInteger(maximumTotalResponseBytes, 1, profile === 'bootstrap' ? 6 * 1024 * 1024 : 28 * RESPONSE_LIMIT) ||
    !boundedInteger(timeoutMs, 1, 15000) ||
    !boundedInteger(retentionTimeoutMs, 1, 15000) ||
    !boundedInteger(maximumInFlight, 1, profile === 'bootstrap' ? 3 : 9) ||
    (signal !== undefined && !(signal instanceof AbortSignal))
  )
    throw Error('invalid-transport-options');
  let starts = 0,
    observedBytes = 0,
    totalRetainedBytes = 0,
    closed = false;
  const used = new Set<string>();
  const usedIds = new Set<number>();
  const active = new Set<(reason: string) => void>();
  const stop = (reason: string) => {
    closed = true;
    for (const cancel of [...active]) cancel(reason);
  };
  const persist = async (name: string, value: unknown, outcome: AccumulationQuoteTransportOutcome | null) => {
    const bytes = JSON.stringify(value) + '\n',
      digest = sha(bytes),
      length = Buffer.byteLength(bytes);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const ack = await Promise.race([
        Promise.resolve().then(() => retain(name, bytes)),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(Error('retention-timeout')), retentionTimeoutMs);
        }),
      ]);
      if (!ack || ack.sha256 !== digest || ack.bytes !== length) throw Error('retention-ack');
    } catch {
      stop('retention-unconfirmed');
      throw new AccumulationQuoteRetentionError(outcome);
    } finally {
      clearTimeout(timer);
    }
  };
  const request = async (
    descriptor: AccumulationQuoteRequestDescriptor | AccumulationBootstrapRequestDescriptor
  ): Promise<AccumulationQuoteTransportOutcome> => {
    if (
      !(profile === 'bootstrap'
        ? isAccumulationBootstrapRequestDescriptor(descriptor)
        : isAccumulationQuoteRequestDescriptor(descriptor))
    )
      throw Error('unowned-request');
    if (closed || signal?.aborted) throw Error('transport-closed');
    if (active.size >= maximumInFlight) throw Error('transport-capacity');
    if (starts >= maximumRequests || observedBytes >= maximumTotalResponseBytes) throw Error('transport-budget');
    if (used.has(descriptor.requestSha256)) throw Error('request-already-attempted');
    if (usedIds.has(descriptor.id)) throw Error('request-id-already-attempted');
    const body = descriptor.requestBody,
      id = descriptor.id,
      responseLimit =
        profile === 'bootstrap' && descriptor.method === 'state_getMetadata' ? 2 * 1024 * 1024 : RESPONSE_LIMIT;
    const requestBytes = Buffer.from(body);
    if (
      descriptor.endpoint !== ENDPOINT ||
      requestBytes.length > 16_384 ||
      sha(requestBytes) !== descriptor.requestSha256
    )
      throw Error('invalid-owned-request');
    const attempt = ++starts;
    used.add(descriptor.requestSha256);
    usedIds.add(id);
    let cancellation: string | undefined, interrupt: ((reason: string) => void) | undefined;
    const cancel = (reason: string) => {
      cancellation ??= reason;
      interrupt?.(cancellation);
    };
    active.add(cancel);
    const onAbort = () => cancel('aborted');
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      await persist(
        `rpc-${attempt}-start.json`,
        {
          kind: 'accumulation-rpc-start-v1',
          attempt,
          endpoint: ENDPOINT,
          requestBodyBase64: requestBytes.toString('base64'),
          requestSha256: descriptor.requestSha256,
        },
        null
      );
      const outcome = await new Promise<AccumulationQuoteTransportOutcome>((resolve) => {
        const requestedAtMs = Date.now(),
          startedNs = process.hrtime.bigint(),
          controller = new AbortController();
        let settled = false,
          fetchStarted = false,
          httpStatus: number | null = null;
        let receivedBytes = 0,
          retainedBytes = 0,
          responseComplete = false;
        let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
        const chunks: Buffer[] = [];
        let timer: ReturnType<typeof setTimeout> | undefined;
        const finish = (failure: string | null, result: unknown = null) => {
          if (settled) return;
          const completedAtMs = Date.now(),
            elapsed = process.hrtime.bigint() - startedNs;
          if (
            !boundedInteger(requestedAtMs, 0, Number.MAX_SAFE_INTEGER) ||
            !boundedInteger(completedAtMs, 0, Number.MAX_SAFE_INTEGER) ||
            completedAtMs < requestedAtMs ||
            elapsed < 0n
          )
            failure = 'clock-regression';
          else if (elapsed >= BigInt(timeoutMs) * 1_000_000n) failure = 'timeout';
          settled = true;
          clearTimeout(timer);
          interrupt = undefined;
          const raw = Buffer.concat(chunks, retainedBytes);
          let responseBody: string | null = null;
          try {
            responseBody = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw);
          } catch {
            failure ??= 'invalid-utf8';
          }
          resolve(
            freeze({
              receipt: {
                endpoint: ENDPOINT,
                requestBody: body,
                responseBody,
                responseSha256: sha(raw),
                requestedAtMs,
                completedAtMs,
                httpStatus,
                failure,
              },
              raw: {
                attempt,
                fetchStarted,
                requestBodyBase64: requestBytes.toString('base64'),
                responseBodyBase64: raw.toString('base64'),
                requestedAtMs,
                completedAtMs,
                elapsedNs: elapsed.toString(),
                receivedBytes,
                retainedBytes,
                responseComplete,
              },
              result: failure === null ? result : null,
            })
          );
          if (!responseComplete) {
            controller.abort();
            void reader?.cancel().catch(() => undefined);
          }
        };
        interrupt = finish;
        if (cancellation || closed || signal?.aborted) {
          finish(cancellation ?? 'aborted');
          return;
        }
        timer = setTimeout(() => finish('timeout'), timeoutMs);
        void (async () => {
          let reading = false;
          try {
            fetchStarted = true;
            const response = await fetcher(ENDPOINT, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
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
            if (!boundedInteger(response.status, 100, 599)) {
              finish('invalid-http-status');
              return;
            }
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
                  break;
                }
                if (!(part.value instanceof Uint8Array)) {
                  finish('invalid-response-chunk');
                  return;
                }
                receivedBytes += part.value.byteLength;
                observedBytes += part.value.byteLength;
                const take = Math.min(
                  part.value.byteLength,
                  responseLimit - retainedBytes,
                  maximumTotalResponseBytes - totalRetainedBytes
                );
                if (take > 0) {
                  chunks.push(Buffer.from(part.value.subarray(0, take)));
                  retainedBytes += take;
                  totalRetainedBytes += take;
                }
                if (observedBytes > maximumTotalResponseBytes) {
                  finish('total-response-limit');
                  stop('total-response-limit');
                  return;
                }
                if (receivedBytes > responseLimit) {
                  finish('response-too-large');
                  return;
                }
                if (process.hrtime.bigint() - startedNs >= BigInt(timeoutMs) * 1_000_000n) {
                  finish('timeout');
                  return;
                }
              }
            } else responseComplete = true;
            if (settled) return;
            if (redirected || (httpStatus >= 300 && httpStatus < 400)) {
              finish('redirect-disallowed');
              return;
            }
            if (httpStatus !== 200) {
              finish('http-status');
              return;
            }
            let text: string, envelope: unknown;
            try {
              text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
                Buffer.concat(chunks, retainedBytes)
              );
            } catch {
              finish('invalid-utf8');
              return;
            }
            try {
              envelope = decodeJson(text);
            } catch {
              finish('malformed-json');
              return;
            }
            if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
              finish('rpc-envelope');
              return;
            }
            const e = envelope as Record<string, unknown>;
            if (
              e.jsonrpc !== '2.0' ||
              e.id !== id ||
              Object.keys(e).length !== 3 ||
              Object.hasOwn(e, 'result') === Object.hasOwn(e, 'error')
            ) {
              finish('rpc-envelope');
              return;
            }
            if (Object.hasOwn(e, 'error')) {
              finish('rpc-error');
              return;
            }
            finish(null, e.result);
          } catch {
            if (!settled) finish(reading ? 'response-read-failed' : 'transport-failed');
          }
        })();
      });
      await persist(`rpc-${attempt}-outcome.json`, { kind: 'accumulation-rpc-outcome-v1', ...outcome }, outcome);
      return outcome;
    } finally {
      signal?.removeEventListener('abort', onAbort);
      active.delete(cancel);
    }
  };
  return Object.freeze({
    request,
    close: () => stop('closed'),
    statistics: () =>
      Object.freeze({
        startedRequests: starts,
        observedResponseBytes: observedBytes,
        retainedResponseBytes: totalRetainedBytes,
        inFlight: active.size,
        closed,
      }),
  });
}
