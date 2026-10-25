// @vitest-environment node
/** All timestamps, reserves, block hashes and HTTP bodies here are invented. */
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AccumulationCloseRetentionError,
  createAccumulationCloseSource,
  isAccumulationCloseSourceResult,
} from '../../../../scripts/bots/accumulation-close-source';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';

const H = 3_600_000_000;
const ENDPOINT = 'https://pi.soramitsu.io/graphql';
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;

/** Match the existing AssetSnapshotFilter/closeEvidence schema without reading real indexer observations. */
function fixture() {
  const node = (assetId: string, symbol: string) => ({
    id: `asset-${assetId}-HOUR-${(H - 3_600_000) / 1000}`,
    assetId,
    type: 'HOUR',
    timestamp: H / 1000 - 1,
    denominator: '1',
    closeEvidence: {
      kind: 'finalized-hour-close',
      genesisHash: GENESIS,
      completedAt: H / 1000,
      timestamp: H / 1000 - 1,
      symbol,
      requestedSymbol: symbol,
      decimals: 18,
      blockHeight: 99,
      blockHash: hash(99),
      nextBlockHeight: 100,
      nextBlockHash: hash(100),
      nextTimestamp: H / 1000 + 1,
      xorPool:
        symbol === 'XOR'
          ? null
          : {
              baseAssetId: XOR,
              targetAssetId: KUSD,
              baseDecimals: 18,
              targetDecimals: 18,
              baseAssetReserves: '1000000000000000000000',
              targetAssetReserves: '2000000000000000000000',
            },
    },
  });
  const kusd = node(KUSD, 'KUSD'),
    xor = node(XOR, 'XOR');
  const page = (value: typeof kusd) => ({
    pageInfo: { hasNextPage: false, endCursor: null },
    edges: [{ node: value }],
  });
  const envelope = { data: { kusd: page(kusd), xor: page(xor) } };
  const rawKusd = JSON.stringify(kusd, null, 3),
    rawXor = JSON.stringify(xor, null, 2);
  const body = ` \n{"data":{"kusd":{"pageInfo":{"hasNextPage":false,"endCursor":null},"edges":[{"node":${rawKusd}}]},"xor":{"pageInfo":{"hasNextPage":false,"endCursor":null},"edges":[{"node":${rawXor}}]}}}\n `;
  return { body, envelope, rawKusd, rawXor };
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function setup(
  body: string | (() => Response | Promise<Response>) = fixture().body,
  options: {
    timeoutMs?: number;
    retentionTimeoutMs?: number;
    gate?: (name: string) => Promise<void>;
    signal?: AbortSignal;
  } = {}
) {
  let clock = H + 5000;
  vi.spyOn(Date, 'now').mockImplementation(() => clock++);
  const forbidden = vi.fn(() => {
    throw Error('external network forbidden');
  });
  vi.stubGlobal('fetch', forbidden);
  const retained = new Map<string, string>();
  const fetcher: typeof fetch = vi.fn(async (url, init) => {
    expect(url).toBe(ENDPOINT);
    expect(init).toMatchObject({ method: 'POST', credentials: 'omit', redirect: 'error', cache: 'no-store' });
    const start = JSON.parse(retained.get(`close-${H}-start.json`)!);
    expect(Buffer.from(start.requestBodyBase64, 'base64').toString()).toBe(init?.body);
    expect(start.requestSha256).toBe(sha(String(init?.body)));
    return typeof body === 'function' ? body() : new Response(body, { status: 200 });
  });
  const source = createAccumulationCloseSource({
    fetch: fetcher,
    retain: async (name, bytes) => {
      await options.gate?.(name);
      expect(retained.has(name)).toBe(false);
      retained.set(name, bytes);
      return { sha256: sha(bytes), bytes: Buffer.byteLength(bytes) };
    },
    timeoutMs: options.timeoutMs ?? 1000,
    ...(options.retentionTimeoutMs !== undefined ? { retentionTimeoutMs: options.retentionTimeoutMs } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });
  return { source, fetcher, forbidden, retained };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('bounded completed-hour public source collector', () => {
  it('retains original wire bytes and extracts exact original node slices into the sealed bridge close binding', async () => {
    const f = fixture(),
      c = setup(f.body);
    const result = await c.source.collect({ boundaryUtcMs: H });
    expect(result.status).toBe('complete');
    expect(isAccumulationCloseSourceResult(result)).toBe(true);
    expect(isAccumulationCloseSourceResult(JSON.parse(JSON.stringify(result)))).toBe(false);
    expect(result.closeRowsJson).toBe(`{${JSON.stringify(KUSD)}:[${f.rawKusd}],${JSON.stringify(XOR)}:[${f.rawXor}]}`);
    expect(result.completedClose).toEqual({
      timestampMs: H,
      availableAtMs: result.receipt.completedAtMs,
      rawRowsSha256: sha(result.closeRowsJson!),
      sourceReceiptSha256: sha(c.retained.get(`close-${H}-outcome.json`)!),
    });
    expect(result.sourceReceiptSha256).toBe(result.completedClose?.sourceReceiptSha256);
    expect(JSON.parse(c.retained.get(`close-${H}-outcome.json`)!)).toEqual(result.receipt);
    expect(Buffer.from(result.receipt.responseBodyBase64, 'base64').toString()).toBe(f.body);
    expect(result.receipt.responseSha256).toBe(sha(f.body));
    expect(result.receipt.receivedBytes).toBe(Buffer.byteLength(f.body));
    expect(result.receipt.retainedBytes).toBe(result.receipt.receivedBytes);
    expect(result.receipt.completedAtMs).toBeGreaterThanOrEqual(result.receipt.requestedAtMs);
    expect(BigInt(result.receipt.elapsedNs)).toBeGreaterThanOrEqual(0n);
    expect(result.receipt.responseComplete).toBe(true);
    expect(result.receipt.failure).toBeNull();
    expect(Object.isFrozen(result.completedClose)).toBe(true);
    expect(result.independentConsensusVerified).toBe(false);
    expect(result.historicalBrowserArrivalVerified).toBe(false);
    expect(result.admissionAuthorized).toBe(false);
    const request = JSON.parse(Buffer.from(result.receipt.requestBodyBase64, 'base64').toString());
    expect(request.query).toContain('closeEvidence');
    expect(request.query.match(/first:2/g)).toHaveLength(2);
    expect(request.variables).toEqual(
      Object.fromEntries(
        [
          ['kusd', KUSD],
          ['xor', XOR],
        ].map(([alias, assetId]) => [
          alias,
          {
            assetId: { equalTo: assetId },
            type: { equalTo: 'HOUR' },
            timestamp: { greaterThanOrEqualTo: (H - 3_600_000) / 1000, lessThan: H / 1000 },
          },
        ])
      )
    );
    expect(c.retained.size).toBe(2);
    expect(c.fetcher).toHaveBeenCalledTimes(1);
    expect(c.forbidden).not.toHaveBeenCalled();
    await expect(c.source.collect({ boundaryUtcMs: H })).rejects.toThrow('close-source-unavailable');
  });

  it.each(['missing', 'duplicate', 'legacy', 'denominator', 'future-proof', 'pagination'] as const)(
    'fails closed on %s rows without filling gaps or retrying',
    async (mode) => {
      const f = fixture();
      if (mode === 'missing') f.envelope.data.kusd.edges = [];
      if (mode === 'duplicate') f.envelope.data.kusd.edges.push(f.envelope.data.kusd.edges[0]);
      if (mode === 'legacy') f.envelope.data.kusd.edges[0].node.closeEvidence.kind = 'legacy';
      if (mode === 'denominator') f.envelope.data.xor.edges[0].node.denominator = '2';
      if (mode === 'future-proof')
        for (const row of [f.envelope.data.kusd, f.envelope.data.xor])
          row.edges[0].node.closeEvidence.nextTimestamp = H / 1000 + 10;
      if (mode === 'pagination') f.envelope.data.kusd.pageInfo.hasNextPage = true;
      const c = setup(JSON.stringify(f.envelope));
      const result = await c.source.collect({ boundaryUtcMs: H });
      expect(result.status).toBe('failed');
      expect(result.receipt.failure).not.toBeNull();
      expect(result.closeRowsJson).toBeNull();
      expect(result.completedClose).toBeNull();
      expect(isAccumulationCloseSourceResult(result)).toBe(false);
      expect(c.retained.size).toBe(2);
      expect(c.fetcher).toHaveBeenCalledTimes(1);
    }
  );

  it('rejects a future or unaligned boundary before retaining intent or issuing a request', async () => {
    const c = setup();
    await expect(c.source.collect({ boundaryUtcMs: H + 3_600_000 })).rejects.toThrow('invalid-close-boundary');
    await expect(c.source.collect({ boundaryUtcMs: H + 1 })).rejects.toThrow('invalid-close-boundary');
    expect(c.retained.size).toBe(0);
    expect(c.fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ['graphql-error', '{"errors":[{"message":"invented"}],"data":null}'],
    ['duplicate-json-key', '{"data":{},"d\\u0061ta":{}}'],
    ['inexact-json-number', '{"data":{},"extensions":{"n":1.00000000000000001}}'],
    ['malformed-json', '{"data":'],
  ])('retains %s without admitting ambiguous or failed JSON', async (reason, body) => {
    const c = setup(body);
    const result = await c.source.collect({ boundaryUtcMs: H });
    expect(result.status).toBe('failed');
    expect(result.receipt.failure).toBe(reason);
    expect(Buffer.from(result.receipt.responseBodyBase64, 'base64').toString()).toBe(body);
    expect(isAccumulationCloseSourceResult(result)).toBe(false);
  });

  it('retains a partial body and original failure clocks after a read error', async () => {
    let reads = 0;
    const prefix = Buffer.from(fixture().body.slice(0, 31));
    const c = setup(
      () =>
        new Response(
          new ReadableStream({
            pull(controller) {
              if (reads++ === 0) controller.enqueue(prefix);
              else controller.error(Error('invented failure'));
            },
          })
        )
    );
    const result = await c.source.collect({ boundaryUtcMs: H });
    expect(result.receipt.failure).toBe('response-read-failed');
    expect(result.receipt.responseComplete).toBe(false);
    expect(result.receipt.retainedBytes).toBe(31);
    expect(result.receipt.responseBodyBase64).toBe(prefix.toString('base64'));
    expect(result.completedClose).toBeNull();
  });

  it('caps retained bytes, records oversize failure and never follows another page', async () => {
    const c = setup('x'.repeat(65_537));
    const result = await c.source.collect({ boundaryUtcMs: H });
    expect(result.receipt.failure).toBe('response-too-large');
    expect(result.receipt.receivedBytes).toBe(65_537);
    expect(result.receipt.retainedBytes).toBe(65_536);
    expect(Buffer.from(result.receipt.responseBodyBase64, 'base64')).toHaveLength(65_536);
    expect(result.receipt.responseComplete).toBe(false);
    expect(c.fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([302, 503])('retains HTTP %i as failure without redirect or fallback', async (status) => {
    const c = setup(() => new Response('retained error', { status }));
    const result = await c.source.collect({ boundaryUtcMs: H });
    expect(result.receipt.httpStatus).toBe(status);
    expect(result.receipt.failure).toBe(status === 302 ? 'redirect-disallowed' : 'http-status');
    expect(Buffer.from(result.receipt.responseBodyBase64, 'base64').toString()).toBe('retained error');
    expect(c.fetcher).toHaveBeenCalledTimes(1);
  });

  it.each(['fetch', 'body'] as const)(
    'times out an uncooperative %s without awaiting its cancellation',
    async (mode) => {
      const c = setup(
        () =>
          mode === 'fetch'
            ? new Promise<Response>(() => undefined)
            : new Response(
                new ReadableStream({
                  pull: () => new Promise<void>(() => undefined),
                  cancel: () => new Promise<void>(() => undefined),
                })
              ),
        { timeoutMs: 20 }
      );
      const result = await c.source.collect({ boundaryUtcMs: H });
      expect(result.receipt.failure).toBe('timeout');
      expect(result.receipt.responseComplete).toBe(false);
      expect(c.retained.size).toBe(2);
      expect(c.fetcher).toHaveBeenCalledTimes(1);
    }
  );

  it('responds to the caller shared abort signal and retains the interrupted attempt', async () => {
    const controller = new AbortController(),
      entered = deferred();
    const c = setup(
      () => {
        entered.resolve();
        return new Promise<Response>(() => undefined);
      },
      { signal: controller.signal }
    );
    const pending = c.source.collect({ boundaryUtcMs: H });
    await entered.promise;
    controller.abort();
    const result = await pending;
    expect(result.receipt.failure).toBe('aborted');
    expect(c.retained.size).toBe(2);
    expect(isAccumulationCloseSourceResult(result)).toBe(false);
  });

  it('checks monotonic time between immediately yielding chunks before timer callbacks can run', async () => {
    let ticks = 0n;
    const monotonic = vi.spyOn(process.hrtime, 'bigint').mockImplementation(() => (ticks += 10_000_000n));
    try {
      let produced = 0;
      const c = setup(
        () =>
          new Response(
            new ReadableStream<Uint8Array>({
              pull(controller) {
                if (produced++ < 100) controller.enqueue(Uint8Array.of(1, 2));
                else controller.close();
              },
            })
          ),
        { timeoutMs: 25 }
      );
      const result = await c.source.collect({ boundaryUtcMs: H });
      expect(result.receipt.failure).toBe('timeout');
      expect(result.receipt.receivedBytes).toBe(6);
      expect(result.receipt.retainedBytes).toBe(6);
      expect(result.receipt.responseComplete).toBe(false);
      expect(Buffer.from(result.receipt.responseBodyBase64, 'base64')).toEqual(Buffer.from([1, 2, 1, 2, 1, 2]));
      expect(c.retained.size).toBe(2);
      expect(isAccumulationCloseSourceResult(result)).toBe(false);
    } finally {
      monotonic.mockRestore();
    }
  });

  it('waits for durable intent before dispatch and outcome before returning ownership', async () => {
    const start = deferred(),
      end = deferred(),
      startEntered = deferred(),
      endEntered = deferred();
    const c = setup(undefined, {
      gate: async (name) => {
        if (name.endsWith('-start.json')) {
          startEntered.resolve();
          await start.promise;
        } else {
          endEntered.resolve();
          await end.promise;
        }
      },
    });
    let returned = false;
    const pending = c.source.collect({ boundaryUtcMs: H }).then((result) => {
      returned = true;
      return result;
    });
    await startEntered.promise;
    expect(c.fetcher).not.toHaveBeenCalled();
    start.resolve();
    await endEntered.promise;
    expect(c.fetcher).toHaveBeenCalledTimes(1);
    expect(returned).toBe(false);
    end.resolve();
    expect(isAccumulationCloseSourceResult(await pending)).toBe(true);
  });

  it('retains the captured receipt in a typed error when outcome durability is unknown', async () => {
    const c = setup(undefined, {
      gate: async (name) => {
        if (name.endsWith('-outcome.json')) throw Error('invented recorder failure');
      },
    });
    const error = await c.source.collect({ boundaryUtcMs: H }).catch((value) => value);
    expect(error).toBeInstanceOf(AccumulationCloseRetentionError);
    expect(error.retainedReceipt.responseComplete).toBe(true);
    expect(error.retainedReceipt.failure).toBeNull();
    expect(isAccumulationCloseSourceResult(error)).toBe(false);
    await expect(c.source.collect({ boundaryUtcMs: H })).rejects.toThrow('close-source-unavailable');
    expect(c.fetcher).toHaveBeenCalledTimes(1);
  });

  it('bounds a recorder that never acknowledges intent without ever fetching', async () => {
    const c = setup(undefined, { gate: () => new Promise(() => undefined), retentionTimeoutMs: 20 });
    await expect(c.source.collect({ boundaryUtcMs: H })).rejects.toBeInstanceOf(AccumulationCloseRetentionError);
    expect(c.fetcher).not.toHaveBeenCalled();
    expect(c.retained.size).toBe(0);
  });

  it('preserves actual regressing receipt clocks and refuses a close binding', async () => {
    const c = setup();
    vi.mocked(Date.now)
      .mockReturnValueOnce(H + 5000)
      .mockReturnValueOnce(H + 5000)
      .mockReturnValueOnce(H + 4000);
    const result = await c.source.collect({ boundaryUtcMs: H });
    expect(result.receipt.failure).toBe('clock-regression');
    expect(result.receipt.requestedAtMs).toBe(H + 5000);
    expect(result.receipt.completedAtMs).toBe(H + 4000);
    expect(result.completedClose).toBeNull();
  });
});
