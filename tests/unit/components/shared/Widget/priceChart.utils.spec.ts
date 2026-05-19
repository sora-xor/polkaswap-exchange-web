import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it } from 'vitest';

import {
  aggregateSnapshotsByInterval,
  dividePrices,
  formatChange,
  mergeSnapshots,
  normalizeSnapshots,
  getPrecision,
} from '@/components/shared/Widget/priceChart.utils';
import type { SnapshotItem } from '@/types/chart';

describe('priceChart.utils', () => {
  it('merges snapshot price arrays', () => {
    const base: SnapshotItem = {
      timestamp: 1000,
      price: [2, 4, 1, 5],
      volume: 3,
    };
    const quote: SnapshotItem = {
      timestamp: 1000,
      price: [1, 2, 1, 2],
      volume: 4,
    };

    const merged = mergeSnapshots(base, quote);

    expect(merged.price).toEqual(dividePrices(base.price, quote.price));
    expect(merged.volume).toBe(Math.min(base.volume ?? 0, quote.volume ?? 0));
  });

  it('turns zero quote divisors into finite zeroes instead of invalid prices', () => {
    const divided = dividePrices([10, 20, 30, 40], [2, 0, 5, 0]);

    expect(divided).toEqual([5, 0, 6, 0]);
    expect(divided.every(Number.isFinite)).toBe(true);
  });

  it('normalizes snapshot gaps', () => {
    const snapshots: SnapshotItem[] = [
      { timestamp: 4000, price: [1, 1, 1, 1], volume: 1 },
      { timestamp: 1000, price: [2, 2, 2, 2], volume: 1 },
    ];

    const normalized = normalizeSnapshots(snapshots, 1000, 7000);

    expect(normalized.length).toBeGreaterThan(snapshots.length);
    expect(normalized[0].timestamp).toBe(6000);
  });

  it('caps normalized points for sparse indexer history', () => {
    const difference = 5 * 60 * 1000;
    const latestTimestamp = 1_778_336_766_000;
    const oldestTimestamp = 1_619_543_754_000;
    const snapshots: SnapshotItem[] = [
      { timestamp: latestTimestamp, price: [1, 1, 1, 1], volume: 1 },
      { timestamp: oldestTimestamp, price: [2, 2, 2, 2], volume: 1 },
    ];

    const normalized = normalizeSnapshots(snapshots, difference, latestTimestamp + difference, 48);

    expect(normalized).toHaveLength(48);
    expect(normalized[0].timestamp).toBe(latestTimestamp);
    expect(normalized.at(-1)?.timestamp).toBe(latestTimestamp - difference * 47);
  });

  it('does not normalize adversarial non-positive limits', () => {
    const snapshots: SnapshotItem[] = [{ timestamp: 4000, price: [1, 1, 1, 1], volume: 1 }];

    expect(normalizeSnapshots(snapshots, 1000, 7000, 0)).toEqual([]);
    expect(normalizeSnapshots(snapshots, 1000, 7000, -1)).toEqual([]);
  });

  it('does not synthesize candles when snapshot difference is invalid', () => {
    const snapshots: SnapshotItem[] = [{ timestamp: 4000, price: [1, 2, 1, 3], volume: 1 }];

    const zeroDifference = normalizeSnapshots(snapshots, 0, 7000);
    const nanDifference = normalizeSnapshots(snapshots, Number.NaN, 7000);

    expect(zeroDifference).toEqual(snapshots);
    expect(nanDifference).toEqual(snapshots);
    expect(zeroDifference).not.toBe(snapshots);
    expect(nanDifference).not.toBe(snapshots);
  });

  it('aggregates real snapshots into interval buckets without filling missing buckets', () => {
    const fiveMinutes = 5 * 60 * 1000;
    const thirtyMinutes = 6 * fiveMinutes;
    const baseTimestamp = Date.UTC(2026, 0, 1, 9, 0, 0);
    const snapshots: SnapshotItem[] = [
      {
        timestamp: baseTimestamp,
        price: [10, 12, 9, 13],
        volume: 4,
        baseVolume: 2n,
      },
      {
        timestamp: baseTimestamp + fiveMinutes,
        price: [12, 11, 8, 14],
        volume: 6,
        baseVolume: 3n,
      },
      {
        timestamp: baseTimestamp + 2 * thirtyMinutes,
        price: [20, 21, 19, 22],
        volume: 5,
        baseVolume: 7n,
      },
    ];

    const aggregated = aggregateSnapshotsByInterval(snapshots, thirtyMinutes);

    expect(aggregated).toHaveLength(2);
    expect(aggregated[0]).toMatchObject({
      timestamp: baseTimestamp,
      price: [10, 11, 8, 14],
      volume: 10,
      baseVolume: 5n,
    });
    expect(aggregated[1]).toMatchObject({
      timestamp: baseTimestamp + 2 * thirtyMinutes,
      price: [20, 21, 19, 22],
      volume: 5,
      baseVolume: 7n,
    });
  });

  it('does not mutate source snapshots while aggregating adversarial bucket data', () => {
    const interval = 30 * 60 * 1000;
    const baseTimestamp = Date.UTC(2026, 0, 1, 9, 0, 0);
    const firstPrice: [number, number, number, number] = [5, 7, 4, 8];
    const secondPrice: [number, number, number, number] = [7, 6, 3, 9];
    const snapshots: SnapshotItem[] = [
      { timestamp: baseTimestamp, price: firstPrice, volume: undefined, targetVolume: 2n },
      { timestamp: baseTimestamp + 5 * 60 * 1000, price: secondPrice, volume: 4, targetVolume: 3n },
    ];

    const aggregated = aggregateSnapshotsByInterval(snapshots, interval);

    expect(aggregated).toHaveLength(1);
    expect(aggregated[0]).not.toBe(snapshots[0]);
    expect(aggregated[0].price).not.toBe(firstPrice);
    expect(aggregated[0]).toMatchObject({
      timestamp: baseTimestamp,
      price: [5, 6, 3, 9],
      volume: 4,
      targetVolume: 5n,
    });
    expect(snapshots[0].price).toEqual([5, 7, 4, 8]);
    expect(snapshots[0].volume).toBeUndefined();
    expect(snapshots[0].targetVolume).toBe(2n);
  });

  it('sorts adversarially ordered snapshots before deriving aggregate open and close prices', () => {
    const interval = 30 * 60 * 1000;
    const baseTimestamp = Date.UTC(2026, 0, 1, 9, 0, 0);
    const snapshots: SnapshotItem[] = [
      {
        timestamp: baseTimestamp + 10 * 60 * 1000,
        price: [20, 21, 19, 23],
        volume: 5,
      },
      {
        timestamp: baseTimestamp + 2 * interval,
        price: [40, 41, 39, 42],
        volume: 7,
      },
      {
        timestamp: baseTimestamp,
        price: [10, 12, 8, 13],
        volume: 3,
      },
    ];

    const aggregated = aggregateSnapshotsByInterval(snapshots, interval);

    expect(aggregated).toHaveLength(2);
    expect(aggregated[0]).toMatchObject({
      timestamp: baseTimestamp,
      price: [10, 21, 8, 23],
      volume: 8,
    });
    expect(aggregated[1]).toMatchObject({
      timestamp: baseTimestamp + 2 * interval,
      price: [40, 41, 39, 42],
      volume: 7,
    });
    expect(snapshots.map((item) => item.timestamp)).toEqual([
      baseTimestamp + 10 * 60 * 1000,
      baseTimestamp + 2 * interval,
      baseTimestamp,
    ]);
  });

  it('skips non-finite timestamps during aggregation', () => {
    const interval = 30 * 60 * 1000;
    const baseTimestamp = Date.UTC(2026, 0, 1, 9, 0, 0);
    const snapshots: SnapshotItem[] = [
      { timestamp: Number.NaN, price: [99, 100, 98, 101], volume: 100 },
      { timestamp: Number.POSITIVE_INFINITY, price: [88, 89, 87, 90], volume: 100 },
      { timestamp: baseTimestamp, price: [10, 12, 8, 13], volume: 3 },
      { timestamp: baseTimestamp + 5 * 60 * 1000, price: [12, 11, 7, 14], volume: 5 },
    ];

    const aggregated = aggregateSnapshotsByInterval(snapshots, interval);

    expect(aggregated).toEqual([
      {
        timestamp: baseTimestamp,
        price: [10, 11, 7, 14],
        volume: 8,
      },
    ]);
  });

  it('does not aggregate snapshots when the requested interval is invalid', () => {
    const snapshots: SnapshotItem[] = [
      { timestamp: 1_700_000_000_000, price: [1, 2, 1, 3], volume: 5 },
      { timestamp: 1_700_000_300_000, price: [2, 3, 2, 4], volume: 7 },
    ];

    const zeroInterval = aggregateSnapshotsByInterval(snapshots, 0);
    const nanInterval = aggregateSnapshotsByInterval(snapshots, Number.NaN);

    expect(zeroInterval).toEqual(snapshots);
    expect(nanInterval).toEqual(snapshots);
    expect(zeroInterval).not.toBe(snapshots);
    expect(nanInterval).not.toBe(snapshots);
  });

  it('does not add phantom bigint volume fields while aggregating price-only snapshots', () => {
    const snapshots: SnapshotItem[] = [
      { timestamp: 1_700_000_000_000, price: [1, 2, 1, 3], volume: 5 },
      { timestamp: 1_700_000_300_000, price: [2, 3, 2, 4], volume: 7 },
    ];

    const [aggregated] = aggregateSnapshotsByInterval(snapshots, 30 * 60 * 1000);

    expect(aggregated).toMatchObject({
      timestamp: 1_699_999_200_000,
      price: [1, 3, 1, 4],
      volume: 12,
    });
    expect(aggregated).not.toHaveProperty('baseVolume');
    expect(aggregated).not.toHaveProperty('targetVolume');
  });

  it('computes precision and formats change strings', () => {
    const precision = getPrecision(0.00045);
    expect(precision).toBeGreaterThan(4);

    const change = formatChange(new FPNumber(-0.12));
    expect(change.startsWith('-')).toBe(true);
  });
});
