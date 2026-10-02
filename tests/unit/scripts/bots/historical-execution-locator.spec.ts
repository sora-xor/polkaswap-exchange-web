import { describe, expect, it, vi } from 'vitest';
import {
  planHistoricalExecutionClock,
  type HistoricalClockBlock,
  type HistoricalClockPolicy,
} from '../../../../scripts/bots/historical-execution-clock';
import {
  HistoricalExecutionLocateError,
  locateHistoricalExecutionBlock,
} from '../../../../scripts/bots/historical-execution-locator';

const HOUR = 3_600_000;
const start = 500_000 * HOUR;
const hash = (height: number) => `0x${height.toString(16).padStart(64, '0')}`;
const block = (height: number, timestampMs = start + (height - 11) * 6_000): HistoricalClockBlock => ({
  hash: hash(height),
  parentHash: hash(height - 1),
  height,
  timestampMs,
});
const plan = (overrides: Partial<HistoricalClockPolicy> = {}) =>
  planHistoricalExecutionClock(
    { completedAtMs: start, closing: block(10), successor: block(11) },
    {
      version: 1,
      purpose: 'development',
      availability: 'assumed-after-successor-block',
      signalDelayMs: 60_000,
      executionDelayMs: 12_000,
      maximumExecutionLagMs: 6_000,
      ...overrides,
    },
    { startedAtMs: start, endedAtMs: start + 24 * HOUR }
  );
const archive = () => vi.fn(async (height: number) => block(height));

async function failure(pending: Promise<unknown>) {
  try {
    await pending;
  } catch (error) {
    expect(error).toBeInstanceOf(HistoricalExecutionLocateError);
    return error as HistoricalExecutionLocateError;
  }
  throw new Error('Expected location failure');
}

describe('historical execution block locator', () => {
  it('revalidates all anchors and locates the exact target with retained metadata-only provenance', async () => {
    const readBlock = archive();
    const result = await locateHistoricalExecutionBlock(plan(), block(50), readBlock);
    expect(readBlock.mock.calls.slice(0, 3)).toEqual([[10], [11], [50]]);
    expect(result.previous).toEqual(block(22));
    expect(result.execution).toEqual(block(23));
    expect(result.clock).toEqual({
      kind: 'hypothetical-archived-quote-state',
      executionAtMs: start + 72_000,
      lagMs: 0,
      observedFill: false,
    });
    expect(result).toMatchObject({
      canonicality: 'caller-attested-under-monotonic-canonical-timestamps',
      observedFill: false,
      transactionSubmitted: false,
    });
    expect(result.reads.map((item) => item.height)).toEqual(readBlock.mock.calls.map(([height]) => height));
    expect(result.reads.every((item) => item.status === 'read' && Object.isFrozen(item.block))).toBe(true);
    expect(Object.isFrozen(result.reads)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('accepts an immediate successor child and the first block just after the target', async () => {
    const immediate = await locateHistoricalExecutionBlock(
      plan({ signalDelayMs: 0, executionDelayMs: 6_000 }),
      block(12),
      archive()
    );
    expect(immediate.reads.map((item) => item.height)).toEqual([10, 11, 12]);
    expect(immediate.previous.height).toBe(11);
    expect(immediate.execution.height).toBe(12);
    const after = await locateHistoricalExecutionBlock(plan({ executionDelayMs: 12_001 }), block(50), archive());
    expect(after.execution.height).toBe(24);
    expect(after.clock.lagMs).toBe(5_999);
  });

  it.each([10, 11, 50])('rejects changed supplied block identity at height %s before searching', async (changed) => {
    const readBlock = vi.fn(async (height: number) =>
      height === changed ? { ...block(height), hash: hash(90) } : block(height)
    );
    const error = await failure(locateHistoricalExecutionBlock(plan(), block(50), readBlock));
    expect(error.diagnostic).toMatchObject({ stage: 'anchors', reason: 'identity-mismatch' });
    expect(error.diagnostic.reads.at(-1)?.height).toBe(changed);
    expect(readBlock.mock.calls.length).toBe([10, 11, 50].indexOf(changed) + 1);
  });

  it.each(['missing', 'throw', 'invalid', 'wrong-height'])(
    'preserves a %s read failure without retry or replacement state',
    async (kind) => {
      const readBlock = vi.fn(async (height: number) => {
        if (height !== 30) return block(height);
        if (kind === 'missing') return null;
        if (kind === 'throw') throw new Error('Injected transport error');
        if (kind === 'invalid') return { ...block(height), timestampMs: NaN };
        return block(31);
      });
      const error = await failure(locateHistoricalExecutionBlock(plan(), block(50), readBlock));
      const reasons = {
        missing: 'missing-block',
        throw: 'read-failed',
        invalid: 'invalid-block',
        'wrong-height': 'height-mismatch',
      };
      expect(error.diagnostic).toMatchObject({ stage: 'search', reason: reasons[kind as keyof typeof reasons] });
      expect(readBlock.mock.calls).toEqual([[10], [11], [50], [30]]);
      expect(error.diagnostic.reads.at(-1)?.height).toBe(30);
      expect(Object.isFrozen(error.diagnostic)).toBe(true);
      expect(Object.isFrozen(error.diagnostic.reads)).toBe(true);
    }
  );

  it.each(['timestamp', 'hash', 'parent', 'adjacent-parent'])(
    'rejects observed %s contradictions without concealing them behind binary search',
    async (kind) => {
      const readBlock = vi.fn(async (height: number) => {
        const value = block(height);
        if (height === 30) {
          if (kind === 'timestamp') value.timestampMs = start;
          if (kind === 'hash') value.hash = hash(11);
          if (kind === 'parent') value.parentHash = hash(10);
        }
        if (kind === 'adjacent-parent' && height === 23) value.parentHash = hash(99);
        return value;
      });
      const error = await failure(locateHistoricalExecutionBlock(plan(), block(50), readBlock));
      expect(error.diagnostic.reason).toBe(
        kind === 'timestamp' ? 'nonmonotonic-timestamp' : kind === 'hash' ? 'duplicate-hash' : 'parent-mismatch'
      );
      expect(error.diagnostic.reads.at(-1)?.block).toBeTruthy();
    }
  );

  it('rejects reverse parent references to a newly observed block at the wrong height', async () => {
    const upper = { ...block(50), parentHash: hash(30) };
    const readBlock = vi.fn(async (height: number) => (height === 50 ? upper : block(height)));
    const error = await failure(locateHistoricalExecutionBlock(plan(), upper, readBlock));
    expect(error.diagnostic.reason).toBe('parent-mismatch');
    expect(readBlock.mock.calls.at(-1)).toEqual([30]);
  });

  it('rejects a target outside the explicit upper bound without reading an alternative', async () => {
    const readBlock = archive();
    const error = await failure(locateHistoricalExecutionBlock(plan(), block(22), readBlock));
    expect(error.diagnostic.reason).toBe('target-after-upper');
    expect(error.diagnostic.reads).toEqual([]);
    expect(readBlock).not.toHaveBeenCalled();
  });

  it('preserves excessive lag and the fixed episode deadline as failures', async () => {
    const readGap = vi.fn(async (height: number) => block(height, start + (height - 11) * 120_000));
    const gapPlan = plan({ signalDelayMs: 0, executionDelayMs: 1_000 });
    readGap.mockImplementation(async (height: number) =>
      height === 10 ? block(10) : block(height, start + (height - 11) * 120_000)
    );
    expect(
      (await failure(locateHistoricalExecutionBlock(gapPlan, block(12, start + 120_000), readGap))).diagnostic.reason
    ).toBe('clock-rejected');

    const closing = block(10, start + 23 * HOUR - 1);
    const successor = block(11, start + 24 * HOUR - 2);
    const deadlinePlan = planHistoricalExecutionClock(
      { completedAtMs: start + 23 * HOUR, closing, successor },
      { ...plan().policy, signalDelayMs: 0, executionDelayMs: 1 },
      plan().episode
    );
    const upper = block(12, start + 24 * HOUR);
    const readDeadline = vi.fn(async (height: number) => ({ 10: closing, 11: successor, 12: upper })[height]!);
    expect((await failure(locateHistoricalExecutionBlock(deadlinePlan, upper, readDeadline))).diagnostic.reason).toBe(
      'clock-rejected'
    );
  });

  it('copies caller inputs and callback values before subsequent awaits can mutate them', async () => {
    const input = structuredClone(plan());
    const upper = block(50);
    const returned: HistoricalClockBlock[] = [];
    const readBlock = vi.fn(async (height: number) => {
      if (returned.length) returned[returned.length - 1].timestampMs = 1;
      const value = block(height);
      returned.push(value);
      if (height === 10) {
        input.targetExecutionAtMs = 1;
        input.signal.successor.timestampMs = 1;
        upper.hash = hash(99);
      }
      return value;
    });
    const result = await locateHistoricalExecutionBlock(input, upper, readBlock);
    expect(result.execution).toEqual(block(23));
    expect(result.finalizedUpperBlock).toEqual(block(50));
    expect(result.plan.targetExecutionAtMs).toBe(start + 72_000);
    expect(result.reads.every((item) => item.block?.timestampMs !== 1)).toBe(true);
  });

  it('rejects accessors, unexpected fields and tampered clock plans without invoking getters or reading', async () => {
    const getter = vi.fn(() => start);
    const bad = structuredClone(plan());
    Object.defineProperty(bad, 'targetExecutionAtMs', { enumerable: true, get: getter });
    const readBlock = archive();
    for (const input of [bad, { ...plan(), targetExecutionAtMs: start }, { ...plan(), extra: 1 }])
      await failure(locateHistoricalExecutionBlock(input, block(50), readBlock));
    const upper = Object.defineProperty(block(50), 'timestampMs', { enumerable: true, get: getter });
    await failure(locateHistoricalExecutionBlock(plan(), upper, readBlock));
    expect(getter).not.toHaveBeenCalled();
    expect(readBlock).not.toHaveBeenCalled();
  });

  it('converges within 64 unique reads for a safe-integer extreme without midpoint overflow', async () => {
    const upperHeight = Number.MAX_SAFE_INTEGER - start;
    const readBlock = vi.fn(async (height: number) => (height === 10 ? block(10) : block(height, start + height - 11)));
    const result = await locateHistoricalExecutionBlock(
      plan({ signalDelayMs: 0, executionDelayMs: 12 }),
      block(upperHeight, start + upperHeight - 11),
      readBlock
    );
    expect(result.execution.height).toBe(23);
    expect(result.previous.height).toBe(22);
    expect(result.reads.length).toBeLessThanOrEqual(64);
    expect(result.reads.length).toBeGreaterThan(50);
    const heights = readBlock.mock.calls.map(([height]) => height);
    expect(new Set(heights).size).toBe(heights.length);
    expect(heights.every(Number.isSafeInteger)).toBe(true);
  });
});
