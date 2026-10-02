// @vitest-environment node
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acquireGoalTargetRuntimeState,
  type GoalTargetStateAcquisition,
  type GoalTargetStateRpcReceipt,
} from '../../../../scripts/bots/goal-target-runtime-transport';

const START = Date.UTC(2026, 8, 21);
const BLOCK = `0x${'ab'.repeat(32)}`;
const PREFIX = `0x${'20'.repeat(32)}`;
const POINT = `0x${'10'.repeat(32)}`;
const NEXT = `0x${'30'.repeat(32)}`;
const key = (index: number) => `${PREFIX}${index.toString(16).padStart(8, '0')}`;
const point = (index: number) => `${POINT}${index.toString(16).padStart(8, '0')}`;
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
type Rpc = { jsonrpc: '2.0'; id: number; method: string; params: (string | number | null)[] };
type Reply = unknown | ((request: Rpc) => unknown | Promise<unknown>);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => (resolve = complete));
  return { promise, resolve };
}

async function flush() {
  for (let index = 0; index < 30; index++) await Promise.resolve();
}

function fixture(replies: Reply[] = ['0x01', [], []], overrides: Partial<GoalTargetStateAcquisition> = {}) {
  const controller = new AbortController();
  const records: Readonly<GoalTargetStateRpcReceipt>[] = [];
  const events: string[] = [];
  const requests: Rpc[] = [];
  const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const request = JSON.parse(init!.body as string) as Rpc;
    events.push(`fetch:${request.id}`);
    requests.push(request);
    if (!replies.length) throw new Error('fixture:missing-response');
    let result = replies.shift();
    if (typeof result === 'function') result = await result(request);
    if (result instanceof Error) throw result;
    if (result instanceof Response) return result;
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }));
  });
  const retain = vi.fn(async (receipt: Readonly<GoalTargetStateRpcReceipt>) => {
    events.push(`retain:${receipt.id}`);
    records.push(receipt);
  });
  const input: GoalTargetStateAcquisition = {
    blockHash: BLOCK,
    pointKeys: [POINT],
    prefix: PREFIX,
    fetch: fetcher as typeof fetch,
    retain,
    signal: controller.signal,
    ...overrides,
  };
  return {
    input,
    requests,
    fetcher,
    retain,
    records,
    events,
    controller,
    run: () => acquireGoalTargetRuntimeState(input),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('target runtime raw state transport', () => {
  it('retains complete point/null state, every prefix page/value and the genuine global successor', async () => {
    const f = fixture([null, '0x', [key(1), key(2)], [], '0x0102', '0x03', [NEXT]], {
      pointKeys: [POINT, point(2)],
    });
    const result = await f.run();
    expect(f.requests.map(({ method, params }) => ({ method, params }))).toEqual([
      { method: 'state_getStorage', params: [POINT, BLOCK] },
      { method: 'state_getStorage', params: [point(2), BLOCK] },
      { method: 'state_getKeysPaged', params: [PREFIX, 64, null, BLOCK] },
      { method: 'state_getKeysPaged', params: [PREFIX, 64, key(2), BLOCK] },
      { method: 'state_getStorage', params: [key(1), BLOCK] },
      { method: 'state_getStorage', params: [key(2), BLOCK] },
      { method: 'state_getKeysPaged', params: [null, 1, key(2), BLOCK] },
    ]);
    expect(f.events).toEqual(f.requests.flatMap(({ id }) => [`fetch:${id}`, `retain:${id}`]));
    expect(result).toMatchObject({
      blockHash: BLOCK,
      prefix: PREFIX,
      requests: 7,
      retries: 0,
      financialActions: false,
    });
    expect(result.receipts).toEqual(f.records);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.receipts)).toBe(true);
    expect(result.responseBytes).toBe(
      f.records.reduce((sum, record) => sum + Buffer.byteLength(record.responseBody), 0)
    );
    for (const [index, receipt] of f.records.entries()) {
      const [, init] = f.fetcher.mock.calls[index];
      expect(f.fetcher.mock.calls[index][0]).toBe('https://mof2.sora.org/');
      expect(init).toMatchObject({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'omit',
        redirect: 'error',
        body: JSON.stringify(f.requests[index]),
      });
      expect(receipt).toEqual({
        id: index + 1,
        method: f.requests[index].method,
        params: f.requests[index].params,
        requestBody: init!.body,
        requestedAt: new Date(START).toISOString(),
        completedAt: new Date(START).toISOString(),
        httpStatus: 200,
        responseBody: receipt.responseBody,
        responseSha256: hash(receipt.responseBody),
      });
      expect(Object.isFrozen(receipt)).toBe(true);
      expect(Object.isFrozen(receipt.params)).toBe(true);
    }
  });

  it.each([{ successor: [] }, { successor: [NEXT] }])(
    'allows an empty prefix and retains its global successor $successor',
    async ({ successor }) => {
      const f = fixture(['0x01', [], successor]);
      await expect(f.run()).resolves.toMatchObject({ requests: 3 });
      expect(f.requests.at(-1)?.params).toEqual([null, 1, PREFIX, BLOCK]);
    }
  );

  it('waits for durable receipt retention before issuing the next request or returning completion', async () => {
    const gate = deferred<void>();
    const f = fixture();
    f.input.retain = vi.fn(async (receipt) => {
      f.records.push(receipt);
      if (receipt.id === 1) await gate.promise;
    });
    const pending = f.run();
    await flush();
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(f.records).toHaveLength(1);
    gate.resolve();
    await expect(pending).resolves.toMatchObject({ requests: 3 });
    expect(f.records).toHaveLength(3);
  });

  it('halts when retention fails, without returning claims or sending another request', async () => {
    const f = fixture();
    f.input.retain = vi.fn(async () => {
      throw new Error('journal unavailable');
    });
    await expect(f.run()).rejects.toThrow('journal unavailable');
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not resolve the acquisition until its final global successor receipt is retained', async () => {
    const gate = deferred<void>();
    const f = fixture();
    f.input.retain = vi.fn(async (receipt) => {
      if (receipt.id === 3) await gate.promise;
      f.records.push(receipt);
    });
    let complete = false;
    const pending = f.run().then((value) => {
      complete = true;
      return value;
    });
    await flush();
    expect(f.fetcher).toHaveBeenCalledTimes(3);
    expect(f.records).toHaveLength(2);
    expect(complete).toBe(false);
    gate.resolve();
    await expect(pending).resolves.toMatchObject({ requests: 3 });
    expect(f.records).toHaveLength(3);
  });

  it('uses actual pages of 64, admits exactly 256 prefix keys and requires a fifth empty page', async () => {
    const keys = Array.from({ length: 256 }, (_, i) => key(i + 1));
    const points = Array.from({ length: 7 }, (_, i) => point(i));
    const f = fixture(
      [
        ...points.map(() => null),
        ...Array.from({ length: 4 }, (_, i) => keys.slice(i * 64, (i + 1) * 64)),
        [],
        ...keys.map(() => '0xff'),
        [NEXT],
      ],
      { pointKeys: points }
    );
    const result = await f.run();
    expect(result.requests).toBe(269);
    expect(f.requests.filter((request) => request.params[0] === PREFIX).map((request) => request.params)).toEqual([
      [PREFIX, 64, null, BLOCK],
      [PREFIX, 64, key(64), BLOCK],
      [PREFIX, 64, key(128), BLOCK],
      [PREFIX, 64, key(192), BLOCK],
      [PREFIX, 64, key(256), BLOCK],
    ]);
    expect(f.records).toHaveLength(269);
  });

  it.each([
    ['duplicate in page', [[key(1), key(1)]], 'page-order'],
    ['out of prefix', [[NEXT]], 'page-order'],
    ['nonadvancing next page', [[key(1)], [key(1)]], 'page-order'],
    ['descending', [[key(2), key(1)]], 'page-order'],
    ['prefix itself', [[PREFIX]], 'page-order'],
    ['malformed key', [['0x01']], 'page-order'],
    ['non-array page', [null], 'page'],
    ['page over 64', [Array.from({ length: 65 }, (_, i) => key(i + 1))], 'page'],
  ] as const)('rejects %s after retaining the offending raw response', async (_label, pages, reason) => {
    const f = fixture(['0x01', ...pages]);
    await expect(f.run()).rejects.toThrow(`target-state:${reason}`);
    expect(f.records).toHaveLength(f.fetcher.mock.calls.length);
    expect(f.records.at(-1)?.failure).toBeUndefined();
    expect(f.requests.slice(1).every((request) => request.method === 'state_getKeysPaged')).toBe(true);
  });

  it('rejects the 257th prefix key and retains its raw fifth page', async () => {
    const keys = Array.from({ length: 257 }, (_, i) => key(i + 1));
    const f = fixture(['0x01', ...Array.from({ length: 5 }, (_, i) => keys.slice(i * 64, (i + 1) * 64))]);
    await expect(f.run()).rejects.toThrow('target-state:prefix-limit');
    expect(f.records).toHaveLength(6);
  });

  it('rejects a fifth nonempty short page instead of omitting the required trailing empty page', async () => {
    const f = fixture(['0x01', ...Array.from({ length: 5 }, (_, i) => [key(i + 1)])]);
    await expect(f.run()).rejects.toThrow('target-state:page-limit');
    expect(f.records).toHaveLength(6);
    expect(f.fetcher).toHaveBeenCalledTimes(6);
  });

  it('does not infer completion from a short page when the trailing empty response is unavailable', async () => {
    const f = fixture(['0x01', [key(1)]]);
    await expect(f.run()).rejects.toThrow('target-state:invalid-response');
    expect(f.records).toHaveLength(3);
    expect(f.records[2]).toMatchObject({
      method: 'state_getKeysPaged',
      params: [PREFIX, 64, key(1), BLOCK],
      failure: 'target-state:invalid-response',
    });
  });

  it.each([null, 'bad', '0xa', '0xAA', 2])('rejects missing/malformed prefix storage %j', async (value) => {
    const f = fixture(['0x01', [key(1)], [], value]);
    await expect(f.run()).rejects.toThrow('target-state:prefix-value');
    expect(f.records).toHaveLength(4);
  });

  it.each(['bad', '0xa', '0xAA', 2, {}])('rejects malformed point storage %j', async (value) => {
    const f = fixture([value]);
    await expect(f.run()).rejects.toThrow('target-state:storage-value');
    expect(f.records).toHaveLength(1);
  });

  it.each([[key(2)], [key(1)], [POINT], [NEXT, `${NEXT}01`], ['0x01'], null].map((after) => ({ after })))(
    'rejects invalid global successor $after',
    async ({ after }) => {
      const f = fixture(['0x01', [key(1)], [], '0x02', after]);
      await expect(f.run()).rejects.toThrow('target-state:global-successor');
      expect(f.records).toHaveLength(5);
    }
  );

  it.each([
    ['HTTP failure', () => new Response('upstream unavailable', { status: 502 }), 'http'],
    [
      'JSON-RPC error',
      ({ id }: Rpc) =>
        new Response(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32000, message: 'missing state' } })),
      'rpc',
    ],
    ['wrong request id', () => new Response('{"jsonrpc":"2.0","id":99,"result":"0x01"}'), 'rpc'],
    ['wrong protocol', () => new Response('{"jsonrpc":"1.0","id":1,"result":"0x01"}'), 'rpc'],
    ['omitted result', () => new Response('{"jsonrpc":"2.0","id":1}'), 'rpc'],
    ['malformed JSON', () => new Response('{'), 'invalid-response'],
    ['fetch failure', () => new Error('connection failed'), 'invalid-response'],
  ] as const)('retains %s exactly and never retries', async (_label, reply, reason) => {
    const f = fixture([reply]);
    await expect(f.run()).rejects.toThrow(`target-state:${reason}`);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(f.records).toHaveLength(1);
    const receipt = f.records[0];
    expect(receipt.failure).toBe(`target-state:${reason}`);
    expect(Buffer.from(receipt.responseBodyBase64!, 'base64').toString('utf8')).toBe(receipt.responseBody);
    expect(receipt.responseSha256).toBe(hash(Buffer.from(receipt.responseBodyBase64!, 'base64')));
    expect(receipt.receivedBytes).toBe(Buffer.byteLength(receipt.responseBody));
  });

  it('preserves invalid UTF-8 as exact original bytes without replacement text', async () => {
    const bytes = Uint8Array.of(0xff, 0xfe, 0x61);
    const f = fixture([new Response(bytes)]);
    await expect(f.run()).rejects.toThrow('target-state:invalid-response');
    expect(f.records[0]).toMatchObject({
      responseBody: '',
      responseBodyBase64: Buffer.from(bytes).toString('base64'),
      responseSha256: hash(bytes),
      responseComplete: true,
      receivedBytes: 3,
    });
  });

  it.each([
    { redirected: true, url: 'https://mof2.sora.org/' },
    { redirected: false, url: 'https://example.test/' },
  ])('refuses a redirected or foreign response $url before accepting its body', async ({ redirected, url }) => {
    const response = new Response('{"jsonrpc":"2.0","id":1,"result":"0x01"}');
    Object.defineProperties(response, { redirected: { value: redirected }, url: { value: url } });
    const f = fixture([response]);
    await expect(f.run()).rejects.toThrow('target-state:response');
    expect(f.records[0]).toMatchObject({ failure: 'target-state:response', responseComplete: false, receivedBytes: 0 });
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });

  it('retains partial original bytes when the response stream fails, without treating them as complete', async () => {
    const bytes = new TextEncoder().encode('{"jsonrpc":');
    let pull = 0;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        pull(controller) {
          if (pull++ === 0) controller.enqueue(bytes);
          else controller.error(new Error('stream disconnected'));
        },
      })
    );
    const f = fixture([response]);
    await expect(f.run()).rejects.toThrow('target-state:invalid-response');
    expect(f.records[0]).toMatchObject({
      responseBodyBase64: Buffer.from(bytes).toString('base64'),
      responseSha256: hash(bytes),
      responseComplete: false,
      receivedBytes: bytes.length,
    });
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });

  it('retains only a bounded original prefix when a body crosses the per-response byte cap', async () => {
    const bytes = new Uint8Array(256 * 1024 + 1).fill(97);
    const f = fixture([new Response(bytes)]);
    await expect(f.run()).rejects.toThrow('target-state:response-limit');
    const receipt = f.records[0];
    expect(receipt.receivedBytes).toBe(bytes.length);
    expect(receipt.responseComplete).toBe(false);
    expect(Buffer.from(receipt.responseBodyBase64!, 'base64')).toEqual(Buffer.from(bytes.slice(0, 256 * 1024)));
    expect(receipt.responseSha256).toBe(hash(bytes.slice(0, 256 * 1024)));
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });

  it('enforces the aggregate response byte cap across otherwise valid storage reads', async () => {
    const keys = Array.from({ length: 64 }, (_, index) => key(index + 1));
    const largeValue = `0x${'aa'.repeat(125000)}`;
    const f = fixture(['0x01', keys, [], ...keys.map(() => largeValue), []]);
    await expect(f.run()).rejects.toThrow('target-state:response-limit');
    expect(f.records.length).toBeGreaterThan(30);
    expect(f.records.length).toBeLessThan(64);
    expect(f.records.at(-1)?.responseComplete).toBe(false);
    const retained = f.records.reduce(
      (sum, receipt) =>
        sum +
        (receipt.responseBodyBase64
          ? Buffer.from(receipt.responseBodyBase64, 'base64').length
          : Buffer.byteLength(receipt.responseBody)),
      0
    );
    expect(retained).toBe(8 * 1024 * 1024);
  });

  it('refuses already-aborted input before any request', async () => {
    const f = fixture();
    f.controller.abort();
    await expect(f.run()).rejects.toThrow('target-state:aborted');
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.retain).not.toHaveBeenCalled();
  });

  it.each(['abort', 'timeout'] as const)(
    'bounds a fetch ignoring %s, retains its failed attempt and never continues',
    async (mode) => {
      const gate = deferred<Response>();
      const f = fixture([() => gate.promise], { timeoutMs: 100 });
      const pending = f.run();
      const rejected = expect(pending).rejects.toThrow('target-state:aborted-or-timeout');
      if (mode === 'abort') f.controller.abort();
      else await vi.advanceTimersByTimeAsync(100);
      await rejected;
      expect(f.records).toHaveLength(1);
      expect(f.records[0]).toMatchObject({
        httpStatus: null,
        failure: 'target-state:aborted-or-timeout',
        responseComplete: false,
        receivedBytes: 0,
      });
      gate.resolve(new Response('{"jsonrpc":"2.0","id":1,"result":"0x01"}'));
      await flush();
      expect(f.fetcher).toHaveBeenCalledTimes(1);
      expect(f.records).toHaveLength(1);
    }
  );

  it.each(['fetch', 'chunk', 'EOF'] as const)(
    'enforces the absolute request deadline after awaited %s even with delayed timers',
    async (stage) => {
      const gate = deferred<Response>();
      let streamController!: ReadableStreamDefaultController<Uint8Array>;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller;
        },
      });
      const f = fixture(stage === 'fetch' ? [() => gate.promise] : [new Response(stream)], { timeoutMs: 100 });
      const pending = f.run();
      await flush();
      if (stage === 'EOF') {
        streamController.enqueue(new TextEncoder().encode('{"jsonrpc":"2.0","id":1,"result":"0x01"}'));
        await flush();
      }
      vi.setSystemTime(START + 101);
      if (stage === 'fetch') gate.resolve(new Response('{"jsonrpc":"2.0","id":1,"result":"0x01"}'));
      else if (stage === 'chunk') streamController.enqueue(new TextEncoder().encode('late'));
      else streamController.close();
      await expect(pending).rejects.toThrow('target-state:aborted-or-timeout');
      expect(f.records).toHaveLength(1);
      expect(f.fetcher).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['abort', 'timeout'] as const)('bounds a successful response whose journal ignores %s', async (mode) => {
    const gate = deferred<void>();
    const f = fixture();
    f.input.retain = vi.fn(() => gate.promise);
    const pending = f.run();
    await flush();
    expect(f.input.retain).toHaveBeenCalledTimes(1);
    const rejected = expect(pending).rejects.toThrow('target-state:retention-cancelled');
    if (mode === 'abort') f.controller.abort();
    else await vi.advanceTimersByTimeAsync(5000);
    await rejected;
    gate.resolve();
    await flush();
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });

  it('allows bounded failure journaling after abort but never waits forever', async () => {
    const gate = deferred<void>();
    const f = fixture([() => new Promise<Response>(() => undefined)]);
    f.input.retain = vi.fn(() => gate.promise);
    const pending = f.run();
    f.controller.abort();
    await flush();
    expect(f.input.retain).toHaveBeenCalledTimes(1);
    const rejected = expect(pending).rejects.toThrow('target-state:retention-cancelled');
    await vi.advanceTimersByTimeAsync(5000);
    await rejected;
    gate.resolve();
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });

  it('checks an absolute retention deadline when timer delivery is delayed', async () => {
    const gate = deferred<void>();
    const f = fixture();
    f.input.retain = vi.fn(() => gate.promise);
    const pending = f.run();
    await flush();
    vi.setSystemTime(START + 5001);
    gate.resolve();
    await expect(pending).rejects.toThrow('target-state:retention-timeout');
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });

  it('enforces the ten-minute operation deadline across individually bounded requests', async () => {
    const keys = Array.from({ length: 64 }, (_, index) => key(index + 1));
    const replies = ['0x01', keys, [], ...keys.map(() => '0x02'), []].map((result) => (request: Rpc) => {
      vi.setSystemTime(Date.now() + 19999);
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }));
    });
    const f = fixture(replies);
    await expect(f.run()).rejects.toThrow('target-state:aborted-or-timeout');
    expect(f.fetcher).toHaveBeenCalledTimes(31);
    expect(f.records).toHaveLength(31);
  });

  it('snapshots keys, block, prefix and dependencies before caller mutation', async () => {
    const gate = deferred<Response>();
    const keys = [POINT];
    const f = fixture([() => gate.promise, [key(1)], [], '0x02', [NEXT]], { pointKeys: keys });
    const pending = f.run();
    keys[0] = NEXT;
    f.input.blockHash = `0x${'ff'.repeat(32)}`;
    f.input.prefix = NEXT;
    f.input.fetch = vi.fn() as unknown as typeof fetch;
    f.input.retain = vi.fn();
    gate.resolve(new Response('{"jsonrpc":"2.0","id":1,"result":"0x01"}'));
    await expect(pending).resolves.toMatchObject({ blockHash: BLOCK, prefix: PREFIX, requests: 5 });
    expect(f.requests[0].params).toEqual([POINT, BLOCK]);
    expect(f.requests.every((request) => request.params.at(-1) === BLOCK)).toBe(true);
    expect(f.records).toHaveLength(5);
    expect(f.input.fetch).not.toHaveBeenCalled();
    expect(f.input.retain).not.toHaveBeenCalled();
  });

  it.each(['blockHash', 'prefix', 'pointKeys', 'fetch', 'retain'] as const)(
    'rejects an input accessor for %s without invoking it',
    async (field) => {
      const f = fixture();
      const getter = vi.fn();
      Object.defineProperty(f.input, field, { enumerable: true, get: getter });
      await expect(f.run()).rejects.toThrow('target-state:input');
      expect(getter).not.toHaveBeenCalled();
      expect(f.fetcher).not.toHaveBeenCalled();
    }
  );

  it.each(['blockHash', 'prefix'] as const)('rejects non-string %s without coercion', async (field) => {
    const f = fixture();
    const coercion = vi.fn(() => BLOCK);
    Reflect.set(f.input, field, { toString: coercion, [Symbol.toPrimitive]: coercion });
    await expect(f.run()).rejects.toThrow('target-state:identity');
    expect(coercion).not.toHaveBeenCalled();
    expect(f.fetcher).not.toHaveBeenCalled();
  });

  it('rejects a key accessor without invoking it', async () => {
    const f = fixture();
    const getter = vi.fn(() => POINT);
    const keys = [POINT];
    Object.defineProperty(keys, '0', { enumerable: true, get: getter });
    f.input.pointKeys = keys;
    await expect(f.run()).rejects.toThrow('target-state:keys');
    expect(getter).not.toHaveBeenCalled();
    expect(f.fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ['empty keys', { pointKeys: [] }, 'keys'],
    ['eight point keys', { pointKeys: Array.from({ length: 8 }, (_, i) => point(i)) }, 'keys'],
    ['duplicate keys', { pointKeys: [POINT, POINT] }, 'keys'],
    ['prefix overlaps point', { pointKeys: [key(1)] }, 'keys'],
    ['short key', { pointKeys: ['0x01'] }, 'keys'],
    ['uppercase block', { blockHash: BLOCK.toUpperCase() }, 'identity'],
    ['endpoint override', { endpoint: 'https://example.test/' }, 'input'],
    ['invalid signal', { signal: {} }, 'signal'],
    ['zero timeout', { timeoutMs: 0 }, 'timeout'],
    ['too large timeout', { timeoutMs: 30001 }, 'timeout'],
    ['fractional timeout', { timeoutMs: 0.5 }, 'timeout'],
    ['missing fetch', { fetch: undefined }, 'dependencies'],
    ['missing retain', { retain: undefined }, 'dependencies'],
  ] as const)('rejects %s before network or retention', async (_label, change, reason) => {
    const f = fixture();
    Object.assign(f.input, change);
    await expect(f.run()).rejects.toThrow(`target-state:${reason}`);
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.retain).not.toHaveBeenCalled();
  });
});
