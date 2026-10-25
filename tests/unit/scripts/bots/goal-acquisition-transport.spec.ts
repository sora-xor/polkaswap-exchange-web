// @vitest-environment node
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGoalAcquisitionTransport,
  goalAcquisitionRequestSha256,
  GOAL_ACQUISITION_RETRY_POLICY,
  type GoalAcquisitionAttempt,
  type GoalAcquisitionTransportOptions,
} from '../../../../scripts/bots/goal-acquisition-transport';

const START = Date.UTC(2026, 8, 21),
  URL = 'https://pi.soramitsu.io/graphql';
const QUERY =
  'query GoalQualificationPoolHistory($filter:AssetSnapshotFilter!,$after:Cursor){assetSnapshots(first:100,after:$after,orderBy:[TIMESTAMP_ASC],filter:$filter){pageInfo{hasNextPage endCursor}edges{node{id assetId type timestamp denominator closeEvidence}}}}';
const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
function request(after: string | null = null): RequestInit {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cache-control': 'no-cache' },
    redirect: 'error',
    credentials: 'omit',
    body: JSON.stringify({
      query: QUERY,
      variables: {
        filter: {
          assetId: { equalTo: '0x02000c0000000000000000000000000000000000000000000000000000000000' },
          type: { equalTo: 'HOUR' },
          timestamp: { greaterThanOrEqualTo: START / 1000 - 7200, lessThan: START / 1000 },
        },
        after,
      },
    }),
  };
}
function fixture(
  replies: Array<Response | Error> = [new Response('{"data":{}}')],
  change: Partial<GoalAcquisitionTransportOptions> = {}
) {
  const controller = new AbortController(),
    records: Readonly<GoalAcquisitionAttempt>[] = [];
  const beforeAttempt = vi.fn(() => undefined);
  const consumeResponseBytes = vi.fn((_bytes: number) => undefined);
  const fetcher = vi.fn(async () => {
    const next = replies.shift();
    if (next instanceof Error) throw next;
    return next!;
  });
  const retainAttempt = vi.fn(async (value: Readonly<GoalAcquisitionAttempt>) => {
    records.push(value);
    const raw = canonical(value);
    return { sha256: hash(raw), bytes: Buffer.byteLength(raw) };
  });
  const options: GoalAcquisitionTransportOptions = {
    operationId: 'continuation-history-1',
    fetch: fetcher as typeof fetch,
    signal: controller.signal,
    operationDeadlineAtMs: START + 20000,
    maximumResponseBytes: 4096,
    budget: { beforeAttempt, consumeResponseBytes },
    retainAttempt,
    ...change,
  };
  const transport = createGoalAcquisitionTransport(options);
  return {
    transport,
    options,
    fetcher,
    records,
    beforeAttempt,
    consumeResponseBytes,
    retainAttempt,
    controller,
    run: (init = request()) => transport.fetch(URL, init),
  };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('recorded indexer acquisition transport', () => {
  it('retains the error before retry, preserving exact body/cursor and snapshots despite caller mutation', async () => {
    const f = fixture([new Response('upstream unavailable', { status: 502 }), new Response('{"data":{}}')]);
    const init = request('opaque-cursor'),
      original = init.body;
    const promise = f.run(init);
    init.body = 'mutation { changed }';
    (init.headers as Record<string, string>)['cache-control'] = 'changed';
    await vi.advanceTimersByTimeAsync(0);
    expect(f.records).toHaveLength(1);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(f.records[0]).toMatchObject({
      attemptIndex: 1,
      requestIndex: 1,
      requestedAtMs: START,
      completedAtMs: START,
      outcome: 'response',
      response: { status: 502, complete: true, bytesRead: 20, retainedBytes: 20 },
    });
    expect(Buffer.from(f.records[0].response!.bodyBase64, 'base64').toString()).toBe('upstream unavailable');
    await vi.advanceTimersByTimeAsync(1000);
    expect(await (await promise).text()).toBe('{"data":{}}');
    expect(f.records).toHaveLength(2);
    for (const [url, sent] of f.fetcher.mock.calls as unknown as [string, RequestInit][]) {
      expect(url).toBe(URL);
      expect(sent.body).toBe(original);
      expect(sent.headers).toEqual({ 'content-type': 'application/json', 'cache-control': 'no-cache' });
    }
    expect(f.beforeAttempt).toHaveBeenCalledTimes(2);
    expect(f.consumeResponseBytes.mock.calls.reduce((n, [bytes]) => n + bytes, 0)).toBe(31);
    expect(f.records[0].requestSha256).toBe(f.records[1].requestSha256);
    expect(Object.isFrozen(f.records[0].request.headers)).toBe(true);
  });
  it('makes at most three physical attempts with fixed1s/3s delays and returns the final retained HTTP failure', async () => {
    const f = fixture([502, 503, 504].map((status) => new Response('unavailable', { status })));
    const pending = f.run();
    await vi.advanceTimersByTimeAsync(4000);
    expect((await pending).status).toBe(504);
    expect(f.fetcher).toHaveBeenCalledTimes(3);
    expect(f.records.map((r) => r.requestedAtMs)).toEqual([START, START + 1000, START + 4000]);
    expect(f.records.map((r) => r.response!.status)).toEqual([502, 503, 504]);
    expect(f.records[0].policySha256).toBe(hash(canonical(GOAL_ACQUISITION_RETRY_POLICY)));
    expect(f.records.every((r) => r.operationDeadlineAtMs === START + 20000)).toBe(true);
  });
  it('carries the original failure into the fixed total cap, with only two new physical starts', async () => {
    const carriedAttempt = { requestSha256: goalAcquisitionRequestSha256(URL, request()), attempts: 1 as const };
    const f = fixture([new Response('bad', { status: 502 }), new Response('bad', { status: 503 })], { carriedAttempt });
    carriedAttempt.requestSha256 = '0'.repeat(64); // The declared binding was detached at construction.
    const pending = f.run();
    await vi.advanceTimersByTimeAsync(999);
    expect(f.fetcher).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3001);
    expect((await pending).status).toBe(503);
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    expect(f.records.map((r) => [r.attemptIndex, r.carriedAttempts, r.requestedAtMs])).toEqual([
      [2, 1, START + 1000],
      [3, 1, START + 4000],
    ]);
    await expect(f.run()).rejects.toMatchObject({ reason: 'request-limit' });
    expect(f.fetcher).toHaveBeenCalledTimes(2);
  });
  it('a second carried failure uses only the third attempt and its3s backoff', async () => {
    const f = fixture([new Response('{}')], {
      carriedAttempt: { requestSha256: goalAcquisitionRequestSha256(URL, request()), attempts: 2 },
    });
    const pending = f.run();
    await vi.advanceTimersByTimeAsync(2999);
    expect(f.fetcher).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending).status).toBe(200);
    expect(f.records[0]).toMatchObject({ carriedAttempts: 2, attemptIndex: 3, requestedAtMs: START + 3000 });
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('a carried digest never changes another exact request or cursor’s attempt allowance', async () => {
    const f = fixture(
      [new Response('bad', { status: 502 }), new Response('bad', { status: 503 }), new Response('{}')],
      {
        carriedAttempt: { requestSha256: goalAcquisitionRequestSha256(URL, request('original')), attempts: 2 },
      }
    );
    expect(goalAcquisitionRequestSha256(URL, request())).not.toBe(
      goalAcquisitionRequestSha256(URL, request('original'))
    );
    const pending = f.run();
    await vi.advanceTimersByTimeAsync(4000);
    await pending;
    expect(f.records.map((r) => [r.attemptIndex, r.carriedAttempts])).toEqual([
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
    expect(f.fetcher).toHaveBeenCalledTimes(3);
  });
  it.each([
    { requestSha256: 'bad', attempts: 1 },
    { requestSha256: '0'.repeat(64), attempts: 0 },
    { requestSha256: '0'.repeat(64), attempts: 3 },
  ])('rejects malformed carried failures: %j', (carriedAttempt) => {
    const f = fixture();
    expect(() =>
      createGoalAcquisitionTransport({ ...f.options, carriedAttempt } as GoalAcquisitionTransportOptions)
    ).toThrow();
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it.each([400, 401, 404, 429, 500])('does not retry HTTP%s', async (status) => {
    const f = fixture([new Response('error', { status })]);
    expect((await f.run()).status).toBe(status);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(f.records).toHaveLength(1);
  });
  it.each(['not JSON', '{"errors":[{"message":"invalid history"}]}'])(
    'passes HTTP200 unchanged for the actual reader to reject: %s',
    async (body) => {
      const f = fixture([new Response(body)]);
      expect(await (await f.run()).text()).toBe(body);
      expect(f.fetcher).toHaveBeenCalledTimes(1);
      expect(f.records[0].outcome).toBe('response');
    }
  );
  it('retains a network exception without leaking its message or retrying', async () => {
    const f = fixture([new Error('private provider error')]);
    await expect(f.run()).rejects.toMatchObject({ reason: 'network-failed' });
    expect(f.records[0]).toMatchObject({ outcome: 'network-failed', response: null });
    expect(JSON.stringify(f.records)).not.toContain('private provider');
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('retains exact binary error bytes and digest', async () => {
    const bytes = new Uint8Array([0xff, 0x00, 0xf0, 0x81]);
    const f = fixture([new Response(bytes, { status: 500 })]);
    expect(new Uint8Array(await (await f.run()).arrayBuffer())).toEqual(bytes);
    expect(f.records[0].response).toMatchObject({
      bodyBase64: Buffer.from(bytes).toString('base64'),
      bodySha256: hash(bytes),
      complete: true,
      bytesRead: 4,
    });
  });
  it('retains the partial prefix and counts the whole observed chunk on response overflow; never retries', async () => {
    const f = fixture([new Response('abcdef', { status: 502 })], { maximumResponseBytes: 3 });
    await expect(f.run()).rejects.toMatchObject({ reason: 'response-limit' });
    expect(f.records[0]).toMatchObject({
      outcome: 'response-limit',
      response: { complete: false, bytesRead: 6, retainedBytes: 3 },
    });
    expect(f.records[0].response!.bodyBase64).toBe(Buffer.from('abc').toString('base64'));
    expect(f.consumeResponseBytes).toHaveBeenCalledWith(6);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('bounds empty body chunks even when the stream never completes', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      pull(c) {
        c.enqueue(new Uint8Array());
      },
      cancel,
    });
    const f = fixture([new Response(stream, { status: 503 })], { maximumResponseBytes: 1 });
    await expect(f.run()).rejects.toMatchObject({ reason: 'response-limit' });
    expect(f.records[0]).toMatchObject({ outcome: 'response-limit', response: { complete: false, bytesRead: 0 } });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('retains a body-stream failure after already charged bytes without retry', async () => {
    let reads = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(c) {
        if (!reads++) c.enqueue(new Uint8Array([1, 2]));
        else c.error(Error('broken'));
      },
    });
    const f = fixture([new Response(stream, { status: 503 })]);
    await expect(f.run()).rejects.toMatchObject({ reason: 'body-failed' });
    expect(f.records[0]).toMatchObject({
      outcome: 'body-failed',
      response: { bytesRead: 2, retainedBytes: 2, complete: false },
    });
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('charges shared physical budget before every start and blocks the next network call on exhaustion', async () => {
    const beforeAttempt = vi.fn((context) => {
      if (context.attemptIndex === 2) throw Error('limit');
    });
    const f = fixture([new Response('bad', { status: 502 })], {
      budget: { beforeAttempt, consumeResponseBytes: () => undefined },
    });
    const failed = expect(f.run()).rejects.toMatchObject({ reason: 'budget-failed' });
    await vi.advanceTimersByTimeAsync(1000);
    await failed;
    expect(beforeAttempt).toHaveBeenCalledTimes(2);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(f.records).toHaveLength(1);
  });
  it('retains an observed response-byte budget failure without continuing or retrying', async () => {
    const f = fixture([new Response('bad', { status: 504 })], {
      budget: {
        beforeAttempt: () => undefined,
        consumeResponseBytes: () => {
          throw Error('aggregate exhausted');
        },
      },
    });
    await expect(f.run()).rejects.toMatchObject({ reason: 'budget-failed' });
    expect(f.records[0]).toMatchObject({ outcome: 'budget-failed', response: { bytesRead: 3, complete: false } });
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(['reject', 'wrong-hash', 'wrong-bytes'])('does not retry when durable retention %s', async (kind) => {
    const f = fixture([new Response('bad', { status: 502 })], {
      retainAttempt: async (r) => {
        if (kind === 'reject') throw Error('disk full');
        return { sha256: kind === 'wrong-hash' ? '0'.repeat(64) : hash(canonical(r)), bytes: 0 };
      },
    });
    await expect(f.run()).rejects.toMatchObject({ reason: 'retention-failed' });
    await vi.advanceTimersByTimeAsync(4000);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('honors cancellation during the recorded backoff', async () => {
    const f = fixture([new Response('bad', { status: 502 })]);
    const failed = expect(f.run()).rejects.toMatchObject({ reason: 'aborted' });
    await vi.advanceTimersByTimeAsync(0);
    f.controller.abort();
    await failed;
    await vi.advanceTimersByTimeAsync(4000);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(f.records).toHaveLength(1);
  });
  it('does not renew the original whole-operation deadline for later pages', async () => {
    const f = fixture([new Response('{}'), new Response('bad', { status: 502 })]);
    await f.run();
    await vi.advanceTimersByTimeAsync(19500);
    await expect(f.run(request('next'))).rejects.toMatchObject({ reason: 'deadline' });
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    expect(f.records.at(-1)!.operationDeadlineAtMs).toBe(START + 20000);
  });
  it('returns promptly for an uncooperative network, retains cancellation and cancels the late body', async () => {
    let resolve!: (r: Response) => void;
    const cancel = vi.fn(),
      late = new Response(new ReadableStream({ cancel }));
    const f = fixture([], {
      fetch: vi.fn(
        () =>
          new Promise<Response>((r) => {
            resolve = r;
          })
      ) as typeof fetch,
    });
    const failed = expect(f.run()).rejects.toMatchObject({ reason: 'deadline' });
    await vi.advanceTimersByTimeAsync(20000);
    await failed;
    expect(f.records[0]).toMatchObject({ outcome: 'deadline', response: null });
    resolve(late);
    await vi.advanceTimersByTimeAsync(0);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('a late retention acknowledgement cannot start another attempt', async () => {
    let resolve!: (ack: { sha256: string; bytes: number }) => void;
    let record!: Readonly<GoalAcquisitionAttempt>;
    const f = fixture([new Response('bad', { status: 502 })], {
      retainAttempt: (r) => {
        record = r;
        return new Promise((yes) => {
          resolve = yes;
        });
      },
    });
    const failed = expect(f.run()).rejects.toMatchObject({ reason: 'deadline' });
    await vi.advanceTimersByTimeAsync(20000);
    await failed;
    resolve({ sha256: hash(canonical(record)), bytes: Buffer.byteLength(canonical(record)) });
    await vi.advanceTimersByTimeAsync(4000);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('honors the caller signal and dispose before a request without charging a physical attempt', async () => {
    for (const mode of ['caller', 'dispose']) {
      const f = fixture(),
        caller = new AbortController(),
        init = request();
      init.signal = caller.signal;
      if (mode === 'caller') caller.abort();
      else f.transport.dispose();
      await expect(f.run(init)).rejects.toMatchObject({ reason: 'aborted' });
      expect(f.beforeAttempt).not.toHaveBeenCalled();
      expect(f.fetcher).not.toHaveBeenCalled();
    }
  });
  it('rejects getter-backed request properties without invoking them', async () => {
    const f = fixture(),
      init = request(),
      getter = vi.fn(() => 'POST');
    Object.defineProperty(init, 'method', { enumerable: true, get: getter });
    await expect(f.run(init)).rejects.toMatchObject({ reason: 'invalid-input' });
    expect(getter).not.toHaveBeenCalled();
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('does not coerce unsafe header values or access getter-backed construction options', async () => {
    const f = fixture(),
      init = request(),
      toString = vi.fn(() => 'no-cache');
    init.headers = { 'content-type': 'application/json', 'cache-control': { toString } } as unknown as HeadersInit;
    await expect(f.run(init)).rejects.toMatchObject({ reason: 'invalid-input' });
    expect(toString).not.toHaveBeenCalled();
    const options = { ...f.options },
      getter = vi.fn(() => f.options.fetch);
    Object.defineProperty(options, 'fetch', { get: getter, enumerable: true });
    expect(() => createGoalAcquisitionTransport(options)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it.each(['mutation', 'endpoint', 'credentials', 'authorization', 'redirect', 'extra'])(
    'rejects unsafe request %s before network work',
    async (mode) => {
      const f = fixture(),
        init = request();
      if (mode === 'mutation') init.body = '{"query":"mutation { trade }","variables":{}}';
      if (mode === 'credentials') init.credentials = 'include';
      if (mode === 'authorization') (init.headers as Record<string, string>).authorization = 'secret';
      if (mode === 'redirect') init.redirect = 'follow';
      if (mode === 'extra') init.keepalive = true;
      await expect(
        f.transport.fetch(mode === 'endpoint' ? 'https://example.com/graphql' : URL, init)
      ).rejects.toMatchObject({ reason: 'invalid-input' });
      expect(f.fetcher).not.toHaveBeenCalled();
      expect(f.beforeAttempt).not.toHaveBeenCalled();
    }
  );
  it('cannot reset the attempt limit by repeating the same request within an operation', async () => {
    const f = fixture();
    await f.run();
    await expect(f.run()).rejects.toMatchObject({ reason: 'request-limit' });
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects missing shared budgets or an extended operation deadline at construction', () => {
    const f = fixture();
    expect(() =>
      createGoalAcquisitionTransport({ ...f.options, budget: undefined } as unknown as GoalAcquisitionTransportOptions)
    ).toThrow();
    expect(() => createGoalAcquisitionTransport({ ...f.options, operationDeadlineAtMs: START + 30001 })).toThrow();
  });
  it('returns the retained header snapshot even when the upstream response is later changed', async () => {
    const upstream = new Response('{}', { headers: { 'content-type': 'application/json' } });
    const f = fixture([upstream], {
      retainAttempt: async (record) => {
        upstream.headers.set('content-type', 'changed/after-retention');
        const raw = canonical(record);
        return { name: 'actual-sink-receipt-1', sha256: hash(raw), bytes: Buffer.byteLength(raw) };
      },
    });
    expect((await f.run()).headers.get('content-type')).toBe('application/json');
  });
  it('cancels a partial body on abort and records already observed bytes without retry', async () => {
    const cancel = vi.fn();
    const f = fixture([
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array([3, 4]));
          },
          cancel,
        }),
        { status: 502 }
      ),
    ]);
    const failed = expect(f.run()).rejects.toMatchObject({ reason: 'aborted' });
    await vi.advanceTimersByTimeAsync(0);
    f.controller.abort();
    await failed;
    expect(f.records[0]).toMatchObject({
      outcome: 'aborted',
      response: { complete: false, bytesRead: 2, retainedBytes: 2 },
    });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects a concurrent request and a late physical-budget release cannot fetch after abort', async () => {
    let release!: () => void;
    const f = fixture([], {
      budget: {
        beforeAttempt: () =>
          new Promise<void>((r) => {
            release = r;
          }),
        consumeResponseBytes: () => undefined,
      },
    });
    const failed = expect(f.run()).rejects.toMatchObject({ reason: 'aborted' });
    await expect(f.run(request('next'))).rejects.toMatchObject({ reason: 'concurrent-request' });
    f.controller.abort();
    await failed;
    release();
    await vi.advanceTimersByTimeAsync(0);
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.records).toHaveLength(0);
  });
  it('retains invalid origin metadata, cancels that body and never retries it', async () => {
    const cancel = vi.fn(),
      original = new Response(new ReadableStream({ cancel }), { status: 502 });
    Object.defineProperty(original, 'url', { value: 'https://example.com/redirected' });
    const f = fixture([original]);
    await expect(f.run()).rejects.toMatchObject({ reason: 'invalid-response' });
    expect(f.records[0]).toMatchObject({
      outcome: 'invalid-response',
      response: { status: 502, complete: false, bytesRead: 0 },
    });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
});
