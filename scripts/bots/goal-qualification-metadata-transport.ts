/** One in-flight, at-most32-request JSON-RPC metadata batch transport; no market methods. */
import { createHash } from 'node:crypto';
const ENDPOINT = 'https://mof2.sora.org/';
const TIME = '0xf0c365c3cf59d671eb72da0e7a4113c49f1f0515f462cdcf84e0f1d6045dfcbb';
const CODE = '0x3a636f6465';
interface Pending {
  originalId: number;
  logicalRequestId: number;
  method: string;
  params: unknown[];
  resolve: (r: Response) => void;
  reject: (e: Error) => void;
}
export interface GoalMetadataBatchStats {
  logicalRpcCalls: number;
  wireRpcCalls: number;
  httpStarts: number;
  responseBytes: number;
  lastStartedAtMs: number;
}
export interface GoalMetadataBatchOptions {
  /** Explicit bounded three-schema metadata policy; omitted preserves original v1 limits. */
  policyVersion?: 1 | 2;
  fetch?: typeof fetch;
  signal?: AbortSignal;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  previousStartedAtMs?: number;
  budget: { logicalRpcCalls: number; httpStarts: number; responseBytes: number };
  /** Preserve the actual original batch bytes/mapping before releasing per-RPC projections. */
  sink: (index: number, evidence: unknown) => Promise<void>;
}
const fail = () => new Error('metadata-batch-unavailable');
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener('abort', abort);
      reject(fail());
    };
    signal.addEventListener('abort', abort, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener('abort', abort);
        signal.aborted ? reject(fail()) : resolve(v);
      },
      () => {
        signal.removeEventListener('abort', abort);
        reject(fail());
      }
    );
    if (signal.aborted) abort();
  });
}
/** Exact identical method/params within a batch share one RPC, declared before collection. */
export function createGoalMetadataBatchTransport(options: GoalMetadataBatchOptions) {
  if (
    !options ||
    typeof options.sink !== 'function' ||
    !options.budget ||
    Object.getPrototypeOf(options.budget) !== Object.prototype
  )
    throw fail();
  const descriptors = Object.getOwnPropertyDescriptors(options.budget),
    names = ['logicalRpcCalls', 'httpStarts', 'responseBytes'] as const;
  if (
    Reflect.ownKeys(descriptors).length !== 3 ||
    !names.every(
      (k) =>
        descriptors[k] &&
        'value' in descriptors[k] &&
        descriptors[k].enumerable &&
        Number.isSafeInteger(descriptors[k].value) &&
        Number(descriptors[k].value) > 0
    )
  )
    throw fail();
  const budget = Object.freeze(Object.fromEntries(names.map((k) => [k, descriptors[k].value]))) as Readonly<
    GoalMetadataBatchOptions['budget']
  >;
  if (
    (options.policyVersion !== undefined && ![1, 2].includes(options.policyVersion)) ||
    budget.logicalRpcCalls > (options.policyVersion === 2 ? 440000 : 420000) ||
    budget.httpStarts > (options.policyVersion === 2 ? 440000 : 420000) ||
    budget.responseBytes > (options.policyVersion === 2 ? 10 : 4) * 1024 ** 3 ||
    (options.previousStartedAtMs !== undefined &&
      (!Number.isSafeInteger(options.previousStartedAtMs) || options.previousStartedAtMs < 0))
  )
    throw fail();
  const wire = options.fetch ?? globalThis.fetch,
    now = options.now ?? Date.now,
    sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const stats: GoalMetadataBatchStats = {
    logicalRpcCalls: 0,
    wireRpcCalls: 0,
    httpStarts: 0,
    responseBytes: 0,
    lastStartedAtMs: options.previousStartedAtMs ?? 0,
  };
  const queue: Pending[] = [];
  let active = false,
    scheduled = false,
    stopped = false;
  const lifetime = new AbortController();
  const idleWaiters: Array<() => void> = [];
  const notifyIdle = () => {
    if (!active && !scheduled && !queue.length) while (idleWaiters.length) idleWaiters.shift()!();
  };
  const stop = () => {
    stopped = true;
    lifetime.abort();
    while (queue.length) queue.shift()!.reject(fail());
  };
  options.signal?.addEventListener('abort', stop, { once: true });
  const schedule = () => {
    if (stopped || active || scheduled || !queue.length) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      void pump().finally(notifyIdle);
    }, 0);
  };
  const pump = async () => {
    if (stopped || active || !queue.length) return;
    active = true;
    const members = queue.splice(0, 32),
      unique = new Map<string, { id: number; method: string; params: unknown[]; members: Pending[] }>();
    for (const item of members) {
      const key = JSON.stringify([item.method, item.params]);
      let selected = unique.get(key);
      if (!selected) {
        selected = { id: unique.size + 1, method: item.method, params: item.params, members: [] };
        unique.set(key, selected);
      }
      selected.members.push(item);
    }
    const batch = [...unique.values()],
      request = batch.map(({ id, method, params }) => ({ jsonrpc: '2.0', id, method, params }));
    const index = stats.httpStarts;
    const evidence: Record<string, unknown> = {
      version: 1,
      index,
      request,
      mapping: batch.map((b) => ({
        wireId: b.id,
        requests: b.members.map((m) => ({ logicalRequestId: m.logicalRequestId, originalId: m.originalId })),
      })),
      complete: false,
    };
    let body: Uint8Array | undefined;
    try {
      if (options.signal?.aborted || stats.httpStarts >= budget.httpStarts) throw fail();
      const before = now();
      if (!Number.isSafeInteger(before) || before < stats.lastStartedAtMs) throw fail();
      await sleep(Math.max(0, stats.lastStartedAtMs + 125 - before));
      if (stopped) throw fail();
      const start = now();
      if (!Number.isSafeInteger(start) || start < before || start < stats.lastStartedAtMs + 125) throw fail();
      stats.lastStartedAtMs = start;
      stats.httpStarts++;
      stats.wireRpcCalls += batch.length;
      evidence.startedAtMs = start;
      const operationSignal = AbortSignal.any([lifetime.signal, AbortSignal.timeout(30000)]);
      const response = await abortable(
        wire(ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
          redirect: 'error',
          signal: operationSignal,
        }),
        operationSignal
      );
      evidence.httpStatus = response.status;
      if (!response.body) throw fail();
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let bytes = 0,
        reads = 0;
      try {
        for (;;) {
          if (++reads > 8 * 1024 * 1024 + 1) throw fail();
          const next = await abortable(reader.read(), operationSignal);
          if (next.done) break;
          bytes += next.value.length;
          stats.responseBytes += next.value.length;
          if (bytes > 8 * 1024 * 1024 || stats.responseBytes > budget.responseBytes) throw fail();
          chunks.push(next.value);
        }
      } catch (error) {
        void reader.cancel().catch(() => undefined);
        throw error;
      } finally {
        reader.releaseLock();
        body = Buffer.concat(chunks);
      }
      if (response.status !== 200) throw fail();
      const decoded = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
      if (!Array.isArray(decoded) || decoded.length !== batch.length) throw fail();
      const results = new Map<number, Record<string, unknown>>();
      for (const item of decoded) {
        if (
          !item ||
          Object.getPrototypeOf(item) !== Object.prototype ||
          item.jsonrpc !== '2.0' ||
          !Number.isSafeInteger(item.id) ||
          results.has(item.id) ||
          !batch.some((b) => b.id === item.id) ||
          Object.hasOwn(item, 'result') === Object.hasOwn(item, 'error')
        )
          throw fail();
        results.set(item.id, item);
      }
      const projections = batch.flatMap((group) =>
        group.members.map((item) => {
          const projected = JSON.stringify({ ...results.get(group.id), id: item.originalId });
          if (Buffer.byteLength(projected) > 2 * 1024 * 1024) throw fail();
          return { item, projected };
        })
      );
      const completed = now();
      if (!Number.isSafeInteger(completed) || completed < start) throw fail();
      evidence.complete = true;
      evidence.responseBody = Buffer.from(body).toString('utf8');
      evidence.responseSha256 = createHash('sha256').update(body).digest('hex');
      evidence.bytes = body.length;
      evidence.completedAtMs = completed;
      await options.sink(index, evidence);
      if (stopped) throw fail();
      for (const { item, projected } of projections)
        item.resolve(new Response(projected, { status: 200, headers: { 'content-type': 'application/json' } }));
    } catch {
      stop();
      for (const item of members) item.reject(fail());
      if (evidence.complete !== true) {
        evidence.failure = 'metadata-batch-unavailable';
        if (body) {
          evidence.responseBodyBase64 = Buffer.from(body).toString('base64');
          evidence.bytes = body.length;
          evidence.responseSha256 = createHash('sha256').update(body).digest('hex');
        }
        await options.sink(index, evidence).catch(() => undefined);
      }
    } finally {
      active = false;
      schedule();
    }
  };
  const transport: typeof fetch = async (url, init) => {
    if (
      stopped ||
      options.signal?.aborted ||
      String(url) !== ENDPOINT ||
      init?.method !== 'POST' ||
      typeof init.body !== 'string' ||
      init.body.length > 4096
    ) {
      stop();
      throw fail();
    }
    let input;
    try {
      input = JSON.parse(init.body);
    } catch {
      stop();
      throw fail();
    }
    if (!input || Object.getPrototypeOf(input) !== Object.prototype) {
      stop();
      throw fail();
    }
    const { method, params, id } = input;
    const hash = (v: unknown) => typeof v === 'string' && /^0x[0-9a-f]{64}$/.test(v);
    const allowed =
      method === 'chain_getFinalizedHead'
        ? params?.length === 0
        : method === 'chain_getBlockHash'
          ? params?.length === 1 && Number.isSafeInteger(params[0]) && params[0] >= 0 && params[0] <= 0xffffffff
          : ['chain_getHeader', 'state_getRuntimeVersion', 'state_getMetadata'].includes(method)
            ? params?.length === 1 && hash(params[0])
            : ['state_getStorage', 'state_getStorageHash'].includes(method)
              ? params?.length === 2 && params[0] === (method === 'state_getStorage' ? TIME : CODE) && hash(params[1])
              : false;
    if (
      input.jsonrpc !== '2.0' ||
      !Number.isSafeInteger(id) ||
      !Array.isArray(params) ||
      !allowed ||
      ++stats.logicalRpcCalls > budget.logicalRpcCalls ||
      queue.length >= 32
    ) {
      stop();
      throw fail();
    }
    const logicalRequestId = stats.logicalRpcCalls;
    if (init.signal?.aborted) {
      stop();
      throw fail();
    }
    return new Promise<Response>((resolve, reject) => {
      const abort = () => {
        stop();
        reject(fail());
      };
      init.signal?.addEventListener('abort', abort, { once: true });
      queue.push({
        originalId: id,
        logicalRequestId,
        method,
        params: structuredClone(params),
        resolve: (r) => {
          init.signal?.removeEventListener('abort', abort);
          resolve(r);
        },
        reject: (e) => {
          init.signal?.removeEventListener('abort', abort);
          reject(e);
        },
      });
      schedule();
    });
  };
  return Object.freeze({
    fetch: transport,
    stats: () => Object.freeze({ ...stats }),
    drain: () =>
      !active && !scheduled && !queue.length
        ? Promise.resolve()
        : new Promise<void>((resolve) => idleWaiters.push(resolve)),
    close: () => {
      stop();
      options.signal?.removeEventListener('abort', stop);
      notifyIdle();
    },
  });
}
