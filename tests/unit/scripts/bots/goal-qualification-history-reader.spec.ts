// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readGoalQualificationHistory,
  GoalQualificationHistoryReadError,
  type GoalQualificationHistoryOptions,
} from '../../../../scripts/bots/goal-qualification-history-reader';
const HOUR = 3600000,
  START = Date.UTC(2026, 0, 1),
  GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000',
  KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
function row(assetId: string, i: number) {
  const open = START / 1000 + i * 3600;
  return {
    id: `asset-${assetId}-HOUR-${open}`,
    assetId,
    type: 'HOUR',
    timestamp: open + 3590,
    denominator: '100',
    closeEvidence: {
      kind: 'finalized-hour-close',
      genesisHash: GENESIS,
      completedAt: open + 3600,
      timestamp: open + 3590,
      blockHeight: 100 + i * 600,
      nextBlockHeight: 101 + i * 600,
      blockHash: hash(100 + i * 600),
      nextBlockHash: hash(101 + i * 600),
      nextTimestamp: open + 3601,
      requestedSymbol: assetId === XOR ? 'XOR' : 'KUSD',
      symbol: assetId === XOR ? 'XOR' : 'KUSD',
      decimals: 18,
      xorPool:
        assetId === XOR
          ? null
          : {
              baseAssetId: XOR,
              targetAssetId: KUSD,
              baseDecimals: 18,
              targetDecimals: 18,
              baseAssetReserves: '1000000000000000000',
              targetAssetReserves: '7000000000000000001',
            },
    },
  };
}
function setup(hours = 2, pageSize = 100) {
  const input = { startAtMs: START, endAtMs: START + hours * HOUR, genesisHash: GENESIS, denominator: '100' };
  let change = (value: ReturnType<typeof row>) => value,
    changePage = (value: unknown) => value;
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const { variables } = JSON.parse(init!.body as string),
      assetId = variables.filter.assetId.equalTo,
      start = variables.after ? Number(variables.after) : 0,
      end = Math.min(hours, start + pageSize);
    return new Response(
      JSON.stringify(
        changePage({
          data: {
            assetSnapshots: {
              edges: Array.from({ length: end - start }, (_, i) => ({ node: change(row(assetId, start + i)) })),
              pageInfo: { hasNextPage: end < hours, endCursor: end < hours ? String(end) : null },
            },
          },
        })
      ),
      { status: 200 }
    );
  });
  return {
    input,
    fetcher,
    read: () => readGoalQualificationHistory(input, { fetch: fetcher as typeof fetch }),
    setRow: (fn: typeof change) => {
      change = fn;
    },
    setPage: (fn: typeof changePage) => {
      changePage = fn;
    },
  };
}
afterEach(() => vi.useRealTimers());
describe('actual indexed qualification history reader', () => {
  it('uses the actual exact pool decoder, preserving precision and second-resolution proof without USD or arrival claims', async () => {
    const f = setup(),
      r = await f.read();
    expect(r.history.history.candles).toEqual(
      [1, 2].map((n) => ({
        timestamp: START + n * HOUR,
        close: '7.000000000000000001',
        feeClose: '7.000000000000000001',
      }))
    );
    expect(r.history.boundaries[0]).toMatchObject({
      arrivalTimeKnown: false,
      closing: { height: 100, timestampSeconds: START / 1000 + 3590 },
    });
    expect(r.history.boundaries[0].closing).not.toHaveProperty('timestampMs');
    expect(r).not.toHaveProperty('receivedAtMs');
    expect(r.rpcEvidence).toHaveLength(2);
    expect(r.rpcEvidence.every((x) => x.complete && x.responseBody && x.responseSha256)).toBe(true);
    const request = JSON.parse(r.rpcEvidence[0].requestBody);
    expect(request.query).not.toContain('priceUSD');
    expect(request.variables.filter.timestamp).toEqual({
      greaterThanOrEqualTo: START / 1000,
      lessThan: (START + 2 * HOUR) / 1000,
    });
    expect(f.fetcher.mock.calls.map((c) => c[0])).toEqual([
      'https://pi.soramitsu.io/graphql',
      'https://pi.soramitsu.io/graphql',
    ]);
    expect(f.fetcher.mock.calls[0][1]).toMatchObject({ redirect: 'error', credentials: 'omit' });
    expect(Object.isFrozen(r.history.history.candles[0])).toBe(true);
    expect(Object.isFrozen(r.rpcEvidence[0])).toBe(true);
  });
  it('paginates both assets to exactly200 hours without replacing the requested window', async () => {
    const f = setup(200),
      r = await f.read();
    expect(r.history.history.candles).toHaveLength(200);
    expect(f.fetcher).toHaveBeenCalledTimes(4);
    expect(r.rpcEvidence.map((r) => r.page)).toEqual([0, 1, 0, 1]);
    expect(r.history.boundaries.at(-1)?.completedAtMs).toBe(START + 200 * HOUR);
  });
  it('preserves all200 warmup closes plus the current signal close with six cursor pages', async () => {
    const f = setup(201),
      r = await f.read();
    expect(r.history.history.candles).toHaveLength(201);
    expect(r.history.history.candles[0].timestamp).toBe(START + HOUR);
    expect(r.history.history.candles.at(-1)?.timestamp).toBe(START + 201 * HOUR);
    expect(r.rpcEvidence.map((x) => x.page)).toEqual([0, 1, 2, 0, 1, 2]);
    expect(f.fetcher).toHaveBeenCalledTimes(6);
  });
  it.each([
    ['missing-pool', (r: ReturnType<typeof row>) => ({ ...r, closeEvidence: { ...r.closeEvidence, xorPool: null } })],
    ['denominator', (r: ReturnType<typeof row>) => ({ ...r, denominator: '1' })],
    ['precision', (r: ReturnType<typeof row>) => ({ ...r, closeEvidence: { ...r.closeEvidence, decimals: 6 } })],
    ['genesis', (r: ReturnType<typeof row>) => ({ ...r, closeEvidence: { ...r.closeEvidence, genesisHash: hash(5) } })],
    [
      'join',
      (r: ReturnType<typeof row>) => ({
        ...r,
        closeEvidence: { ...r.closeEvidence, blockHash: r.assetId === KUSD ? hash(9) : r.closeEvidence.blockHash },
      }),
    ],
  ] as const)('rejects %s proof without legacy-price fallback', async (_name, change) => {
    const f = setup();
    f.setRow(change);
    await expect(f.read()).rejects.toMatchObject({ diagnostic: { stage: 'history', reason: 'history-incomplete' } });
    expect(f.fetcher).toHaveBeenCalledTimes(2);
  });
  it.each(['duplicate', 'asset', 'outside', 'canonical-id'])(
    'rejects %s rows rather than silently dropping them',
    async (kind) => {
      const f = setup();
      f.setRow((r) =>
        kind === 'duplicate'
          ? row(r.assetId, 0)
          : kind === 'asset'
            ? { ...r, assetId: hash(3) }
            : kind === 'outside'
              ? { ...r, timestamp: START / 1000 - 1 }
              : { ...r, id: 'alias' }
      );
      await expect(f.read()).rejects.toMatchObject({ diagnostic: { reason: 'page-invalid' } });
      expect(f.fetcher).toHaveBeenCalledTimes(1);
    }
  );
  it('rejects GraphQL errors with raw evidence retained and never retries', async () => {
    const f = setup();
    f.setPage(() => ({ errors: [{ message: 'private internal text' }], data: null }));
    const error = await f.read().catch((e) => e);
    expect(error).toBeInstanceOf(GoalQualificationHistoryReadError);
    expect(error.message).not.toContain('private');
    expect(error.diagnostic).toMatchObject({ reason: 'graphql-error', rpcEvidence: [{ complete: true }] });
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects cursor cycles and empty continuing pages', async () => {
    const f = setup(4, 1);
    f.setPage((value) => {
      const v = value as { data: { assetSnapshots: { pageInfo: { endCursor: string } } } };
      v.data.assetSnapshots.pageInfo.endCursor = '1';
      return v;
    });
    await expect(f.read()).rejects.toMatchObject({ diagnostic: { reason: 'page-invalid' } });
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    const g = setup();
    g.setPage(() => ({ data: { assetSnapshots: { edges: [], pageInfo: { hasNextPage: true, endCursor: 'a' } } } }));
    await expect(g.read()).rejects.toMatchObject({ diagnostic: { reason: 'page-invalid' } });
  });
  it('rejects an incomplete final page and never asks for later replacement hours', async () => {
    const f = setup();
    f.setPage((value) => {
      const v = value as { data: { assetSnapshots: { edges: unknown[] } } };
      v.data.assetSnapshots.edges.pop();
      return v;
    });
    await expect(f.read()).rejects.toMatchObject({ diagnostic: { reason: 'history-incomplete' } });
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('caps page requests even if cursors and small pages keep progressing', async () => {
    const f = setup(10, 1);
    await expect(f.read()).rejects.toMatchObject({ diagnostic: { reason: 'request-limit' } });
    expect(f.fetcher).toHaveBeenCalledTimes(8);
  });
  it('enforces response and aggregate byte limits with incomplete raw evidence', async () => {
    const f = setup();
    f.fetcher.mockImplementation(async () => new Response('x'.repeat(2097153)));
    await expect(f.read()).rejects.toMatchObject({
      diagnostic: { reason: 'response-limit', rpcEvidence: [{ complete: false }] },
    });
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    const g = setup(5, 1);
    g.setPage((v) => ({ ...(v as object), padding: 'x'.repeat(1500000) }));
    const e = await g.read().catch((e) => e);
    expect(e.diagnostic.reason).toBe('response-limit');
    expect(g.fetcher).toHaveBeenCalledTimes(6);
  });
  it('retains invalid JSON and invalid UTF8 raw failure evidence', async () => {
    const f = setup();
    f.fetcher.mockImplementation(async () => new Response('{'));
    await expect(f.read()).rejects.toMatchObject({
      diagnostic: { reason: 'page-invalid', rpcEvidence: [{ responseBody: '{', complete: true }] },
    });
    const g = setup();
    g.fetcher.mockImplementation(async () => new Response(new Uint8Array([255])));
    await expect(g.read()).rejects.toMatchObject({
      diagnostic: { reason: 'page-invalid', rpcEvidence: [{ responseBodyBase64: '/w==', complete: false }] },
    });
  });
  it('rejects redirects and HTTP failures without endpoint fallback', async () => {
    const f = setup();
    f.fetcher.mockImplementation(async () => new Response('{}', { status: 503 }));
    await expect(f.read()).rejects.toMatchObject({
      diagnostic: { reason: 'http-error', rpcEvidence: [{ httpStatus: 503 }] },
    });
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    const g = setup();
    g.fetcher.mockImplementation(async () => Object.defineProperty(new Response('{}'), 'redirected', { value: true }));
    await expect(g.read()).rejects.toMatchObject({ diagnostic: { reason: 'http-error' } });
  });
  it('validates descriptors, identity, hour alignment and bounds before any request', async () => {
    const f = setup(),
      getter = vi.fn();
    const hostile = Object.defineProperty({ ...f.input }, 'denominator', { get: getter, enumerable: true });
    for (const v of [
      hostile,
      { ...f.input, endAtMs: START + 202 * HOUR },
      { ...f.input, startAtMs: START + 1 },
      { ...f.input, denominator: '0' },
      { ...f.input, denominator: (1n << 128n).toString() },
      { ...f.input, genesisHash: hash(1) },
    ])
      await expect(readGoalQualificationHistory(v, { fetch: f.fetcher as typeof fetch })).rejects.toMatchObject({
        diagnostic: { stage: 'input' },
      });
    expect(getter).not.toHaveBeenCalled();
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('rejects malformed or accessor options without evaluating getters or requesting data', async () => {
    const f = setup(),
      getter = vi.fn();
    for (const options of [
      null,
      [],
      { fetch: null },
      { signal: null },
      { timeoutMs: null },
      { timeoutMs: 30001 },
      { fetch: 3 },
      { signal: {} },
      { extra: true },
      Object.defineProperty({}, 'fetch', { get: getter, enumerable: true }),
      Object.create({ fetch: f.fetcher }),
      Object.defineProperty({}, 'signal', { value: new AbortController().signal, enumerable: false }),
    ]) {
      await expect(
        readGoalQualificationHistory(f.input, options as GoalQualificationHistoryOptions)
      ).rejects.toMatchObject({ diagnostic: { stage: 'input', reason: 'invalid-input' } });
    }
    expect(getter).not.toHaveBeenCalled();
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('snapshots options before awaiting and retains the original abort capability', async () => {
    vi.useFakeTimers();
    const f = setup(),
      original = f.fetcher.getMockImplementation()!,
      originalAbort = new AbortController(),
      replacementAbort = new AbortController();
    f.fetcher.mockImplementation(async (...args) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return original(...args);
    });
    const options: GoalQualificationHistoryOptions = {
      fetch: f.fetcher as typeof fetch,
      signal: originalAbort.signal,
      timeoutMs: 20,
    };
    const pending = readGoalQualificationHistory(f.input, options);
    options.fetch = vi.fn(async () => {
      throw Error('replacement');
    }) as typeof fetch;
    options.signal = replacementAbort.signal;
    options.timeoutMs = 1;
    replacementAbort.abort();
    await vi.advanceTimersByTimeAsync(10);
    expect((await pending).history.history.candles).toHaveLength(2);
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    expect(options.fetch).not.toHaveBeenCalled();
    const g = setup(),
      a = new AbortController(),
      changed: GoalQualificationHistoryOptions = { fetch: g.fetcher as typeof fetch, signal: a.signal };
    g.fetcher.mockImplementation(async () => new Promise(() => undefined));
    const next = readGoalQualificationHistory(g.input, changed);
    changed.signal = new AbortController().signal;
    const assertion = expect(next).rejects.toMatchObject({ diagnostic: { reason: 'aborted' } });
    a.abort();
    await assertion;
  });
  it('detaches the exact input before the first await', async () => {
    const f = setup(),
      pending = f.read();
    f.input.denominator = '999';
    f.input.endAtMs = START + 100 * HOUR;
    const r = await pending;
    expect(r.history.history.candles).toHaveLength(2);
    expect(r.history.history.identity?.denominator).toBe('100');
  });
  it('applies one deadline across all pages and ignores noncooperative late fetch responses', async () => {
    vi.useFakeTimers();
    const f = setup();
    let late!: (r: Response) => void;
    f.fetcher.mockImplementation(
      async () =>
        new Promise((resolve) => {
          late = resolve;
        })
    );
    const pending = readGoalQualificationHistory(f.input, { fetch: f.fetcher as typeof fetch, timeoutMs: 20 });
    const assertion = expect(pending).rejects.toMatchObject({ diagnostic: { reason: 'timeout' } });
    await vi.advanceTimersByTimeAsync(20);
    await assertion;
    const cancel = vi.fn();
    late(new Response(new ReadableStream({ cancel })));
    await Promise.resolve();
    await Promise.resolve();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('aborts an unfinished response body and preserves the received prefix without retry', async () => {
    vi.useFakeTimers();
    const f = setup(),
      abort = new AbortController();
    f.fetcher.mockImplementation(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{'));
              setTimeout(() => abort.abort(), 5);
            },
          })
        )
    );
    const pending = readGoalQualificationHistory(f.input, { fetch: f.fetcher as typeof fetch, signal: abort.signal });
    const assertion = expect(pending).rejects.toMatchObject({
      diagnostic: { reason: 'aborted', rpcEvidence: [{ bytes: 1, responseBodyBase64: 'ew==', complete: false }] },
    });
    await vi.advanceTimersByTimeAsync(5);
    await assertion;
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not reset the whole-operation deadline for another cursor page', async () => {
    vi.useFakeTimers();
    const f = setup(2, 1),
      original = f.fetcher.getMockImplementation()!;
    f.fetcher.mockImplementation(async (...args) => {
      await new Promise((resolve) => setTimeout(resolve, 8));
      return original(...args);
    });
    const pending = readGoalQualificationHistory(f.input, { fetch: f.fetcher as typeof fetch, timeoutMs: 20 });
    const assertion = expect(pending).rejects.toMatchObject({ diagnostic: { reason: 'timeout' } });
    await vi.advanceTimersByTimeAsync(20);
    await assertion;
    expect(f.fetcher).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(10);
    expect(f.fetcher).toHaveBeenCalledTimes(3);
  });
});
