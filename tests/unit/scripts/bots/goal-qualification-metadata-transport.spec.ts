// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createGoalMetadataBatchTransport } from '../../../../scripts/bots/goal-qualification-metadata-transport';
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
function setup() {
  let clock = 1000,
    inflight = 0,
    maxInflight = 0;
  const starts: number[] = [],
    evidence: Array<Record<string, unknown>> = [];
  const wire = vi.fn(async (_url: unknown, init?: RequestInit) => {
    inflight++;
    maxInflight = Math.max(inflight, maxInflight);
    starts.push(clock);
    const requests = JSON.parse(init!.body as string);
    await Promise.resolve();
    inflight--;
    return new Response(
      JSON.stringify(
        requests
          .map((r: { id: number; params: unknown[] }) => ({ jsonrpc: '2.0', id: r.id, result: r.params[0] }))
          .reverse()
      ),
      { status: 200 }
    );
  });
  const options = {
    fetch: wire as typeof fetch,
    now: () => clock,
    sleep: async (ms: number) => {
      clock += ms;
    },
    budget: { logicalRpcCalls: 1000, httpStarts: 1000, responseBytes: 16 * 1024 * 1024 },
    sink: async (_i: number, v: unknown) => {
      evidence.push(v as Record<string, unknown>);
    },
  };
  const request = (t: ReturnType<typeof createGoalMetadataBatchTransport>, n: number, id = n, signal?: AbortSignal) =>
    t.fetch('https://mof2.sora.org/', {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', id, method: 'chain_getHeader', params: [hash(n)] }),
      signal,
    });
  return {
    options,
    wire,
    evidence,
    starts,
    request,
    get maxInflight() {
      return maxInflight;
    },
  };
}
describe('bounded metadata RPC batching', () => {
  it('maps reverse responses to32 independent callers while preserving original raw bytes before release', async () => {
    const f = setup(),
      t = createGoalMetadataBatchTransport(f.options);
    const values = await Promise.all(
      Array.from({ length: 32 }, (_, n) => f.request(t, n + 1, 1).then((r) => r.json()))
    );
    expect(values.map((v) => v.result)).toEqual(Array.from({ length: 32 }, (_, n) => hash(n + 1)));
    expect(values.every((v) => v.id === 1)).toBe(true);
    expect(t.stats()).toMatchObject({ logicalRpcCalls: 32, wireRpcCalls: 32, httpStarts: 1 });
    expect(f.evidence).toHaveLength(1);
    expect(f.evidence[0].complete).toBe(true);
    expect(
      (f.evidence[0].mapping as Array<{ requests: Array<{ logicalRequestId: number }> }>)
        .flatMap((m) => m.requests)
        .map((r) => r.logicalRequestId)
    ).toEqual(Array.from({ length: 32 }, (_, n) => n + 1));
    t.close();
  });
  it('deduplicates only exact method+params in each batch and restores each original ID', async () => {
    const f = setup(),
      t = createGoalMetadataBatchTransport(f.options);
    const result = await Promise.all([f.request(t, 5, 1), f.request(t, 5, 2), f.request(t, 6, 3)]);
    expect(await Promise.all(result.map((r) => r.json()))).toEqual([
      { jsonrpc: '2.0', id: 1, result: hash(5) },
      { jsonrpc: '2.0', id: 2, result: hash(5) },
      { jsonrpc: '2.0', id: 3, result: hash(6) },
    ]);
    expect(t.stats()).toMatchObject({ logicalRpcCalls: 3, wireRpcCalls: 2, httpStarts: 1 });
    t.close();
  });
  it('keeps one wire batch in flight and at least125ms between HTTP starts across sequential waves', async () => {
    const f = setup(),
      t = createGoalMetadataBatchTransport({ ...f.options, previousStartedAtMs: 950 });
    for (let wave = 0; wave < 3; wave++)
      await Promise.all(Array.from({ length: 32 }, (_, n) => f.request(t, n + wave * 32)));
    expect(f.maxInflight).toBe(1);
    expect(f.starts).toEqual([1075, 1200, 1325]);
    t.close();
  });
  it.each(['assets_getAssetInfo', 'liquidityProxy_quote', 'state_getStorage'])(
    'refuses forbidden %s requests before wire access',
    async (method) => {
      const f = setup(),
        t = createGoalMetadataBatchTransport(f.options);
      await expect(
        t.fetch('https://mof2.sora.org/', {
          method: 'POST',
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: ['0xdead', hash(1)] }),
        })
      ).rejects.toThrow();
      expect(f.wire).not.toHaveBeenCalled();
      t.close();
    }
  );
  it('retains failed raw replies and rejects every member without retry on duplicate IDs', async () => {
    const f = setup();
    f.wire.mockImplementation(
      async () =>
        new Response(
          JSON.stringify([
            { jsonrpc: '2.0', id: 1, result: 1 },
            { jsonrpc: '2.0', id: 1, result: 2 },
          ])
        )
    );
    const t = createGoalMetadataBatchTransport(f.options),
      results = await Promise.allSettled([f.request(t, 1), f.request(t, 2)]);
    await t.drain();
    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(f.wire).toHaveBeenCalledTimes(1);
    expect(f.evidence[0]).toMatchObject({ complete: false, failure: 'metadata-batch-unavailable' });
    await expect(f.request(t, 3)).rejects.toThrow();
    expect(f.wire).toHaveBeenCalledTimes(1);
    t.close();
  });
  it('does not release any projection before durable wire evidence succeeds', async () => {
    const f = setup(),
      sink = vi.fn(async () => {
        throw Error('diskfull');
      }),
      t = createGoalMetadataBatchTransport({ ...f.options, sink });
    const results = await Promise.allSettled([f.request(t, 1), f.request(t, 2)]);
    await t.drain();
    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(sink).toHaveBeenCalledTimes(1);
    t.close();
  });
  it('aborts all batch members when one reader is aborted; no fallback/retry', async () => {
    const f = setup(),
      abort = new AbortController();
    f.wire.mockImplementation(
      async (_url, init) =>
        new Promise((_resolve, reject) => {
          init!.signal!.addEventListener('abort', () => reject(Error('abort')), { once: true });
          abort.abort();
        })
    );
    const t = createGoalMetadataBatchTransport(f.options),
      results = await Promise.allSettled([f.request(t, 1, 1, abort.signal), f.request(t, 2)]);
    await t.drain();
    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(f.wire).toHaveBeenCalledTimes(1);
    t.close();
  });
  it('enforces detached physical byte and HTTP budgets separately from logical request count', async () => {
    const budget = { logicalRpcCalls: 32, httpStarts: 1, responseBytes: 10000 };
    const f = setup(),
      t = createGoalMetadataBatchTransport({
        ...f.options,
        budget,
      });
    budget.httpStarts = 999;
    await Promise.all([f.request(t, 1), f.request(t, 2)]);
    await expect(f.request(t, 3)).rejects.toThrow();
    await t.drain();
    expect(f.wire).toHaveBeenCalledTimes(1);
    t.close();
    const g = setup(),
      u = createGoalMetadataBatchTransport({
        ...g.options,
        budget: { logicalRpcCalls: 32, httpStarts: 1, responseBytes: 5 },
      });
    await expect(g.request(u, 1)).rejects.toThrow();
    await u.drain();
    expect(u.stats().responseBytes).toBeGreaterThan(5);
    expect(g.evidence[0].complete).toBe(false);
    u.close();
  });
  it('rejects a response with both result and error and refuses noncanonical endpoints', async () => {
    const f = setup();
    f.wire.mockImplementation(
      async () => new Response(JSON.stringify([{ jsonrpc: '2.0', id: 1, result: 1, error: { code: -1 } }]))
    );
    const t = createGoalMetadataBatchTransport(f.options);
    await expect(f.request(t, 1)).rejects.toThrow();
    await t.drain();
    t.close();
    const g = setup(),
      u = createGoalMetadataBatchTransport(g.options);
    await expect(u.fetch('https://other.example/', { method: 'POST', body: '{}' })).rejects.toThrow();
    expect(g.wire).not.toHaveBeenCalled();
    u.close();
  });
  it('rejects missing, extra, accessor and malformed budget fields before any RPC', () => {
    const f = setup();
    const getter = vi.fn(() => 1000);
    const budgets = [
      {},
      { logicalRpcCalls: 1, httpStarts: 1 },
      { logicalRpcCalls: 1, httpStarts: 1, responseBytes: 1, extra: 1 },
      { logicalRpcCalls: 1, httpStarts: NaN, responseBytes: 1 },
      Object.defineProperty({ httpStarts: 1, responseBytes: 1 }, 'logicalRpcCalls', { enumerable: true, get: getter }),
    ];
    for (const budget of budgets)
      expect(() =>
        createGoalMetadataBatchTransport({ ...f.options, budget: budget as typeof f.options.budget })
      ).toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(f.wire).not.toHaveBeenCalled();
  });
  it('detaches budget limits and ignores a late response from a fetch that does not honor abort', async () => {
    const f = setup(),
      abort = new AbortController();
    let resolveWire!: (v: Response) => void;
    f.wire.mockImplementation(
      async () =>
        new Promise((resolve) => {
          resolveWire = resolve;
          queueMicrotask(() => abort.abort());
        })
    );
    const budget = { logicalRpcCalls: 32, httpStarts: 1, responseBytes: 10000 },
      t = createGoalMetadataBatchTransport({ ...f.options, budget, signal: abort.signal });
    budget.httpStarts = 999;
    await expect(f.request(t, 1)).rejects.toThrow();
    await t.drain();
    resolveWire(new Response(JSON.stringify([{ jsonrpc: '2.0', id: 1, result: hash(1) }])));
    await Promise.resolve();
    expect(f.evidence).toHaveLength(1);
    expect(f.evidence[0].complete).toBe(false);
    await expect(f.request(t, 2)).rejects.toThrow();
    expect(f.wire).toHaveBeenCalledTimes(1);
    t.close();
  });
  it('preserves v1 global limits and allows only explicit finite catalog policy2 limits', () => {
    const f = setup();
    const legacy = { logicalRpcCalls: 420000, httpStarts: 420000, responseBytes: 4 * 1024 ** 3 };
    const catalog = { logicalRpcCalls: 440000, httpStarts: 440000, responseBytes: 10 * 1024 ** 3 };
    for (const policyVersion of [undefined, 1] as const) {
      const t = createGoalMetadataBatchTransport({ ...f.options, policyVersion, budget: legacy });
      t.close();
      for (const budget of [
        catalog,
        { ...legacy, logicalRpcCalls: 420001 },
        { ...legacy, httpStarts: 420001 },
        { ...legacy, responseBytes: 4 * 1024 ** 3 + 1 },
      ])
        expect(() => createGoalMetadataBatchTransport({ ...f.options, policyVersion, budget })).toThrow();
    }
    const t = createGoalMetadataBatchTransport({ ...f.options, policyVersion: 2, budget: catalog });
    t.close();
    for (const budget of [
      { ...catalog, logicalRpcCalls: 440001 },
      { ...catalog, httpStarts: 440001 },
      { ...catalog, responseBytes: 10 * 1024 ** 3 + 1 },
    ])
      expect(() => createGoalMetadataBatchTransport({ ...f.options, policyVersion: 2, budget })).toThrow();
    for (const policyVersion of [0, 3, null, '2'])
      expect(() =>
        createGoalMetadataBatchTransport({ ...f.options, policyVersion: policyVersion as 2, budget: legacy })
      ).toThrow();
    expect(f.wire).not.toHaveBeenCalled();
  });
  it('catalog policy2 retains the same method allowlist and request/physical byte budgets', async () => {
    const f = setup(),
      t = createGoalMetadataBatchTransport({
        ...f.options,
        policyVersion: 2,
        budget: { logicalRpcCalls: 2, httpStarts: 1, responseBytes: 10000 },
      });
    await Promise.all([f.request(t, 1), f.request(t, 2)]);
    await expect(f.request(t, 3)).rejects.toThrow();
    await t.drain();
    expect(f.wire).toHaveBeenCalledTimes(1);
    t.close();
    const g = setup(),
      u = createGoalMetadataBatchTransport({ ...g.options, policyVersion: 2 });
    await expect(
      u.fetch('https://mof2.sora.org/', {
        method: 'POST',
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'state_getStorage', params: ['0xdead', hash(1)] }),
      })
    ).rejects.toThrow();
    expect(g.wire).not.toHaveBeenCalled();
    u.close();
  });
});
