import { describe, expect, it, vi } from 'vitest';
import {
  collectHistoricalGoalDay,
  HISTORICAL_GOAL_DAY_LIMITS,
  HistoricalGoalDayCollectionError,
  type HistoricalGoalDayInput,
  type HistoricalGoalDayArtifact,
  type HistoricalGoalDayOptions,
} from '../../../../scripts/bots/historical-goal-day-collector';
import { planHistoricalGoalSchedule } from '../../../../scripts/bots/historical-goal-schedule';
import { planHistoricalGoalTerminal } from '../../../../scripts/bots/historical-goal-terminal';
import type { HistoricalClockBlock } from '../../../../scripts/bots/historical-execution-clock';

const HOUR = 3_600_000,
  START = 500_000 * HOUR,
  DAY = 24 * HOUR;
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const hash = (value: number) => `0x${value.toString(16).padStart(64, '0')}`;
const KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';

function fixture(gap = false) {
  const block = (height: number): HistoricalClockBlock => ({
    height,
    hash: hash(height),
    parentHash: hash(height - 1),
    timestampMs: START + (height - 1000) * 6000 + (gap && height >= 1010 ? 18000 : 0),
  });
  const at = (offset: number) => block(1000 + Math.ceil((offset - (gap && offset >= 78000 ? 18000 : 0)) / 6000));
  const episode = { startedAtMs: START, endedAtMs: START + DAY };
  const signals = Array.from({ length: 24 }, (_, index) => {
    const successor = at(index * HOUR);
    return { completedAtMs: START + index * HOUR, closing: block(successor.height - 1), successor };
  });
  const schedule = planHistoricalGoalSchedule(
    signals,
    {
      version: 1,
      purpose: 'development',
      availability: 'assumed-after-successor-block',
      signalDelayMs: 60_000,
      executionDelayMs: 120_000,
      maximumExecutionLagMs: 12000,
    },
    episode,
    { cadenceMs: 60000, maximumLagMs: 12000 }
  );
  const input: HistoricalGoalDayInput = {
    source: {
      source: {
        finalizedSource: { hash: hash(50000), height: 50000, receiptSha256: 'a'.repeat(64) },
        schemaAnchor: { hash: hash(999), height: 999 },
      },
      expectedDenominator: '1',
    },
    schedule,
    terminalPolicy: planHistoricalGoalTerminal(episode, 12000),
    terminal: { observed: at(DAY), successor: block(at(DAY).height + 1) },
    schemaFingerprint: {
      metadataSha256: 'b'.repeat(64),
      codeHash: hash(100000),
      runtimeVersion: { specName: 'sora-substrate', specVersion: 130, transactionVersion: 130 },
    },
  };
  return { input, block };
}

function fake(
  input: HistoricalGoalDayInput,
  block: (height: number) => HistoricalClockBlock,
  config: {
    unavailable?: number;
    wrongContext?: boolean;
    wrongContextShard?: number;
    wrongMark?: boolean;
    failBlock?: boolean;
    failMarkAt?: number;
    initializationFetch?: boolean;
    onFirstRead?: () => void;
  } = {}
) {
  const artifacts: HistoricalGoalDayArtifact[] = [];
  const shards: { heights: Set<number>; marks: number[]; evidenceCalls: number }[] = [];
  let first = true;
  const factory = vi.fn(async (_source, options) => {
    if (config.initializationFetch) await options.fetch('https://mof2.sora.org/', { signal: options.signal });
    const shard = { heights: new Set<number>(), marks: [] as number[], evidenceCalls: 0 };
    shards.push(shard);
    const readBlock = vi.fn(async (height: number) => {
      if (first) {
        first = false;
        config.onFirstRead?.();
      }
      if (config.failBlock) throw new Error('private response text must not appear');
      shard.heights.add(height);
      if (shard.heights.size > 64) throw new Error('test shard overflow');
      return block(height);
    });
    return {
      context: {
        endpoint: 'https://mof2.sora.org/',
        genesisHash: GENESIS,
        ...input.source.source,
        expectedDenominator: '1',
        schema: {
          ...input.schemaFingerprint,
          metadataSha256:
            config.wrongContext || config.wrongContextShard === shards.length
              ? 'c'.repeat(64)
              : input.schemaFingerprint.metadataSha256,
        },
        maximumBlockReads: 64,
        maximumMarkReads: 64,
      },
      readBlock,
      readMark: async (height: number) => {
        const at = await readBlock(height);
        shard.marks.push(height);
        if (at.timestampMs === config.failMarkAt) throw new Error('private storage response');
        const present = at.timestampMs !== config.unavailable;
        const poolEvidence = {
          binding: {
            genesisHash: GENESIS,
            blockHash: at.hash,
            metadataSha256: input.schemaFingerprint.metadataSha256,
            metadataVersion: 14,
            runtimeVersion: { specVersion: 130, transactionVersion: 130 },
          },
          state: { timestampMs: at.timestampMs, denominator: '1' },
          basis: 'direct-pool-reserve-ratio',
          status: present ? 'present' : 'absent',
          pair: { baseAssetId: XOR, targetAssetId: KUSD, baseDecimals: 18, targetDecimals: 18 },
          accounts: present ? { reservesAccountId: hash(70000), feesAccountId: hash(70001) } : null,
          reserves: present ? { kusdCodec: '1000', xorCodec: '1000' } : null,
          marks: present
            ? {
                xorPerKusd: { numeratorCodec: '1000', denominatorCodec: '1000' },
                kusdPerXor: { numeratorCodec: '1000', denominatorCodec: '1000' },
              }
            : null,
          observedFill: false,
          transactionSubmitted: false,
        };
        return {
          block: at,
          poolEvidence,
          ...(present
            ? {
                mark: {
                  timestampMs: at.timestampMs,
                  blockHash: config.wrongMark ? hash(80000) : at.hash,
                  kusdReserveCodec: '1000',
                  xorReserveCodec: '1000',
                },
              }
            : {}),
        };
      },
      evidence: () => {
        shard.evidenceCalls++;
        return {
          blockReads: shard.heights.size,
          markReads: shard.marks.length,
          blockEvidence: [],
          storageEvidence: [],
        };
      },
    };
  }) as unknown as NonNullable<HistoricalGoalDayOptions['readerFactory']>;
  const sink = vi.fn(async (artifact: HistoricalGoalDayArtifact) => {
    artifacts.push(artifact);
  });
  return { artifacts, shards, factory, sink };
}

describe('bounded fixed-day historical collector', () => {
  it('retains all 1441 fixed marks and 24 clocks, rotates bounded shards, and shares metadata without hiding reattestations', async () => {
    const { input, block } = fixture();
    const run = fake(input, block);
    const result = await collectHistoricalGoalDay(input, { readerFactory: run.factory, sink: run.sink });
    expect(result.status).toBe('complete');
    expect(result.valuations).toHaveLength(1440);
    expect(result.executions).toHaveLength(24);
    expect(result.terminal.status).toBe('available');
    expect(result.counts).toMatchObject({
      marks: 1441,
      valuationsCompleted: 1441,
      executionClocksCompleted: 24,
      httpStarts: 0,
    });
    expect(result.counts.blockReads).toBe(run.shards.reduce((total, shard) => total + shard.heights.size, 0));
    expect(result.counts.blockReads).toBeLessThanOrEqual(8192);
    expect(result.counts.shards).toBe(run.shards.length);
    expect(run.shards.every((shard) => shard.heights.size <= 64 && shard.evidenceCalls === 1)).toBe(true);
    expect(run.artifacts.filter((artifact) => artifact.kind === 'shard')).toHaveLength(result.counts.shards);
    expect(run.artifacts.filter((artifact) => artifact.kind === 'valuation')).toHaveLength(1441);
    expect(result.valuations.map((row) => row.targetAtMs)).toEqual(
      input.schedule.valuations.slice(0, -1).map((row) => row.targetAtMs)
    );
    expect(Object.isFrozen(result.valuations[0])).toBe(true);
    expect(result).toMatchObject({ observedFill: false, transactionSubmitted: false });
  }, 20000);

  it('keeps one absent pool and one terminal absence explicit without changing targets', async () => {
    const { input, block } = fixture();
    for (const unavailable of [START + 60000, START + DAY]) {
      const run = fake(input, block, { unavailable });
      const result = await collectHistoricalGoalDay(input, { readerFactory: run.factory, sink: run.sink });
      expect(result.status).toBe('incomplete');
      expect(result.diagnostics).toEqual([{ targetAtMs: unavailable, reason: 'pool-absent' }]);
      expect(result.counts.marks).toBe(1441);
      if (unavailable === START + DAY) expect(result.terminal.status).toBe('unavailable');
      else expect(result.valuations[1].status).toBe('unavailable');
    }
  }, 20000);

  it('records an out-of-lag adjacent proof without reading that pool or retrying the target', async () => {
    const { input, block } = fixture(true);
    const run = fake(input, block);
    const result = await collectHistoricalGoalDay(input, { readerFactory: run.factory, sink: run.sink });
    expect(result.diagnostics).toEqual([{ targetAtMs: START + 60000, reason: 'valuation-lag-exceeded' }]);
    expect(result.valuations[1].status).toBe('unavailable');
    expect(result.counts.marks).toBe(1440);
    const evidence = run.artifacts.find((item) => item.kind === 'valuation' && item.targetAtMs === START + 60000);
    expect(evidence).toMatchObject({
      evidence: { diagnostic: { reason: 'lag-exceeded', location: { lagMs: 18000 } } },
    });
    expect(run.shards.flatMap((shard) => shard.marks)).not.toContain(1010);
  }, 20000);

  it('aborts a failed provider without retry, retains shard evidence, and excludes raw exception messages', async () => {
    const { input, block } = fixture();
    const run = fake(input, block, { failBlock: true });
    const error = await collectHistoricalGoalDay(input, { readerFactory: run.factory, sink: run.sink }).catch(
      (error) => error
    );
    expect(error).toBeInstanceOf(HistoricalGoalDayCollectionError);
    expect(error.diagnostic.reason).toBe('collection-failed');
    expect(run.shards.length).toBeLessThanOrEqual(4);
    expect(run.artifacts.filter((item) => item.kind === 'shard')).toHaveLength(run.shards.length);
    expect(run.artifacts.filter((item) => item.kind === 'failure')).toHaveLength(1);
    expect(JSON.stringify(run.artifacts)).not.toContain('private response');
  });

  it.each(['wrongContext', 'wrongMark'] as const)(
    'rejects %s before accepting contradictory marks',
    async (problem) => {
      const { input, block } = fixture();
      const run = fake(input, block, { [problem]: true });
      await expect(
        collectHistoricalGoalDay(input, { readerFactory: run.factory, sink: run.sink })
      ).rejects.toBeInstanceOf(HistoricalGoalDayCollectionError);
      expect(run.artifacts.some((item) => item.kind === 'valuation')).toBe(false);
      expect(run.artifacts.filter((item) => item.kind === 'shard').length).toBeGreaterThan(0);
    }
  );

  it('rejects a missing minute, changed terminal policy and data accessors before opening a reader', async () => {
    const { input, block } = fixture();
    const run = fake(input, block);
    const bad = structuredClone(input);
    (bad.schedule.valuations as unknown[]).splice(1, 1);
    await expect(collectHistoricalGoalDay(bad, { readerFactory: run.factory, sink: run.sink })).rejects.toThrow();
    await expect(
      collectHistoricalGoalDay(
        { ...input, terminalPolicy: planHistoricalGoalTerminal(input.schedule.episode, 60000) },
        { readerFactory: run.factory, sink: run.sink }
      )
    ).rejects.toThrow();
    const getter = vi.fn(() => input.schedule);
    const accessor = { ...input };
    Object.defineProperty(accessor, 'schedule', { get: getter, enumerable: true });
    await expect(collectHistoricalGoalDay(accessor, { readerFactory: run.factory, sink: run.sink })).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(run.factory).not.toHaveBeenCalled();
  });

  it('copies input before the first async read and aborts externally without replacement shards', async () => {
    const { input, block } = fixture();
    const mutable = structuredClone(input);
    const abort = new AbortController();
    const run = fake(input, block, {
      onFirstRead: () => {
        mutable.source.expectedDenominator = '2';
        abort.abort();
      },
    });
    await expect(
      collectHistoricalGoalDay(mutable, { readerFactory: run.factory, sink: run.sink, signal: abort.signal })
    ).rejects.toBeInstanceOf(HistoricalGoalDayCollectionError);
    expect(run.shards.length).toBeLessThanOrEqual(4);
    expect(run.artifacts.some((item) => item.kind === 'failure')).toBe(true);
  });

  it('paces all concurrent HTTP starts globally, including shard initialization', async () => {
    vi.useFakeTimers();
    try {
      const { input, block } = fixture();
      const run = fake(input, block, { initializationFetch: true });
      const starts: number[] = [];
      const transport = vi.fn(async () => {
        starts.push(Date.now());
        return new Response('{}');
      }) as typeof fetch;
      const pending = collectHistoricalGoalDay(input, {
        readerFactory: run.factory,
        sink: run.sink,
        fetch: transport,
      }).catch((error) => error);
      await vi.runAllTimersAsync();
      const result = await pending;
      expect(result.status).toBe('complete');
      expect(starts.length).toBeGreaterThan(4);
      expect(starts.every((at, index) => index === 0 || at - starts[index - 1] >= 125)).toBe(true);
      expect(result.counts.httpStarts).toBe(starts.length);
      expect(HISTORICAL_GOAL_DAY_LIMITS).toMatchObject({ hourLanes: 4, httpStartsPerSecond: 8, blocksPerShard: 64 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects a nonadjacent known parent across global cache/shard boundaries', async () => {
    const { input, block } = fixture();
    const run = fake(input, (height) =>
      height === 7010 ? { ...block(height), parentHash: hash(1000) } : block(height)
    );
    await expect(
      collectHistoricalGoalDay(input, { readerFactory: run.factory, sink: run.sink })
    ).rejects.toBeInstanceOf(HistoricalGoalDayCollectionError);
    expect(run.shards.length).toBeGreaterThan(4);
    expect(
      run.artifacts.filter((item) => item.kind === 'valuation' && item.targetAtMs === START + 10 * HOUR + 60000)
    ).toHaveLength(0);
  });

  it('rejects a changed later shard schema with no replacement for that shard', async () => {
    const { input, block } = fixture();
    const run = fake(input, block, { wrongContextShard: 5 });
    await expect(
      collectHistoricalGoalDay(input, { readerFactory: run.factory, sink: run.sink })
    ).rejects.toBeInstanceOf(HistoricalGoalDayCollectionError);
    const receipts = run.artifacts.filter((item) => item.kind === 'shard');
    expect(receipts.find((item) => item.kind === 'shard' && item.index === 5)).toMatchObject({ failed: true });
    expect(receipts).toHaveLength(run.shards.length);
    expect(new Set(receipts.map((item) => item.kind === 'shard' && item.index)).size).toBe(receipts.length);
  });

  it('retains the failed terminal shard exactly once and never substitutes the next block', async () => {
    const { input, block } = fixture();
    const run = fake(input, block, { failMarkAt: START + DAY });
    await expect(
      collectHistoricalGoalDay(input, { readerFactory: run.factory, sink: run.sink })
    ).rejects.toBeInstanceOf(HistoricalGoalDayCollectionError);
    const attempted = run.shards.flatMap((shard) => shard.marks);
    expect(attempted.filter((height) => height === input.terminal.observed.height)).toHaveLength(1);
    expect(attempted).not.toContain(input.terminal.successor.height);
    expect(run.artifacts.filter((item) => item.kind === 'shard')).toHaveLength(run.shards.length);
    expect(run.artifacts.some((item) => item.kind === 'valuation' && item.terminal)).toBe(false);
  });

  it('retains a real terminal timestamp before the fixed deadline and never reads successor reserves', async () => {
    const { input, block } = fixture();
    const atDeadline = input.terminal.observed.height;
    const shifted = (height: number) =>
      height === atDeadline ? { ...block(height), timestampMs: START + DAY + 2000 } : block(height);
    input.terminal = { observed: shifted(atDeadline - 1), successor: shifted(atDeadline) };
    const run = fake(input, shifted);
    const result = await collectHistoricalGoalDay(input, { readerFactory: run.factory, sink: run.sink });
    expect(result.status).toBe('complete');
    expect(result.terminal).toMatchObject({ status: 'available', mark: { timestampMs: START + DAY - 6000 } });
    expect(run.shards.flatMap((shard) => shard.marks)).not.toContain(atDeadline);
    expect(run.artifacts.find((item) => item.kind === 'valuation' && item.terminal)).toMatchObject({
      targetAtMs: START + DAY,
    });
  });
});
