import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  readHistoricalGoalBoundFee,
  HistoricalGoalBoundFeeReadError,
  type HistoricalGoalBoundFeeReadOptions,
} from '../../../../scripts/bots/historical-goal-bound-fee-reader';
import { applyHistoricalGoalBoundFee } from '../../../../scripts/bots/historical-goal-bound-fee';
import { createHistoricalBoundFeeFixture, clone, feeBytes } from './fixtures/historical-goal-bound-fee-fixture';

type Fixture = ReturnType<typeof createHistoricalBoundFeeFixture>;
const ENDPOINT = 'https://mof2.sora.org/';
const body = (id: number, result: string) => JSON.stringify({ jsonrpc: '2.0', id, result });
const response = (id: number, result: string) => new Response(body(id, result));
const mock = (fixture: Fixture) =>
  vi.fn(async (_url: unknown, init?: RequestInit) => {
    const request = JSON.parse(init!.body as string);
    return response(
      request.id,
      request.id === 1 ? fixture.receipt.queries.info.resultHex : fixture.receipt.queries.details.resultHex
    );
  });

async function failed(pending: Promise<unknown>) {
  const error = await pending.then(
    () => {
      throw new Error('Expected failure');
    },
    (error) => error
  );
  expect(error).toBeInstanceOf(HistoricalGoalBoundFeeReadError);
  return error as HistoricalGoalBoundFeeReadError;
}

describe('pinned historical bounded-fee reader', () => {
  it.each([false, true])(
    'performs exactly two pinned calls for reverse=%s and joins the retained receipt',
    async (reverse) => {
      const fixture = createHistoricalBoundFeeFixture(reverse);
      const transport = mock(fixture);
      const result = await readHistoricalGoalBoundFee(fixture.source, { fetch: transport as typeof fetch });
      expect(result.receipt).toEqual(fixture.receipt);
      expect(result.info.partialFeeCodec).toBe('11');
      expect(result.details.finalFee).toBe('11');
      expect(result).toMatchObject({
        actualCanonicalFinalityVerifiedHere: false,
        feeAdequacyVerified: false,
        transactionSubmitted: false,
      });
      expect(transport).toHaveBeenCalledTimes(2);
      for (let index = 0; index < 2; index++) {
        const [url, init] = transport.mock.calls[index];
        expect(url).toBe(ENDPOINT);
        expect(init).toMatchObject({ method: 'POST', redirect: 'error', credentials: 'omit' });
        expect(JSON.parse(init!.body as string)).toEqual({
          jsonrpc: '2.0',
          id: index + 1,
          method: 'state_call',
          params: Object.values(result.receipt.queries)[index].params,
        });
        const row = result.rpcEvidence[index];
        expect(row.responseComplete).toBe(true);
        expect(row.responseSha256).toBe(createHash('sha256').update(row.responseBody!).digest('hex'));
        expect(row.retainedBytes).toBe(Buffer.byteLength(row.responseBody!));
      }
      const joined = applyHistoricalGoalBoundFee(fixture.prepared, fixture.source, result.receipt);
      expect(joined.kind === 'ready' && joined.fill.feeCodec).toBe('11');
      for (const value of [
        result,
        result.receipt,
        result.receipt.queries,
        result.rpcEvidence,
        result.rpcEvidence[0],
        result.info,
        result.info.rawQueryInfo,
        result.details.inclusionFee,
        result.sourceBinding.request,
      ])
        expect(Object.isFrozen(value)).toBe(true);
    }
  );

  it('detaches the original source before transport can mutate it', async () => {
    const fixture = createHistoricalBoundFeeFixture();
    const source = clone(fixture.source);
    const transport = mock(fixture);
    const result = await readHistoricalGoalBoundFee(source, {
      fetch: vi.fn(async (url, init) => {
        source.request.amountInCodec = '1';
        source.identity.runtimeVersion.specVersion = 131;
        return transport(url, init);
      }) as typeof fetch,
    });
    expect(result.receipt.envelope).toEqual(fixture.receipt.envelope);
    expect(result.sourceBinding.runtimeVersion.specVersion).toBe(130);
  });

  it('does not apply a price-impact acceptance filter to the supplied original fee query', async () => {
    const fixture = createHistoricalBoundFeeFixture();
    fixture.source.quoteEvidence.quote.amountWithoutImpactCodec = (
      BigInt(fixture.source.request.quotedAmountOutCodec) * 2n
    ).toString();
    const transport = mock(fixture);
    const result = await readHistoricalGoalBoundFee(fixture.source, { fetch: transport as typeof fetch });
    expect(result.receipt).toEqual(fixture.receipt);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it('retains the first complete receipt when the second call fails without retries', async () => {
    const fixture = createHistoricalBoundFeeFixture();
    const transport = vi.fn(async (_url, init) => {
      const id = JSON.parse(init!.body as string).id;
      if (id === 2) throw new Error('private transport detail');
      return response(id, fixture.receipt.queries.info.resultHex);
    }) as typeof fetch;
    const error = await failed(readHistoricalGoalBoundFee(fixture.source, { fetch: transport }));
    expect(error.diagnostic).toMatchObject({ stage: 'details', reason: 'rpc-failed' });
    expect(error.diagnostic.rpcEvidence).toHaveLength(2);
    expect(error.diagnostic.rpcEvidence[0].responseComplete).toBe(true);
    expect(error.diagnostic.rpcEvidence[1].failure).toBe('rpc-failed');
    expect(transport).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(error.diagnostic)).not.toContain('private transport');
  });

  it('rejects changed original binding and accessors before transport and never invokes getters', async () => {
    const fixture = createHistoricalBoundFeeFixture();
    const transport = mock(fixture);
    const changed = clone(fixture.source);
    changed.request.amountInCodec = '1';
    expect(
      (await failed(readHistoricalGoalBoundFee(changed, { fetch: transport as typeof fetch }))).diagnostic.reason
    ).toBe('invalid-input');
    const getter = vi.fn();
    const poison = Object.defineProperty({}, 'fetch', { enumerable: true, get: getter });
    await failed(readHistoricalGoalBoundFee(fixture.source, poison));
    expect(getter).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
    for (const timeoutMs of [0, 999, 30001, 1.5, NaN])
      await failed(readHistoricalGoalBoundFee(fixture.source, { fetch: transport as typeof fetch, timeoutMs }));
    expect(transport).not.toHaveBeenCalled();
    const stopped = new AbortController();
    stopped.abort();
    for (const options of [{ fetch: null }, { timeoutMs: null }]) {
      const error = await failed(
        readHistoricalGoalBoundFee(fixture.source, {
          ...options,
          signal: stopped.signal,
        } as unknown as HistoricalGoalBoundFeeReadOptions)
      );
      expect(error.diagnostic.reason).toBe('invalid-input');
    }
  });

  it('retains both raw calls and rejects contradictory fee decodes', async () => {
    const fixture = createHistoricalBoundFeeFixture();
    const transport = vi.fn(async (_url, init) => {
      const id = JSON.parse(init!.body as string).id;
      return response(id, id === 1 ? fixture.receipt.queries.info.resultHex : feeBytes(1, 8, 3));
    }) as typeof fetch;
    const error = await failed(readHistoricalGoalBoundFee(fixture.source, { fetch: transport }));
    expect(error.diagnostic).toMatchObject({ stage: 'decode', reason: 'fee-mismatch' });
    expect(error.diagnostic.rpcEvidence).toHaveLength(2);
    expect(error.diagnostic.rpcEvidence.every((row) => row.responseComplete && row.responseSha256)).toBe(true);
  });

  it.each(['id', 'version', 'error', 'extra', 'hex', 'http'] as const)(
    'retains and rejects invalid %s response without a second call',
    async (kind) => {
      const fixture = createHistoricalBoundFeeFixture();
      const value: Record<string, unknown> = { jsonrpc: '2.0', id: 1, result: fixture.receipt.queries.info.resultHex };
      if (kind === 'id') value.id = 2;
      if (kind === 'version') value.jsonrpc = '1.0';
      if (kind === 'error') value.error = { code: -1, message: 'synthetic failure' };
      if (kind === 'extra') value.extra = true;
      if (kind === 'hex') value.result = '0x1';
      const transport = vi.fn(async () => new Response(JSON.stringify(value), { status: kind === 'http' ? 500 : 200 }));
      const error = await failed(readHistoricalGoalBoundFee(fixture.source, { fetch: transport as typeof fetch }));
      expect(error.diagnostic).toMatchObject({ stage: 'info', reason: 'rpc-failed' });
      expect(error.diagnostic.rpcEvidence[0].responseBody).toBe(JSON.stringify(value));
      expect(transport).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['redirected', 'url', 'length'] as const)(
    'cancels disallowed %s responses before consuming their body',
    async (kind) => {
      const fixture = createHistoricalBoundFeeFixture();
      const cancel = vi.fn();
      const result = new Response(new ReadableStream({ cancel }));
      if (kind === 'redirected') Object.defineProperty(result, 'redirected', { value: true });
      if (kind === 'url') Object.defineProperty(result, 'url', { value: 'https://example.test/' });
      if (kind === 'length') result.headers.set('content-length', '65537');
      const transport = vi.fn(async () => result);
      const error = await failed(readHistoricalGoalBoundFee(fixture.source, { fetch: transport as typeof fetch }));
      expect(error.diagnostic.reason).toBe(kind === 'length' ? 'response-limit' : 'rpc-failed');
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(transport).toHaveBeenCalledTimes(1);
    }
  );

  it('caps an oversized streamed response prefix and labels it incomplete', async () => {
    const fixture = createHistoricalBoundFeeFixture();
    const cancel = vi.fn();
    const bytes = new Uint8Array(70000).fill(65);
    const transport = vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(c) {
              c.enqueue(bytes);
            },
            cancel,
          })
        )
    );
    const error = await failed(readHistoricalGoalBoundFee(fixture.source, { fetch: transport as typeof fetch }));
    expect(error.diagnostic.reason).toBe('response-limit');
    expect(error.diagnostic.rpcEvidence[0]).toMatchObject({
      responseComplete: false,
      responseBytes: 70000,
      retainedBytes: 65536,
    });
    expect(error.diagnostic.rpcEvidence[0].responseBody).toHaveLength(65536);
    expect(cancel).toHaveBeenCalled();
  });

  it('retains invalid UTF-8 as bounded base64 with an exact byte hash', async () => {
    const fixture = createHistoricalBoundFeeFixture();
    const bytes = Uint8Array.of(0xff, 0xfe);
    const error = await failed(
      readHistoricalGoalBoundFee(fixture.source, { fetch: vi.fn(async () => new Response(bytes)) as typeof fetch })
    );
    expect(error.diagnostic.rpcEvidence[0]).toMatchObject({
      responseComplete: true,
      responseBodyBase64: Buffer.from(bytes).toString('base64'),
      responseSha256: createHash('sha256').update(bytes).digest('hex'),
    });
    expect(error.diagnostic.rpcEvidence[0]).not.toHaveProperty('responseBody');
  });

  it('bounds empty-chunk streams even when byte limits and timeout callbacks cannot make progress', async () => {
    const fixture = createHistoricalBoundFeeFixture();
    const cancel = vi.fn();
    const transport = vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            pull(c) {
              c.enqueue(new Uint8Array());
            },
            cancel,
          })
        )
    );
    const error = await failed(readHistoricalGoalBoundFee(fixture.source, { fetch: transport as typeof fetch }));
    expect(error.diagnostic.reason).toBe('response-limit');
    expect(error.diagnostic.rpcEvidence[0]).toMatchObject({
      responseComplete: false,
      responseBytes: 0,
      retainedBytes: 0,
    });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('bounds stalled fetches, cancels a late body and never mutates the returned diagnostic', async () => {
    vi.useFakeTimers();
    try {
      const fixture = createHistoricalBoundFeeFixture();
      let finish!: (response: Response) => void;
      const transport = vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          })
      );
      const pending = failed(
        readHistoricalGoalBoundFee(fixture.source, { fetch: transport as typeof fetch, timeoutMs: 1000 })
      );
      await vi.advanceTimersByTimeAsync(1000);
      const error = await pending;
      expect(error.diagnostic.reason).toBe('timeout');
      const before = JSON.stringify(error.diagnostic);
      const cancel = vi.fn();
      finish(new Response(new ReadableStream({ cancel })));
      await vi.runAllTimersAsync();
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(error.diagnostic)).toBe(before);
      expect(transport).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(['timeout', 'external'] as const)(
    'cancels a stalled body on %s and retains the completed prefix',
    async (kind) => {
      vi.useFakeTimers();
      try {
        const fixture = createHistoricalBoundFeeFixture();
        const abort = new AbortController();
        const cancel = vi.fn();
        const transport = vi.fn(
          async () =>
            new Response(
              new ReadableStream({
                start(c) {
                  c.enqueue(new TextEncoder().encode('{"partial":'));
                },
                cancel,
              })
            )
        );
        const pending = failed(
          readHistoricalGoalBoundFee(fixture.source, {
            fetch: transport as typeof fetch,
            timeoutMs: 1000,
            signal: abort.signal,
          })
        );
        await vi.advanceTimersByTimeAsync(1);
        if (kind === 'external') abort.abort();
        else await vi.advanceTimersByTimeAsync(999);
        const error = await pending;
        expect(error.diagnostic.reason).toBe(kind === 'external' ? 'aborted' : 'timeout');
        expect(error.diagnostic.rpcEvidence[0]).toMatchObject({ responseComplete: false, responseBody: '{"partial":' });
        expect(cancel).toHaveBeenCalledTimes(1);
        expect(transport).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    }
  );

  it('does not call transport when already aborted and sanitizes a thrown transport exception', async () => {
    const fixture = createHistoricalBoundFeeFixture();
    const abort = new AbortController();
    abort.abort();
    const transport = vi.fn(async () => {
      throw new Error('private exception');
    });
    expect(
      (
        await failed(
          readHistoricalGoalBoundFee(fixture.source, { fetch: transport as typeof fetch, signal: abort.signal })
        )
      ).diagnostic.reason
    ).toBe('aborted');
    expect(transport).not.toHaveBeenCalled();
    const error = await failed(readHistoricalGoalBoundFee(fixture.source, { fetch: transport as typeof fetch }));
    expect(error.diagnostic.reason).toBe('rpc-failed');
    expect(JSON.stringify(error.diagnostic)).not.toContain('private exception');
  });
});
