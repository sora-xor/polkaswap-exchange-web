import { describe, expect, it } from 'vitest';
import { buildDistributionBins, buildDistributionSurface } from '@/features/bot-trading/distribution-surface';
import {
  DISTRIBUTION_BASE,
  DISTRIBUTION_LEFT,
  DISTRIBUTION_RIGHT,
  type DistributionBall,
} from '@/features/bot-trading/tradeDistribution';

/** Construct presentation coordinates directly so tests do not depend on financial normalization. */
function ball(index: number, x: number, selected = true): DistributionBall {
  return { id: `trade-${index}`, index, x, y: 450, radius: 4, selected, positive: true, neutral: false, gates: [] };
}

describe('backtesting distribution surface', () => {
  it('uses every candidate in a chronological cohort and returns deterministic bounded ridges', () => {
    const balls = Array.from({ length: 10000 }, (_, index) =>
      ball(index, DISTRIBUTION_LEFT + (index % 731), index % 3 === 0)
    );
    const result = buildDistributionSurface(balls);
    expect(result).toEqual(buildDistributionSurface(balls));
    expect(result.count).toBe(10000);
    expect(result.omittedCount).toBe(0);
    expect(result.profiles).toHaveLength(10);
    expect(result.profiles.reduce((sum, profile) => sum + profile.count, 0)).toBe(balls.length);
    expect(result.profiles.reduce((sum, profile) => sum + profile.selectedCount, 0)).toBe(3334);
    for (const profile of result.profiles) {
      expect(profile.points).toHaveLength(97);
      expect(profile.baseline).toHaveLength(97);
      for (let index = 0; index < profile.points.length; index += 1) {
        const point = profile.points[index];
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
        expect(point.x).toBeGreaterThanOrEqual(DISTRIBUTION_LEFT);
        expect(point.x).toBeLessThanOrEqual(DISTRIBUTION_RIGHT);
        expect(point.y).toBeGreaterThanOrEqual(50);
        expect(point.y).toBeLessThanOrEqual(profile.baseline[index].y);
      }
      const anchor = profile.anchors[0];
      const original = balls.find((candidate) => candidate.id === anchor.id)!;
      expect(original.index).toBeGreaterThanOrEqual(profile.index * 1000);
      expect(original.index).toBeLessThan((profile.index + 1) * 1000);
      expect(anchor.selected).toBe(original.selected);
      expect(anchor.x).toBeCloseTo(
        DISTRIBUTION_LEFT + 70 * (1 - profile.depth) + ((original.x - DISTRIBUTION_LEFT) / 730) * 640
      );
    }
  });

  it('moves density with actual outcomes, retaining isolated and extreme observations', () => {
    for (const x of [DISTRIBUTION_LEFT, (DISTRIBUTION_LEFT + DISTRIBUTION_RIGHT) / 2, DISTRIBUTION_RIGHT]) {
      const result = buildDistributionSurface([ball(0, x)]);
      const profile = result.profiles[0];
      const heights = profile.points.map((point, index) => profile.baseline[index].y - point.y);
      const peak = heights.indexOf(Math.max(...heights));
      expect(peak).toBeCloseTo(((x - DISTRIBUTION_LEFT) / 730) * 96, 0);
      expect(profile.count).toBe(1);
      expect(profile.anchors[0].id).toBe('trade-0');
      expect(profile.anchors[0].y).toBeGreaterThanOrEqual(50);
      expect(heights.filter((height) => height > 0).length).toBeGreaterThan(1);
    }
  });

  it('keeps unequal cohort counts honest and does not mutate source candidates', () => {
    const balls = Array.from({ length: 23 }, (_, index) => Object.freeze(ball(index, 350, false)));
    const result = buildDistributionSurface(Object.freeze(balls));
    expect(result.profiles.map((profile) => profile.count)).toEqual([3, 2, 2, 3, 2, 2, 3, 2, 2, 2]);
    expect(result.profiles.every((profile) => profile.selectedCount === 0)).toBe(true);
    const height = (index: number) => {
      const profile = result.profiles[index];
      return (
        Math.max(...profile.points.map((point, sample) => profile.baseline[sample].y - point.y)) /
        (72 + 20 * profile.depth)
      );
    };
    expect(height(1) / height(0)).toBeCloseTo(2 / 3);
  });

  it('preserves completed ridges and empty cohort positions as checkpoints append evidence', () => {
    const balls = Array.from({ length: 100 }, (_, index) => ball(index, 260 + (index % 10) * 32));
    const options = { expectedCount: balls.length };
    const empty = buildDistributionSurface([], options);
    const first = buildDistributionSurface(balls.slice(0, 20), options);
    const second = buildDistributionSurface(balls.slice(0, 30), options);
    const complete = buildDistributionSurface(balls, options);
    expect(empty.profiles).toHaveLength(10);
    expect(empty.profiles.every((profile) => profile.count === 0 && profile.anchors.length === 0)).toBe(true);
    expect(
      empty.profiles.every((profile) => profile.points.every((point, index) => point.y === profile.baseline[index].y))
    ).toBe(true);
    expect(first.profiles.slice(0, 2)).toEqual(second.profiles.slice(0, 2));
    expect(first.profiles.slice(0, 2)).toEqual(complete.profiles.slice(0, 2));
    expect(empty.profiles.map((profile) => profile.baseline)).toEqual(
      complete.profiles.map((profile) => profile.baseline)
    );
    expect(first.profiles.map((profile) => profile.count)).toEqual([10, 10, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(complete.profiles.reduce((sum, profile) => sum + profile.count, 0)).toBe(100);
  });

  it('grows accumulating density on a fixed linear count scale without renormalizing earlier samples', () => {
    const balls = Array.from({ length: 100 }, (_, index) => ball(index, DISTRIBUTION_LEFT));
    const first = buildDistributionSurface(balls.slice(0, 5), { expectedCount: 100 });
    const second = buildDistributionSurface(balls.slice(0, 10), { expectedCount: 100 });
    const height = (result: ReturnType<typeof buildDistributionSurface>) => {
      const profile = result.profiles[0];
      return profile.baseline[0].y - profile.points[0].y;
    };
    expect(height(second) / height(first)).toBeCloseTo(2);
    expect(height(second)).toBeCloseTo(72);
    expect(
      second.profiles.every((profile) => profile.points.every((point) => Number.isFinite(point.y) && point.y >= 50))
    ).toBe(true);
  });

  it('keeps invalid observations in their original chronological slots during a run', () => {
    const balls = Array.from({ length: 20 }, (_, index) => ball(index, index === 0 ? Number.NaN : 400));
    const result = buildDistributionSurface(balls, { expectedCount: 20 });
    expect(result.count).toBe(19);
    expect(result.omittedCount).toBe(1);
    expect(result.profiles.map((profile) => profile.count)).toEqual([1, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(result.profiles[0].anchors[0].id).toBe('trade-1');
    for (const expectedCount of [Number.NaN, Infinity, -1, 0, 1.5, 10]) {
      expect(buildDistributionSurface(balls, { expectedCount })).toEqual(buildDistributionSurface(balls));
    }
  });

  it('returns empty evidence for empty or invalid inputs and bounds finite out-of-range positions', () => {
    expect(buildDistributionSurface([])).toEqual({ profiles: [], count: 0, omittedCount: 0 });
    expect(buildDistributionSurface([ball(0, Number.NaN), ball(1, Infinity)])).toEqual({
      profiles: [],
      count: 0,
      omittedCount: 2,
    });
    const result = buildDistributionSurface([ball(0, -1e20), ball(1, 1e20), ball(2, Number.NaN)]);
    expect(result.count).toBe(2);
    expect(result.omittedCount).toBe(1);
    expect(
      result.profiles
        .flatMap((profile) => profile.points)
        .every((point) => point.x >= DISTRIBUTION_LEFT && point.x <= DISTRIBUTION_RIGHT && Number.isFinite(point.y))
    ).toBe(true);
  });
});

describe('dense distribution columns', () => {
  it('conserves every candidate and selection in at most 35 bounded screen bins', () => {
    const balls = Array.from({ length: 10000 }, (_, index) =>
      Object.freeze({
        ...ball(index, DISTRIBUTION_LEFT + (index % 731), index % 3 === 0),
        y: 80 + (index % 377),
        radius: 0.7,
      })
    );
    const result = buildDistributionBins(Object.freeze(balls));
    expect(result).toEqual(buildDistributionBins(balls));
    expect(result.count).toBe(10000);
    expect(result.omittedCount).toBe(0);
    expect(result.bins).toHaveLength(35);
    expect(result.bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(10000);
    expect(result.bins.reduce((sum, bin) => sum + bin.selectedCount, 0)).toBe(3334);
    for (const bin of result.bins) {
      expect(bin.centerX - bin.width / 2).toBeGreaterThanOrEqual(DISTRIBUTION_LEFT);
      expect(bin.centerX + bin.width / 2).toBeLessThanOrEqual(DISTRIBUTION_RIGHT);
      expect(bin.top).toBeGreaterThanOrEqual(0);
      expect(bin.top).toBeLessThanOrEqual(bin.bottom);
      expect(bin.bottom).toBe(DISTRIBUTION_BASE);
      expect(bin.positiveCount + bin.neutralCount + bin.negativeCount).toBe(bin.count);
      expect(bin.positive).toBe(true);
    }
  });

  it('uses the full candidate footprint for the silhouette and preserves mixed sign counts', () => {
    const balls = [
      { ...ball(0, 500), y: 420, radius: 2 },
      { ...ball(1, 501, false), y: 300, radius: 4, positive: false, neutral: true },
      { ...ball(2, 502), y: 380, radius: 3, positive: false },
    ];
    const result = buildDistributionBins(balls);
    expect(result.bins).toHaveLength(1);
    expect(result.bins[0]).toMatchObject({
      top: 296,
      bottom: DISTRIBUTION_BASE,
      count: 3,
      selectedCount: 2,
      positiveCount: 1,
      neutralCount: 1,
      negativeCount: 1,
      positive: false,
      neutral: false,
    });
  });

  it('accounts for invalid input and clamps finite extremes without leaking outside the plot', () => {
    expect(buildDistributionBins([])).toEqual({ bins: [], count: 0, omittedCount: 0 });
    const result = buildDistributionBins([
      { ...ball(0, -1e20), y: -1e20, radius: 1e20 },
      { ...ball(1, 1e20), y: 1e20, neutral: true },
      ball(2, Number.NaN),
      { ...ball(3, 200), y: Infinity },
      { ...ball(4, 200), radius: Number.NaN },
      { ...ball(5, 200), radius: -1 },
    ]);
    expect(result.count).toBe(2);
    expect(result.omittedCount).toBe(4);
    expect(result.bins.map((bin) => bin.index)).toEqual([0, 34]);
    expect(result.bins[0].top).toBe(0);
    expect(result.bins[1].top).toBe(DISTRIBUTION_BASE);
    expect(result.bins[1].neutral).toBe(true);
    expect(result.bins.every((bin) => Number.isFinite(bin.top) && Number.isFinite(bin.centerX))).toBe(true);
  });
});
