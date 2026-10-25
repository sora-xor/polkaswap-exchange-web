import { describe, expect, it } from 'vitest';

import {
  getExtremum,
  getMintBurnRange,
  getSupplyRange,
  type SupplyChartPoint,
} from '@/components/shared/Widget/supplyChart.utils';

describe('supplyChart.utils', () => {
  const sample: SupplyChartPoint[] = [
    { timestamp: 1, value: 10, mint: 2, burn: 1 },
    { timestamp: 2, value: 12, mint: 5, burn: -1 },
    { timestamp: 3, value: 14, mint: 1, burn: -3 },
  ];

  it('returns max mint and burn values', () => {
    expect(getExtremum(sample, 'mint')).toBe(5);
    expect(getExtremum(sample, 'burn')).toBe(1);
  });

  it('returns min mint and burn values when requested', () => {
    expect(getExtremum(sample, 'mint', true)).toBe(1);
    expect(getExtremum(sample, 'burn', true)).toBe(-3);
  });

  it('returns a padded supply range around large absolute values', () => {
    expect(
      getSupplyRange([
        { timestamp: 1, value: 999_000_000_000, mint: 0, burn: 0 },
        { timestamp: 2, value: 999_000_000_003, mint: 0, burn: 3 },
      ])
    ).toEqual({
      min: 998_999_999_999.7,
      max: 999_000_000_003.3,
    });
  });

  it('does not force a range for flat supply data', () => {
    expect(
      getSupplyRange([
        { timestamp: 1, value: 999_000_000_000, mint: 0, burn: 0 },
        { timestamp: 2, value: 999_000_000_000, mint: 0, burn: 0 },
      ])
    ).toBeUndefined();
  });

  it('returns a positive log range for sub-unit remint and burn values', () => {
    expect(
      getMintBurnRange([
        { timestamp: 1, value: 999_000_000_000, mint: 0, burn: 0.25 },
        { timestamp: 2, value: 999_000_000_003, mint: 2, burn: 0 },
      ])
    ).toEqual({
      min: 0.25 / 1.2,
      max: 2.4,
    });
  });

  it('does not force a remint and burn range without positive values', () => {
    expect(
      getMintBurnRange([
        { timestamp: 1, value: 999_000_000_000, mint: 0, burn: 0 },
        { timestamp: 2, value: 999_000_000_003, mint: 0, burn: 0 },
      ])
    ).toBeUndefined();
  });
});
