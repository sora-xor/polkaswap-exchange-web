import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it } from 'vitest';

import {
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

  it('normalizes snapshot gaps', () => {
    const snapshots: SnapshotItem[] = [
      { timestamp: 4000, price: [1, 1, 1, 1], volume: 1 },
      { timestamp: 1000, price: [2, 2, 2, 2], volume: 1 },
    ];

    const normalized = normalizeSnapshots(snapshots, 1000, 7000);

    expect(normalized.length).toBeGreaterThan(snapshots.length);
    expect(normalized[0].timestamp).toBe(6000);
  });

  it('computes precision and formats change strings', () => {
    const precision = getPrecision(0.00045);
    expect(precision).toBeGreaterThan(4);

    const change = formatChange(new FPNumber(-0.12));
    expect(change.startsWith('-')).toBe(true);
  });
});
