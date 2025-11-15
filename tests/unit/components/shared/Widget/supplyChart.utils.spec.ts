import { describe, expect, it } from 'vitest';

import { getExtremum, type SupplyChartPoint } from '@/components/shared/Widget/supplyChart.utils';

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
});
