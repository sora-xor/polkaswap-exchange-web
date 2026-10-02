import { describe, expect, it } from 'vitest';
import { FPNumber } from '@/lib/substrate/math';
import { summarizeResultDistribution, type ResultDistributionCandidate } from '@/features/bot-trading/result-insights';

/** Use exact decimal inputs without involving a trading engine or external market history. */
function candidates(values: readonly string[]): ResultDistributionCandidate[] {
  return values.map((pnl, index) => ({ pnl, selected: index % 2 === 0 }));
}

describe('historical candidate result insights', () => {
  it('conserves every outcome on a shared signed axis, including exact boundaries and zero', () => {
    const input = candidates(Array.from({ length: 1001 }, (_, index) => ((index % 17) - 8).toString()));
    const result = summarizeResultDistribution(input);
    expect(result.count).toBe(input.length);
    expect(result.omittedCount).toBe(0);
    expect(result.extent).toBe('8');
    expect(result.bins).toHaveLength(17);
    expect(result.bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(input.length);
    expect(result.bins.reduce((sum, bin) => sum + bin.selectedCount, 0)).toBe(501);
    expect(result.bins.reduce((sum, bin) => sum + bin.excludedCount, 0)).toBe(500);
    expect(result.all.profitCount + result.all.lossCount + result.all.flatCount).toBe(input.length);
    for (const bin of result.bins) {
      const lower = new FPNumber(bin.lower, 40);
      const upper = new FPNumber(bin.upper, 40);
      const members = input.filter(({ pnl }) => {
        const value = new FPNumber(pnl, 40);
        return (
          (bin.lowerInclusive ? value.gte(lower) : value.gt(lower)) &&
          (bin.upperInclusive ? value.lte(upper) : value.lt(upper))
        );
      });
      expect(bin.count).toBe(members.length);
      expect(bin.selectedCount).toBe(members.filter(({ selected }) => selected).length);
      expect(bin.count).toBe(bin.selectedCount + bin.excludedCount);
      if (bin.sign === 'loss') expect(members.every(({ pnl }) => new FPNumber(pnl).lt(FPNumber.ZERO))).toBe(true);
      if (bin.sign === 'profit') expect(members.every(({ pnl }) => new FPNumber(pnl).gt(FPNumber.ZERO))).toBe(true);
      if (bin.sign === 'zero') expect(members.every(({ pnl }) => new FPNumber(pnl).isZero())).toBe(true);
    }
  });

  it('reports exact interpolated quantiles and separate selected/excluded descriptive shares', () => {
    const result = summarizeResultDistribution(candidates(['-8', '-4', '0', '4', '8']));
    expect(result.all).toEqual({
      count: 5,
      profitCount: 2,
      lossCount: 2,
      flatCount: 1,
      winRatePercent: '40',
      min: '-8',
      p10: '-6.4',
      q1: '-4',
      median: '0',
      q3: '4',
      p90: '6.4',
      max: '8',
    });
    expect(result.selected).toMatchObject({
      count: 3,
      profitCount: 1,
      lossCount: 1,
      flatCount: 1,
      winRatePercent: '33.33',
      median: '0',
    });
    expect(result.excluded).toMatchObject({
      count: 2,
      profitCount: 1,
      lossCount: 1,
      flatCount: 0,
      winRatePercent: '50',
      median: '0',
    });
    expect(result).toMatchObject({
      attribution: 'common-endpoint-mark-to-market',
      independentObservations: false,
      predictive: false,
    });
  });

  it('preserves tiny signed values and exact subunit edges rather than rounding outcomes to zero', () => {
    const unit = '0.000000000000000000000000000000000001';
    const result = summarizeResultDistribution(candidates([`-${unit}`, '0', unit]));
    expect(result.all).toMatchObject({
      lossCount: 1,
      flatCount: 1,
      profitCount: 1,
      median: '0',
      min: `-${unit}`,
      max: unit,
    });
    expect(result.selected.q1).toBe('-0.0000000000000000000000000000000000005');
    expect(result.selected.q3).toBe('0.0000000000000000000000000000000000005');
    expect(result.bins[9].upper).toBe('0.000000000000000000000000000000000000125');
    expect(result.bins[0].count).toBe(1);
    expect(result.bins[8].count).toBe(1);
    expect(result.bins[16].count).toBe(1);
  });

  it('preserves huge decimal outcomes beyond JavaScript integer precision', () => {
    const input = [
      '900719925474099300000000000000000001.000000000000000001',
      '900719925474099300000000000000000002.000000000000000003',
    ];
    const result = summarizeResultDistribution(candidates(input));
    expect(result.all.min).toBe(input[0]);
    expect(result.all.max).toBe(input[1]);
    expect(result.all.median).toBe('900719925474099300000000000000000001.500000000000000002');
    expect(result.all.p10).toBe('900719925474099300000000000000000001.1000000000000000012');
    expect(result.bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(2);
    expect(result.bins[16].upper).toBe(input[1]);
  });

  it('keeps singleton and all-zero evidence explicit without inventing an uncertainty or prediction estimate', () => {
    const single = summarizeResultDistribution([{ pnl: '-3.125', selected: false }]);
    expect(single.all).toMatchObject({
      count: 1,
      profitCount: 0,
      lossCount: 1,
      winRatePercent: '0',
      min: '-3.125',
      p10: '-3.125',
      q1: '-3.125',
      median: '-3.125',
      q3: '-3.125',
      p90: '-3.125',
      max: '-3.125',
    });
    expect(single.selected.count).toBe(0);
    expect(single.selected.median).toBeNull();
    expect(single.selected.winRatePercent).toBeNull();
    const flat = summarizeResultDistribution(candidates(['0', '-0', '0.000']));
    expect(flat.extent).toBe('0');
    expect(flat.bins).toEqual([
      {
        index: 0,
        sign: 'zero',
        lower: '0',
        upper: '0',
        lowerInclusive: true,
        upperInclusive: true,
        count: 3,
        selectedCount: 2,
        excludedCount: 1,
        firstIndex: 0,
        firstSelectedIndex: 0,
        firstExcludedIndex: 1,
      },
    ]);
    expect(flat.all).toMatchObject({ count: 3, flatCount: 3, median: '0', p10: '0', p90: '0', winRatePercent: '0' });
  });

  it('omits malformed and nonfinite evidence explicitly and returns null statistics for no evidence', () => {
    const values = ['', 'NaN', 'Infinity', '-Infinity', '1e-36', ' 1', '01', '1,000', '+1', '9'.repeat(257)];
    const result = summarizeResultDistribution(candidates(values));
    expect(result).toMatchObject({ count: 0, omittedCount: values.length, extent: null, bins: [] });
    expect(result.all).toEqual({
      count: 0,
      profitCount: 0,
      lossCount: 0,
      flatCount: 0,
      winRatePercent: null,
      min: null,
      p10: null,
      q1: null,
      median: null,
      q3: null,
      p90: null,
      max: null,
    });
    expect(summarizeResultDistribution([...candidates(values), { pnl: '-0.1', selected: true }])).toMatchObject({
      count: 1,
      omittedCount: values.length,
      all: { min: '-0.1' },
    });
  });

  it('retains original source indices for constant-time range inspection after invalid values are omitted', () => {
    const input = [
      { pnl: 'NaN', selected: true },
      { pnl: '2', selected: false },
      { pnl: 'Infinity', selected: false },
      { pnl: '2', selected: true },
      { pnl: '-2', selected: true },
    ];
    const result = summarizeResultDistribution(input);
    expect(result.bins[16]).toMatchObject({ count: 2, firstIndex: 1, firstSelectedIndex: 3, firstExcludedIndex: 1 });
    expect(result.bins[0]).toMatchObject({ count: 1, firstIndex: 4, firstSelectedIndex: 4, firstExcludedIndex: null });
    expect(result.bins[8]).toMatchObject({
      count: 0,
      firstIndex: null,
      firstSelectedIndex: null,
      firstExcludedIndex: null,
    });
  });

  it('does not reorder or mutate the caller’s research evidence', () => {
    const input = Object.freeze(candidates(['2', '-3', '0', '4']).map((candidate) => Object.freeze(candidate)));
    const original = JSON.stringify(input);
    expect(summarizeResultDistribution(input)).toEqual(summarizeResultDistribution(input));
    expect(JSON.stringify(input)).toBe(original);
  });
});
