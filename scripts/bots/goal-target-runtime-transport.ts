/** Bounded raw state acquisition for a separately registered target-runtime study; no signing APIs. */
import { createHash } from 'node:crypto';

const ENDPOINT = 'https://mof2.sora.org/';
const HASH = /^0x[0-9a-f]{64}$/;
const KEY = /^0x(?:[0-9a-f]{2}){32,1024}$/;
const HEX = /^0x(?:[0-9a-f]{2})*$/;
const RESPONSE_BYTES = 256 * 1024;
const TOTAL_BYTES = 8 * 1024 * 1024;
const PAGE_SIZE = 64;
const MAX_KEYS = 256;

/** Exact request/response bytes must be retained before another request or a parsed result is returned. */
export interface GoalTargetStateRpcReceipt {
  id: number;
  method: 'state_getStorage' | 'state_getKeysPaged';
  params: readonly (string | number | null)[];
  requestBody: string;
  requestedAt: string;
  completedAt: string;
  httpStatus: number | null;
  responseBody: string;
  responseSha256: string;
  failure?: string;
  /** Failure-only raw prefix; never interpret a truncated or malformed response as storage evidence. */
  responseBodyBase64?: string;
  responseComplete?: boolean;
  receivedBytes?: number;
}

export interface GoalTargetStateAcquisition {
  blockHash: string;
  /** Derived by the verified source/target metadata codec, including the genuine pool account. */
  pointKeys: readonly string[];
  prefix: string;
  /** Required injection; there is deliberately no ambient/default network transport. */
  fetch: typeof fetch;
  retain(receipt: Readonly<GoalTargetStateRpcReceipt>): Promise<void>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

const check: (condition: unknown, reason: string) => asserts condition = (condition, reason) => {
  if (!condition) throw new Error(`target-state:${reason}`);
};

/** Snapshot plain caller configuration without invoking accessors or retaining mutable key arrays. */
function own<T extends object>(value: T): T {
  check(value && Object.getPrototypeOf(value) === Object.prototype, 'input');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(descriptors).every((key) => typeof key === 'string'),
    'input'
  );
  check(
    Object.values(descriptors).every((d) => d.enumerable && 'value' in d),
    'input'
  );
  return Object.fromEntries(Object.entries(descriptors).map(([key, d]) => [key, d.value])) as T;
}

/**
 * Read one fixed source block: point values, a complete bounded prefix, and its genuine global
 * successor. No retries, alternative states, credentials or endpoint overrides are accepted.
 * RPC attestations are not cryptographic storage proofs or qualification authority.
 */
export async function acquireGoalTargetRuntimeState(raw: GoalTargetStateAcquisition) {
  const input = own(raw);
  check(
    Object.keys(input).every((key) =>
      ['blockHash', 'pointKeys', 'prefix', 'fetch', 'retain', 'signal', 'timeoutMs'].includes(key)
    ),
    'input'
  );
  const { blockHash, prefix, fetch: transport, retain, signal } = input;
  check(
    typeof blockHash === 'string' && typeof prefix === 'string' && HASH.test(blockHash) && HASH.test(prefix),
    'identity'
  );
  check(Array.isArray(input.pointKeys) && input.pointKeys.length > 0 && input.pointKeys.length <= 7, 'keys');
  const keyDescriptors = Object.getOwnPropertyDescriptors(input.pointKeys as object);
  check(
    Reflect.ownKeys(keyDescriptors).length === input.pointKeys.length + 1 &&
      Object.entries(keyDescriptors).every(
        ([key, d]) => key === 'length' || (d.enumerable && 'value' in d && /^(0|[1-9]\d*)$/.test(key))
      ),
    'keys'
  );
  const pointKeys = Array.from({ length: input.pointKeys.length }, (_, i) => keyDescriptors[String(i)].value as string);
  check(
    pointKeys.every((key) => typeof key === 'string' && KEY.test(key) && !key.startsWith(prefix)) &&
      new Set(pointKeys).size === pointKeys.length,
    'keys'
  );
  check(typeof transport === 'function' && typeof retain === 'function', 'dependencies');
  check(signal === undefined || signal instanceof AbortSignal, 'signal');
  const timeoutMs = input.timeoutMs ?? 20000;
  check(Number.isSafeInteger(timeoutMs) && timeoutMs >= 1 && timeoutMs <= 30000, 'timeout');
  const deadline = Date.now() + 10 * 60000;
  const receipts: Readonly<GoalTargetStateRpcReceipt>[] = [];
  let totalBytes = 0;
  let nextId = 0;

  const request = async (method: GoalTargetStateRpcReceipt['method'], params: (string | number | null)[]) => {
    check(!signal?.aborted && Date.now() < deadline, 'aborted');
    check(++nextId <= 269, 'request-limit');
    const id = nextId;
    const requestBody = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    const requestedAt = new Date().toISOString();
    const controller = new AbortController();
    let ended = false;
    let status: number | null = null;
    let body = '';
    let failure: string | undefined;
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    let retainedBytes = 0;
    let responseComplete = false;
    const requestDeadline = Math.min(Date.now() + timeoutMs, deadline);
    let rejectCancelled: (error: Error) => void = () => undefined;
    const cancelled = new Promise<never>((_resolve, reject) => {
      rejectCancelled = reject;
    });
    const cancel = () => {
      controller.abort();
      rejectCancelled(new Error('target-state:aborted-or-timeout'));
    };
    const timer = setTimeout(cancel, Math.max(1, requestDeadline - Date.now()));
    signal?.addEventListener('abort', cancel, { once: true });
    const execute = async () => {
      const response = await transport(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
        redirect: 'error',
        credentials: 'omit',
        signal: controller.signal,
      });
      status = response.status;
      check(
        !ended && !controller.signal.aborted && Date.now() < requestDeadline && Date.now() < deadline,
        'aborted-or-timeout'
      );
      check(!response.redirected && (!response.url || response.url === ENDPOINT) && response.body, 'response');
      const reader = response.body.getReader();
      try {
        while (true) {
          const part = await reader.read();
          check(
            !ended && !controller.signal.aborted && Date.now() < requestDeadline && Date.now() < deadline,
            'aborted-or-timeout'
          );
          if (part.done) {
            responseComplete = true;
            break;
          }
          check(part.value instanceof Uint8Array && part.value.byteLength > 0, 'body');
          bytes += part.value.byteLength;
          const keep = Math.max(
            0,
            Math.min(part.value.byteLength, RESPONSE_BYTES - retainedBytes, TOTAL_BYTES - totalBytes - retainedBytes)
          );
          if (keep) {
            chunks.push(part.value.slice(0, keep));
            retainedBytes += keep;
          }
          check(bytes <= RESPONSE_BYTES && totalBytes + bytes <= TOTAL_BYTES, 'response-limit');
        }
      } finally {
        void reader.cancel().catch(() => undefined);
      }
      return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    };
    try {
      body = await Promise.race([execute(), cancelled]);
      check(status === 200, 'http');
      const parsed = JSON.parse(body) as Record<string, unknown>;
      check(
        parsed &&
          !Array.isArray(parsed) &&
          parsed.jsonrpc === '2.0' &&
          parsed.id === id &&
          !Object.hasOwn(parsed, 'error') &&
          Object.hasOwn(parsed, 'result'),
        'rpc'
      );
    } catch (error) {
      failure =
        error instanceof Error && /^target-state:[a-z-]+$/.test(error.message)
          ? error.message
          : 'target-state:invalid-response';
      if (!body && chunks.length) {
        try {
          body = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
        } catch {
          body = '';
        }
      }
    } finally {
      ended = true;
      controller.abort();
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    }
    totalBytes += bytes;
    const rawBytes = Buffer.concat(chunks);
    const receipt = Object.freeze({
      id,
      method,
      params: Object.freeze([...params]),
      requestBody,
      requestedAt,
      completedAt: new Date().toISOString(),
      httpStatus: status,
      responseBody: body,
      responseSha256: createHash('sha256').update(rawBytes).digest('hex'),
      ...(failure
        ? {
            failure,
            responseBodyBase64: rawBytes.toString('base64'),
            responseComplete: responseComplete && bytes === retainedBytes,
            receivedBytes: bytes,
          }
        : {}),
    });
    // Journal cleanup remains bounded even when the network attempt already timed out or was aborted.
    const retentionDeadline = Date.now() + 5000;
    let rejectRetention: (error: Error) => void = () => undefined;
    const retentionCancelled = new Promise<never>((_resolve, reject) => {
      rejectRetention = reject;
    });
    const retentionAbort = () => rejectRetention(new Error('target-state:retention-cancelled'));
    const retentionTimer = setTimeout(retentionAbort, 5000);
    if (!failure) signal?.addEventListener('abort', retentionAbort, { once: true });
    try {
      if (!failure) check(!signal?.aborted, 'aborted');
      await Promise.race([Promise.resolve().then(() => retain(receipt)), retentionCancelled]);
      check(Date.now() < retentionDeadline, 'retention-timeout');
    } finally {
      clearTimeout(retentionTimer);
      signal?.removeEventListener('abort', retentionAbort);
    }
    receipts.push(receipt);
    if (failure) throw new Error(failure);
    check(!signal?.aborted && Date.now() < deadline, 'aborted-or-timeout');
    return (JSON.parse(body) as { result: unknown }).result;
  };

  for (const key of pointKeys) {
    const value = await request('state_getStorage', [key, blockHash]);
    check(value === null || (typeof value === 'string' && HEX.test(value)), 'storage-value');
  }
  const prefixKeys: string[] = [];
  let cursor: string | null = null;
  let pages = 0;
  while (true) {
    check(++pages <= 5, 'page-limit');
    const page = await request('state_getKeysPaged', [prefix, PAGE_SIZE, cursor, blockHash]);
    check(Array.isArray(page) && page.length <= PAGE_SIZE, 'page');
    if (page.length === 0) break;
    for (const key of page) {
      check(
        typeof key === 'string' && KEY.test(key) && key.startsWith(prefix) && key > (cursor ?? prefix),
        'page-order'
      );
      prefixKeys.push(key);
      check(prefixKeys.length <= MAX_KEYS, 'prefix-limit');
      cursor = key;
    }
  }
  for (const key of prefixKeys) {
    const value = await request('state_getStorage', [key, blockHash]);
    check(typeof value === 'string' && HEX.test(value), 'prefix-value');
  }
  const after = await request('state_getKeysPaged', [null, 1, cursor ?? prefix, blockHash]);
  check(
    Array.isArray(after) &&
      after.length <= 1 &&
      (after.length === 0 ||
        (typeof after[0] === 'string' &&
          KEY.test(after[0]) &&
          after[0] > (cursor ?? prefix) &&
          !after[0].startsWith(prefix))),
    'global-successor'
  );
  return Object.freeze({
    blockHash,
    prefix,
    receipts: Object.freeze([...receipts]),
    responseBytes: totalBytes,
    requests: nextId,
    retries: 0 as const,
    financialActions: false as const,
  });
}
