import { describe, expect, it, vi } from 'vitest';
import {
  HistoricalValuationLocateError,
  locateHistoricalValuationBlock,
  type HistoricalValuationLocateRequest,
} from '../../../../scripts/bots/historical-valuation-locator';
import type { HistoricalClockBlock } from '../../../../scripts/bots/historical-execution-clock';

const hash = (height: number) => `0x${height.toString(16).padStart(64, '0')}`;
const block = (height: number, timestampMs = height * 6000): HistoricalClockBlock => ({
  height,
  hash: hash(height),
  parentHash: hash(height - 1),
  timestampMs,
});
const request = (targetAtMs = 240_000): HistoricalValuationLocateRequest => ({
  targetAtMs,
  maximumLagMs: 6000,
  lower: block(10),
  upper: block(100),
});
const archive = () => vi.fn(async (height: number) => block(height));

/** Retain failures without unwrapping or printing any non-metadata callback payload. */
async function failure(pending: Promise<unknown>): Promise<HistoricalValuationLocateError> {
  try {
    await pending;
  } catch (error) {
    expect(error).toBeInstanceOf(HistoricalValuationLocateError);
    return error as HistoricalValuationLocateError;
  }
  throw new Error('Expected location failure');
}

describe('historical valuation block locator', () => {
  it('re-reads both anchors then uses integer interpolation and an adjacent proof for an exact target', async () => {
    const read = archive();
    const result = await locateHistoricalValuationBlock(request(), read);
    expect(read.mock.calls).toEqual([[10], [100], [40], [39]]);
    expect(result.previous).toEqual(block(39));
    expect(result.block).toEqual(block(40));
    expect(result.lagMs).toBe(0);
    expect(result).toMatchObject({
      canonicality: 'caller-attested-under-monotonic-canonical-timestamps',
      observedFill: false,
      transactionSubmitted: false,
    });
    expect(result.reads.map((entry) => entry.height)).toEqual(read.mock.calls.map(([height]) => height));
    for (const value of [result, result.request, result.request.lower, result.reads, ...result.reads])
      expect(Object.isFrozen(value)).toBe(true);
    expect(result.reads.every((entry) => entry.status === 'read' && Object.isFrozen(entry.block))).toBe(true);
  });

  it('accepts arbitrary millisecond targets and inclusive lag, never substitutes the closer earlier block', async () => {
    const read = archive();
    const input = { ...request(240_001), maximumLagMs: 5999 };
    const result = await locateHistoricalValuationBlock(input, read);
    expect(result.previous.height).toBe(40);
    expect(result.block.height).toBe(41);
    expect(result.lagMs).toBe(5999);
    expect(read.mock.calls).toEqual([[10], [100], [40], [41]]);
  });

  it('retains a proved first block and the unchanged request when its lag is too large', async () => {
    const input = { ...request(240_001), maximumLagMs: 5998 };
    const error = await failure(locateHistoricalValuationBlock(input, archive()));
    expect(error.diagnostic).toMatchObject({
      stage: 'verify',
      reason: 'lag-exceeded',
      request: input,
      location: { previous: block(40), block: block(41), lagMs: 5999 },
    });
    expect(Object.isFrozen(error.diagnostic)).toBe(true);
    expect(Object.isFrozen(error.diagnostic.location)).toBe(true);
  });

  it('re-reads adjacent anchors even when the upper is an exact target', async () => {
    const read = archive();
    const result = await locateHistoricalValuationBlock(
      { targetAtMs: 66_000, maximumLagMs: 0, lower: block(10), upper: block(11) },
      read
    );
    expect(read.mock.calls).toEqual([[10], [11]]);
    expect(result.block).toEqual(block(11));
  });

  it('finds the first block on an irregular strictly advancing chain after an inaccurate interpolation guess', async () => {
    const irregular = (height: number) => block(height, height <= 50 ? height * 100 : 5000 + (height - 50) * 10000);
    const read = vi.fn(async (height: number) => irregular(height));
    const result = await locateHistoricalValuationBlock(
      { targetAtMs: 5001, maximumLagMs: 9999, lower: irregular(1), upper: irregular(100) },
      read
    );
    expect(result.previous).toEqual(irregular(50));
    expect(result.block).toEqual(irregular(51));
    expect(result.lagMs).toBe(9999);
    expect(new Set(read.mock.calls.map(([height]) => height)).size).toBe(read.mock.calls.length);
    expect(result.reads.length).toBeLessThanOrEqual(12);
  });

  it.each([10, 100])('refuses a changed supplied identity at height %s before searching', async (changed) => {
    const read = vi.fn(async (height: number) =>
      height === changed ? { ...block(height), hash: hash(999) } : block(height)
    );
    const error = await failure(locateHistoricalValuationBlock(request(), read));
    expect(error.diagnostic).toMatchObject({ stage: 'anchors', reason: 'identity-mismatch' });
    expect(read.mock.calls).toHaveLength(changed === 10 ? 1 : 2);
  });

  it.each(['missing', 'throw', 'invalid', 'height'] as const)(
    'retains a %s callback failure without retrying or replacing its height',
    async (kind) => {
      const read = vi.fn(async (height: number) => {
        if (height !== 40) return block(height);
        if (kind === 'missing') return null;
        if (kind === 'throw') throw new Error('Private transport diagnostic must not escape');
        if (kind === 'invalid') return { ...block(height), timestampMs: NaN };
        return block(41);
      });
      const error = await failure(locateHistoricalValuationBlock(request(), read));
      const reason = {
        missing: 'missing-block',
        throw: 'read-failed',
        invalid: 'invalid-block',
        height: 'height-mismatch',
      };
      expect(error.diagnostic.reason).toBe(reason[kind]);
      expect(read.mock.calls).toEqual([[10], [100], [40]]);
      expect(error.diagnostic.reads.at(-1)!.height).toBe(40);
      expect(JSON.stringify(error.diagnostic)).not.toContain('Private transport');
    }
  );

  it.each(['timestamp', 'hash', 'parent', 'adjacent-parent', 'reverse-parent'] as const)(
    'rejects an observed %s contradiction',
    async (kind) => {
      const input = request();
      if (kind === 'reverse-parent') input.upper.parentHash = hash(40);
      const read = vi.fn(async (height: number) => {
        if (height === 100) return input.upper;
        const value = block(height);
        if (height === 40) {
          if (kind === 'timestamp') value.timestampMs = input.lower.timestampMs;
          if (kind === 'hash') value.hash = input.lower.hash;
          if (kind === 'parent') value.parentHash = input.lower.hash;
          if (kind === 'adjacent-parent') value.parentHash = hash(999);
        }
        return value;
      });
      const error = await failure(locateHistoricalValuationBlock(input, read));
      expect(error.diagnostic.reason).toBe(
        kind === 'timestamp' ? 'nonmonotonic-timestamp' : kind === 'hash' ? 'duplicate-hash' : 'parent-mismatch'
      );
    }
  );

  it('rejects invalid brackets and unsafe or fractional target policies without any reads', async () => {
    const read = archive();
    const cases = [
      { ...request(), targetAtMs: 60_000 },
      { ...request(), targetAtMs: 600_001 },
      { ...request(), lower: block(101) },
      { ...request(), upper: block(10) },
      { ...request(), maximumLagMs: -1 },
      { ...request(), maximumLagMs: 0.5 },
      { ...request(), targetAtMs: Number.MAX_SAFE_INTEGER + 1 },
      { ...request(), targetAtMs: NaN },
      { ...request(), lower: block(10, -1) },
    ];
    for (const input of cases) await failure(locateHistoricalValuationBlock(input, read));
    expect(read).not.toHaveBeenCalled();
  });

  it('rejects accessors, inherited or unexpected fields without invoking caller getters', async () => {
    const getter = vi.fn();
    const withGetter = request();
    Object.defineProperty(withGetter, 'targetAtMs', { enumerable: true, get: getter });
    const blockGetter = request();
    Object.defineProperty(blockGetter.upper, 'timestampMs', { enumerable: true, get: getter });
    const read = archive();
    for (const input of [withGetter, blockGetter, Object.create(request()), { ...request(), extra: true }])
      await failure(locateHistoricalValuationBlock(input, read));
    expect(getter).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });

  it('copies request and returned block values before another await can mutate them', async () => {
    const input = request();
    const returned: HistoricalClockBlock[] = [];
    const read = vi.fn(async (height: number) => {
      input.targetAtMs = 1;
      input.upper.timestampMs = 1;
      if (returned.length) returned.at(-1)!.timestampMs = 1;
      const value = block(height);
      returned.push(value);
      return value;
    });
    const result = await locateHistoricalValuationBlock(input, read);
    expect(result.request.targetAtMs).toBe(240_000);
    expect(result.request.upper).toEqual(block(100));
    expect(result.previous).toEqual(block(39));
    expect(result.reads.every((entry) => entry.block?.timestampMs !== 1)).toBe(true);
  });

  it('bounds highly inaccurate interpolation at safe-integer extremes without overflow or repeated reads', async () => {
    const maximum = Number.MAX_SAFE_INTEGER;
    const at = (height: number) => block(height, height < maximum ? height - 1 : maximum);
    const read = vi.fn(async (height: number) => at(height));
    const result = await locateHistoricalValuationBlock(
      { targetAtMs: maximum - 2, maximumLagMs: 0, lower: at(1), upper: at(maximum) },
      read
    );
    expect(result.block.height).toBe(maximum - 1);
    expect(result.previous.height).toBe(maximum - 2);
    expect(result.reads.length).toBeLessThanOrEqual(64);
    const heights = read.mock.calls.map(([height]) => height);
    expect(new Set(heights).size).toBe(heights.length);
    expect(heights.every(Number.isSafeInteger)).toBe(true);
  });

  it('falls back to bounded bisection even when one terminal timestamp jump makes the initial guess useless', async () => {
    const maximum = Number.MAX_SAFE_INTEGER;
    const upperHeight = Math.floor(maximum / 2);
    const target = upperHeight - 2;
    const at = (height: number) => block(height, height === upperHeight ? maximum : height);
    const read = vi.fn(async (height: number) => at(height));
    const result = await locateHistoricalValuationBlock(
      { targetAtMs: target, maximumLagMs: 0, lower: at(1), upper: at(upperHeight) },
      read
    );
    expect(result.block.height).toBe(target);
    expect(result.previous.height).toBe(target - 1);
    expect(result.reads.length).toBeGreaterThan(40);
    expect(result.reads.length).toBeLessThanOrEqual(64);
  });
});
