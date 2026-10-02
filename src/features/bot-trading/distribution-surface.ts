/**
 * Presentation-only density ridges for the backtesting outcome canvas.
 * Every finite candidate position contributes to one chronological cohort.
 * Smoothing and projection operate on screen coordinates and counts, never token amounts.
 */
import { DISTRIBUTION_BASE, DISTRIBUTION_LEFT, DISTRIBUTION_RIGHT, type DistributionBall } from './tradeDistribution';

/** A projected screen coordinate shared by the ridge and its floor line. */
export interface DistributionSurfacePoint {
  x: number;
  y: number;
}

/** A real candidate placed on its cohort's density ridge at its actual horizontal outcome. */
export interface DistributionSurfaceAnchor extends DistributionSurfacePoint {
  id: string;
  positive: boolean;
  neutral: boolean;
  selected: boolean;
}

/** One contiguous cohort in the input's chronological order, drawn from back to front. */
export interface DistributionSurfaceProfile {
  index: number;
  depth: number;
  count: number;
  selectedCount: number;
  points: DistributionSurfacePoint[];
  baseline: DistributionSurfacePoint[];
  anchors: DistributionSurfaceAnchor[];
}

/** Optional immutable run metadata keeps accumulating ridges stable between checkpoints. */
export interface DistributionSurfaceOptions {
  /** Full candidate count, held constant from the first checkpoint through completion. */
  expectedCount?: number;
}

const SAMPLE_COUNT = 97;
const MAX_COHORTS = 10;
const WIDTH = DISTRIBUTION_RIGHT - DISTRIBUTION_LEFT;
const KERNEL_RADIUS = 12;
const KERNEL = Array.from({ length: KERNEL_RADIUS * 2 + 1 }, (_, index) =>
  Math.exp(-0.5 * ((index - KERNEL_RADIUS) / 4.4) ** 2)
);
// An observation at an axis boundary concentrates the most mass in one sample.
const MAX_SAMPLE_WEIGHT = 1 / KERNEL.slice(KERNEL_RADIUS).reduce((sum, weight) => sum + weight, 0);

/** Clamp already-normalized screen positions without reinterpreting financial outcomes. */
function screenFraction(x: number): number {
  return Math.max(0, Math.min(1, (x - DISTRIBUTION_LEFT) / WIDTH));
}

/** Spread a measured bin count with an edge-normalized kernel so no mass disappears. */
function smoothCounts(counts: readonly number[]): number[] {
  const smooth = Array<number>(SAMPLE_COUNT).fill(0);
  counts.forEach((count, index) => {
    if (!count) return;
    const start = Math.max(0, index - KERNEL_RADIUS);
    const end = Math.min(SAMPLE_COUNT - 1, index + KERNEL_RADIUS);
    let weight = 0;
    for (let target = start; target <= end; target += 1) weight += KERNEL[target - index + KERNEL_RADIUS];
    for (let target = start; target <= end; target += 1) {
      smooth[target] += (count * KERNEL[target - index + KERNEL_RADIUS]) / weight;
    }
  });
  return smooth;
}

/** Project a shared outcome axis onto a shallow floor, keeping every ridge inside the canvas. */
function floorPoint(fraction: number, depth: number): DistributionSurfacePoint {
  return {
    x: DISTRIBUTION_LEFT + 70 * (1 - depth) + fraction * (WIDTH - 90),
    y: 155 + depth * 104 - fraction * 26,
  };
}

/** Place a representative candidate on the interpolated density silhouette at its original outcome. */
function anchorPoint(
  ball: DistributionBall,
  points: readonly DistributionSurfacePoint[],
  depth: number
): DistributionSurfaceAnchor {
  const fraction = screenFraction(ball.x);
  const position = fraction * (SAMPLE_COUNT - 1);
  const left = Math.min(SAMPLE_COUNT - 2, Math.floor(position));
  const part = position - left;
  return {
    id: ball.id,
    ...floorPoint(fraction, depth),
    y: points[left].y + (points[left + 1].y - points[left].y) * part,
    positive: ball.positive,
    neutral: ball.neutral,
    selected: ball.selected,
  };
}

/**
 * Build at most ten ridges from consecutive, equally sized chronological cohorts.
 * All candidates contribute; anchors only identify a few real points on the full density.
 * Heights share a global count scale. Invalid coordinates are reported and omitted.
 * With expectedCount, cohort positions and the scale are fixed for the whole run, including
 * empty cohorts. The scale is the maximum possible sample count in a full cohort, so new
 * evidence grows its own ridge without shrinking or moving earlier cohorts. Keep the same
 * expectedCount on the completed render; omitted coordinates still occupy their input slot.
 * Invalid or underestimated expected counts fall back to the completed-data layout.
 * The caller supplies the axis: accepted/excluded categories while computing, P&L only after completion.
 */
export function buildDistributionSurface(
  balls: readonly DistributionBall[],
  { expectedCount }: DistributionSurfaceOptions = {}
): {
  profiles: DistributionSurfaceProfile[];
  count: number;
  omittedCount: number;
} {
  const valid = balls.filter((ball) => Number.isFinite(ball.x));
  const count = valid.length;
  const omittedCount = balls.length - count;
  const fixedCount =
    typeof expectedCount === 'number' &&
    Number.isSafeInteger(expectedCount) &&
    expectedCount > 0 &&
    expectedCount >= balls.length
      ? expectedCount
      : null;
  if (!count && fixedCount === null) return { profiles: [], count, omittedCount };
  const cohortCount = Math.min(MAX_COHORTS, fixedCount ?? count);
  const cohorts = Array.from({ length: cohortCount }, () => ({
    balls: [] as DistributionBall[],
    counts: Array<number>(SAMPLE_COUNT).fill(0),
    selectedCount: 0,
  }));
  const chronological = fixedCount === null ? valid : balls;
  chronological.forEach((ball, index) => {
    if (!Number.isFinite(ball.x)) return;
    const cohort = cohorts[Math.min(cohortCount - 1, Math.floor((index * cohortCount) / (fixedCount ?? count)))];
    cohort.balls.push(ball);
    cohort.selectedCount += Number(ball.selected);
    const position = screenFraction(ball.x) * (SAMPLE_COUNT - 1);
    const left = Math.min(SAMPLE_COUNT - 2, Math.floor(position));
    const part = position - left;
    cohort.counts[left] += 1 - part;
    cohort.counts[left + 1] += part;
  });
  const densities = cohorts.map((cohort) => smoothCounts(cohort.counts));
  const peak =
    fixedCount === null ? Math.max(...densities.flat()) : Math.ceil(fixedCount / cohortCount) * MAX_SAMPLE_WEIGHT;
  const profiles = cohorts.map((cohort, index): DistributionSurfaceProfile => {
    const depth = cohortCount === 1 ? 0.5 : index / (cohortCount - 1);
    const baseline = densities[index].map((_, sample) => floorPoint(sample / (SAMPLE_COUNT - 1), depth));
    const points = baseline.map((point, sample) => ({
      x: point.x,
      y: point.y - (densities[index][sample] / peak) * (72 + 20 * depth),
    }));
    const peakSample = densities[index].indexOf(Math.max(...densities[index]));
    const peakFraction = peakSample / (SAMPLE_COUNT - 1);
    const representative = cohort.balls.length
      ? cohort.balls.reduce((nearest, ball) =>
          Math.abs(screenFraction(ball.x) - peakFraction) < Math.abs(screenFraction(nearest.x) - peakFraction)
            ? ball
            : nearest
        )
      : null;
    return {
      index,
      depth,
      count: cohort.balls.length,
      selectedCount: cohort.selectedCount,
      baseline,
      points,
      anchors: representative ? [anchorPoint(representative, points, depth)] : [],
    };
  });
  return { profiles, count, omittedCount };
}

/** A solid screen-space column retains every source candidate without subpixel circle patterns. */
export interface DistributionBin {
  index: number;
  centerX: number;
  width: number;
  top: number;
  bottom: number;
  count: number;
  selectedCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  /** True only when all candidates in the bin have this sign. */
  positive: boolean;
  /** True only when all candidates in the bin are neutral. */
  neutral: boolean;
}

/**
 * Replace dense candidate stacks with at most 35 solid columns on the existing outcome grid.
 * Counts include every valid candidate once; the top follows the highest candidate's actual
 * screen footprint. Geometry is bounded to the plot and never converts financial amounts.
 * Source balls remain untouched for exact pointer hit-testing and keyboard inspection.
 */
export function buildDistributionBins(balls: readonly DistributionBall[]): {
  bins: DistributionBin[];
  count: number;
  omittedCount: number;
} {
  const binCount = 35;
  const width = WIDTH / binCount;
  const bins: DistributionBin[] = Array.from({ length: binCount }, (_, index) => ({
    index,
    centerX: DISTRIBUTION_LEFT + (index + 0.5) * width,
    width,
    top: DISTRIBUTION_BASE,
    bottom: DISTRIBUTION_BASE,
    count: 0,
    selectedCount: 0,
    positiveCount: 0,
    neutralCount: 0,
    negativeCount: 0,
    positive: false,
    neutral: false,
  }));
  let count = 0;
  for (const ball of balls) {
    if (!Number.isFinite(ball.x) || !Number.isFinite(ball.y) || !Number.isFinite(ball.radius) || ball.radius < 0) {
      continue;
    }
    const index = Math.min(binCount - 1, Math.floor(screenFraction(ball.x) * binCount));
    const bin = bins[index];
    count += 1;
    bin.count += 1;
    bin.selectedCount += Number(ball.selected);
    if (ball.neutral) bin.neutralCount += 1;
    else if (ball.positive) bin.positiveCount += 1;
    else bin.negativeCount += 1;
    bin.top = Math.min(bin.top, Math.max(0, Math.min(DISTRIBUTION_BASE, ball.y - ball.radius)));
  }
  const occupied = bins.filter((bin) => bin.count > 0);
  for (const bin of occupied) {
    bin.positive = bin.positiveCount === bin.count;
    bin.neutral = bin.neutralCount === bin.count;
  }
  return { bins: occupied, count, omittedCount: balls.length - count };
}
