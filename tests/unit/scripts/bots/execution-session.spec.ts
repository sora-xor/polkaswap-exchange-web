import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EXECUTION_EVIDENCE_ENDPOINT,
  EXECUTION_EVIDENCE_GENESIS,
  EXECUTION_EVIDENCE_KUSD as KUSD,
  EXECUTION_EVIDENCE_XOR as XOR,
  type ExecutionContext,
  type ExecutionRawQuote,
} from '../../../../scripts/bots/execution-evidence';
import type { ExecutionReader } from '../../../../scripts/bots/execution-reader';
import { createExecutionSession } from '../../../../scripts/bots/execution-session';

const NOW = 2_000_000;
const HASH = `0x${'ab'.repeat(32)}`;
const context: ExecutionContext = {
  endpoint: EXECUTION_EVIDENCE_ENDPOINT,
  genesisHash: EXECUTION_EVIDENCE_GENESIS,
  blockHash: HASH,
  blockNumber: 100,
  finalizedAt: NOW,
  denominator: '1',
  specVersion: 131,
  transactionVersion: 3,
  metadataHashAlgorithm: 'sha256',
  metadataHash: 'a'.repeat(64),
  metadataFormatVersion: 16,
  metadataReadMethod: 'Metadata_metadata_at_version',
  dexId: 0,
  allowedSourceTypes: ['XYKPool'],
  filterMode: 'AllowSelected',
  poolIdentity: 'exact-pool',
};

/** Synthetic raw SDK records only; this reader never contacts an endpoint. */
function quote(assetIn: string, assetOut: string, amountInCodec: string): ExecutionRawQuote {
  return {
    blockHash: HASH,
    assetIn,
    assetOut,
    assetInDecimals: 18,
    assetOutDecimals: 18,
    amountInCodec,
    amountOutCodec: '1000000000000000000',
    amountWithoutImpactCodec: '1010000000000000000',
    route: [assetIn, assetOut],
    routeFees: [],
    rawQuoteJson: {
      amount: '1000000000000000000',
      amountWithoutImpact: '1010000000000000000',
      route: [assetIn, assetOut],
      fee: {},
    },
    fee: {
      partialFeeCodec: '3',
      baseFeeCodec: '1',
      lenFeeCodec: '1',
      adjustedWeightFeeCodec: '1',
      tipCodec: '0',
      encodedLength: 208,
      callHex: '0x01020304',
      envelopeHashAlgorithm: 'sha256',
      envelopeHash: 'e'.repeat(64),
      blockHash: HASH,
      runtimeVersion: { specVersion: 131, transactionVersion: 3 },
      rawQueryInfo: { partialFee: '3' },
      rawFeeDetails: { inclusionFee: { baseFee: 1, lenFee: 1, adjustedWeightFee: 1 }, tip: 0 },
    },
  };
}

function reader(): ExecutionReader {
  return {
    context: vi.fn().mockResolvedValue(context),
    quote: vi.fn(async (_context, assetIn, assetOut, amount) => quote(assetIn, assetOut, amount)),
    assertUnchanged: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

/** Controllable transport work; never performs network requests. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

afterEach(() => vi.useRealTimers());

describe('exclusive read-only execution sessions', () => {
  it('reuses only the transport, while obtaining fresh context and all quotes and checks each slot', async () => {
    const rpc = reader();
    const factory = vi.fn().mockResolvedValue(rpc);
    let clock = NOW;
    const session = createExecutionSession(factory, () => clock);
    const first = await session.collect(NOW, 25000);
    clock += 30000;
    const second = await session.collect(clock, 25000);
    expect(first.status).toBe('complete');
    expect(second.status).toBe('complete');
    expect(factory).toHaveBeenCalledTimes(1);
    expect(rpc.context).toHaveBeenCalledTimes(2);
    expect(rpc.quote).toHaveBeenCalledTimes(4);
    expect(rpc.assertUnchanged).toHaveBeenCalledTimes(2);
    expect(rpc.close).not.toHaveBeenCalled();
    if (first.status !== 'complete' || second.status !== 'complete') throw new Error('Expected complete');
    expect(first.snapshot.readerTiming.reusedConnection).toBe(false);
    expect(second.snapshot.readerTiming.reusedConnection).toBe(true);
    expect(second.snapshot.readerTiming.connectionId).toBe(first.snapshot.readerTiming.connectionId);
    expect(second.snapshot.readerTiming.operations.map((row) => [row.operation, row.status])).toEqual([
      ['connect', 'complete'],
      ['context', 'complete'],
      ['buy', 'complete'],
      ['sell', 'complete'],
      ['continuity', 'complete'],
    ]);
    await session.close();
    expect(factory.mock.calls[0][0].aborted).toBe(true);
    expect(rpc.close).toHaveBeenCalledTimes(1);
  });

  it('retains fixed-lot amounts and delegates current context instead of caching old observations', async () => {
    const rpc = reader();
    const nextContext = { ...context, blockNumber: 101 };
    vi.mocked(rpc.context).mockResolvedValueOnce(context).mockResolvedValueOnce(nextContext);
    const session = createExecutionSession(
      async () => rpc,
      () => NOW
    );
    await session.collect(NOW, 25000);
    const result = await session.collect(NOW, 25000, {
      kind: 'fixed-frozen-lot',
      amountCodec: '9007199254740993001',
      frozenAt: NOW - 1,
      lotId: 'prior-lot',
    });
    expect(result.status).toBe('complete');
    if (result.status !== 'complete') throw new Error('Expected complete');
    expect(result.snapshot.context.blockNumber).toBe(101);
    expect(result.snapshot.sell.amountInCodec).toBe('9007199254740993001');
    expect(rpc.assertUnchanged).toHaveBeenLastCalledWith(nextContext);
    await session.close();
  });

  it('rejects concurrent leases without opening a second connection', async () => {
    const pending = deferred<ExecutionReader>();
    const factory = vi.fn(() => pending.promise);
    const session = createExecutionSession(factory, () => NOW);
    const first = session.collect(NOW, 25000);
    await expect(session.collect(NOW, 25000)).rejects.toThrow('active observation');
    const rpc = reader();
    pending.resolve(rpc);
    expect((await first).status).toBe('complete');
    expect(factory).toHaveBeenCalledTimes(1);
    await session.close();
  });

  it('freezes the reverse lot before waiting for connection setup', async () => {
    const pending = deferred<ExecutionReader>();
    const session = createExecutionSession(
      () => pending.promise,
      () => NOW
    );
    const lot = {
      kind: 'fixed-frozen-lot' as const,
      amountCodec: '9007199254740993001',
      frozenAt: NOW - 1,
      lotId: 'original',
    };
    const running = session.collect(NOW, 25000, lot);
    lot.amountCodec = '1';
    lot.lotId = 'mutated';
    pending.resolve(reader());
    const result = await running;
    expect(result.status).toBe('complete');
    if (result.status !== 'complete') throw new Error('Expected complete');
    expect(result.snapshot.reverseLot).toEqual({
      kind: 'fixed-frozen-lot',
      amountCodec: '9007199254740993001',
      frozenAt: NOW - 1,
      lotId: 'original',
    });
    await session.close();
  });

  it('rejects invalid lot input before connecting', async () => {
    const factory = vi.fn();
    const session = createExecutionSession(factory, () => NOW);
    await expect(
      session.collect(NOW, 25000, {
        kind: 'fixed-frozen-lot',
        amountCodec: '0',
        frozenAt: NOW - 1,
        lotId: 'invalid',
      })
    ).rejects.toThrow('Invalid execution evidence');
    expect(factory).not.toHaveBeenCalled();
  });

  it('enforces elapsed time even when synchronous work prevents the deadline timer from firing', async () => {
    const rpc = reader();
    let clock = NOW;
    vi.mocked(rpc.assertUnchanged).mockImplementation(async () => {
      clock += 101;
    });
    const factory = vi.fn().mockResolvedValue(rpc);
    const session = createExecutionSession(factory, () => clock);
    const result = await session.collect(NOW, 100);
    expect(result.status).toBe('error');
    if (result.status !== 'error') throw new Error('Expected error');
    expect(result.code).toBe('timeout');
    expect(result.message).toBe('Observation deadline exceeded');
    expect(factory.mock.calls[0][0].aborted).toBe(true);
    await session.close();
  });

  it.each(['context', 'quote', 'assertUnchanged'] as const)(
    'discards the connection after %s failure and reconnects only for the next slot',
    async (method) => {
      const bad = reader(),
        good = reader();
      vi.mocked(bad[method]).mockRejectedValueOnce(new Error('Runtime or metadata changed'));
      const factory = vi.fn().mockResolvedValueOnce(bad).mockResolvedValueOnce(good);
      const session = createExecutionSession(factory, () => NOW);
      const result = await session.collect(NOW, 25000);
      expect(result.status).toBe('error');
      expect(factory).toHaveBeenCalledTimes(1);
      expect(factory.mock.calls[0][0].aborted).toBe(true);
      if (result.status !== 'error') throw new Error('Expected error');
      expect(result.progress.operations.at(-1)?.status).toBe('error');
      expect(result.message).toContain('Runtime or metadata changed');
      expect((await session.collect(NOW, 25000)).status).toBe('complete');
      expect(factory).toHaveBeenCalledTimes(2);
      await session.close();
    }
  );

  it('retains the completed quotes and unfinished continuity interval on timeout', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const rpc = reader();
    const pending = deferred<void>();
    vi.mocked(rpc.assertUnchanged).mockReturnValue(pending.promise);
    const factory = vi.fn().mockResolvedValue(rpc);
    const session = createExecutionSession(factory);
    const collecting = session.collect(NOW, 100);
    await vi.advanceTimersByTimeAsync(100);
    const result = await collecting;
    expect(result.status).toBe('error');
    if (result.status !== 'error') throw new Error('Expected error');
    expect(result.code).toBe('timeout');
    expect(result.progress.stage).toBe('continuity');
    expect(result.progress.buy?.amountInCodec).toBe('5000000000000000000');
    expect(result.progress.sell?.amountInCodec).toBe('995000000000000000');
    expect(result.progress.operations.at(-1)).toEqual({
      operation: 'continuity',
      startedAt: NOW,
      status: 'pending',
      blockHash: HASH,
    });
    expect(factory.mock.calls[0][0].aborted).toBe(true);
    expect(rpc.close).toHaveBeenCalledTimes(1);
    const copy = JSON.stringify(result);
    pending.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(JSON.stringify(result)).toBe(copy);
    await session.close();
  });

  it('isolates late quote callbacks and results from the next connection and retained error', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const old = reader(),
      next = reader();
    const pending = deferred<ExecutionRawQuote>();
    let emit: ((partial: Record<string, unknown>) => void) | undefined;
    vi.mocked(old.quote).mockImplementation((_context, _in, _out, _amount, callback) => {
      emit = callback;
      emit?.({ received: 'before-timeout' });
      return pending.promise;
    });
    const factory = vi.fn().mockResolvedValueOnce(old).mockResolvedValueOnce(next);
    const session = createExecutionSession(factory);
    const first = session.collect(NOW, 100);
    await vi.advanceTimersByTimeAsync(100);
    const error = await first;
    expect(error.status).toBe('error');
    if (error.status !== 'error') throw new Error('Expected error');
    expect(error.progress.partial).toEqual({ received: 'before-timeout' });
    const copy = JSON.stringify(error);
    const second = session.collect(Date.now(), 100);
    emit?.({ received: 'after-timeout' });
    pending.resolve(quote(KUSD, XOR, '5000000000000000000'));
    expect((await second).status).toBe('complete');
    expect(JSON.stringify(error)).toBe(copy);
    expect(old.quote).toHaveBeenCalledTimes(1);
    expect(old.assertUnchanged).not.toHaveBeenCalled();
    expect(factory).toHaveBeenCalledTimes(2);
    await session.close();
  });

  it('aborts timed-out initialization, reconnects once and closes the late old reader', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const pending = deferred<ExecutionReader>();
    const late = reader(),
      good = reader();
    const factory = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValueOnce(good);
    const session = createExecutionSession(factory);
    const first = session.collect(NOW, 100);
    await vi.advanceTimersByTimeAsync(100);
    expect((await first).status).toBe('error');
    expect(factory.mock.calls[0][0].aborted).toBe(true);
    expect((await session.collect(Date.now(), 100)).status).toBe('complete');
    pending.resolve(late);
    await vi.advanceTimersByTimeAsync(0);
    expect(late.context).not.toHaveBeenCalled();
    expect(late.close).toHaveBeenCalledTimes(1);
    expect(good.close).not.toHaveBeenCalled();
    await session.close();
  });

  it('releases failed initialization without poisoning the next lease', async () => {
    const rpc = reader();
    const factory = vi.fn().mockRejectedValueOnce(new Error('connect failed')).mockResolvedValueOnce(rpc);
    const session = createExecutionSession(factory, () => NOW);
    expect((await session.collect(NOW, 25000)).status).toBe('error');
    expect((await session.collect(NOW, 25000)).status).toBe('complete');
    expect(factory).toHaveBeenCalledTimes(2);
    await session.close();
  });

  it('shutdown promptly cancels a stuck initialization and prohibits future collection', async () => {
    const pending = deferred<ExecutionReader>();
    const factory = vi.fn((_signal: AbortSignal) => pending.promise);
    const session = createExecutionSession(factory, () => NOW);
    const running = session.collect(NOW, 25000);
    await session.close();
    await session.close();
    const result = await running;
    expect(result.status).toBe('error');
    expect(factory.mock.calls[0][0].aborted).toBe(true);
    await expect(session.collect(NOW, 25000)).rejects.toThrow('closed');
    const late = reader();
    pending.resolve(late);
    await pending.promise;
    await Promise.resolve();
    expect(late.close).toHaveBeenCalledTimes(1);
  });

  it('does not reuse a connection after malformed quote data fails validation', async () => {
    const bad = reader(),
      good = reader();
    vi.mocked(bad.quote).mockResolvedValueOnce({ ...quote(KUSD, XOR, '5000000000000000000'), amountOutCodec: '0' });
    const factory = vi.fn().mockResolvedValueOnce(bad).mockResolvedValueOnce(good);
    const session = createExecutionSession(factory, () => NOW);
    expect((await session.collect(NOW, 25000)).status).toBe('error');
    expect((await session.collect(NOW, 25000)).status).toBe('complete');
    expect(factory).toHaveBeenCalledTimes(2);
    await session.close();
  });

  it('retains a clock regression as a failed observation and discards the connection', async () => {
    const factory = vi.fn().mockResolvedValue(reader());
    let calls = 0;
    const session = createExecutionSession(factory, () => (++calls <= 2 ? NOW : NOW - 1));
    const result = await session.collect(NOW, 25000);
    expect(result.status).toBe('error');
    if (result.status !== 'error') throw new Error('Expected error');
    expect(result.message).toContain('clock regressed');
    expect(result.progress.clockRegressed).toBe(true);
    expect(factory.mock.calls[0][0].aborted).toBe(true);
    await session.close();
  });

  it.each([0, -1, 25001, NaN, Infinity, 0.5])('rejects invalid deadline %s before connection', async (deadline) => {
    const factory = vi.fn();
    const session = createExecutionSession(factory, () => NOW);
    await expect(session.collect(NOW, deadline)).rejects.toThrow('schedule');
    expect(factory).not.toHaveBeenCalled();
  });

  it.each([0, -1, NaN, Infinity, 0.5])('rejects invalid slot %s before connection', async (slot) => {
    const factory = vi.fn();
    const session = createExecutionSession(factory, () => NOW);
    await expect(session.collect(slot, 25000)).rejects.toThrow('schedule');
    expect(factory).not.toHaveBeenCalled();
  });

  it.each([NOW - 1, NaN, Infinity, 0.5])('rejects invalid initial clock %s before connection', async (clock) => {
    const factory = vi.fn();
    const session = createExecutionSession(factory, () => clock);
    await expect(session.collect(NOW, 25000)).rejects.toThrow('clock');
    expect(factory).not.toHaveBeenCalled();
  });
});
