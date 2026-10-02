import { FPNumber } from '@/lib/substrate/math';

/** Minimal immutable trade projection accepted by the distribution canvas. */
export interface DistributionTrade {
  id: string;
  timestamp: number;
  selected: boolean;
  pnl: string;
  /** Optional original evidence lets the chart explain a recorded decision without inventing details. */
  action?: 'buy' | 'sell';
  signalTimestamp?: number;
  endTimestamp?: number;
  /** Original strategy explanation and input-per-output execution price, when recorded. */
  reason?: string;
  price?: string;
  checks: readonly { key: string; passed: boolean; actual?: string; limit?: string; assetAddress?: string }[];
}

/** Coordinates are presentation-only; no numeric conversion is returned to the trading engine. */
export interface DistributionBall {
  id: string;
  index: number;
  x: number;
  y: number;
  radius: number;
  positive: boolean;
  neutral: boolean;
  selected: boolean;
  gates: boolean[];
}

/** Ordered replay boundary used by the parent to account for only landed candidates. */
export interface DistributionReplayState {
  settledCount: number;
}

export const DISTRIBUTION_WIDTH = 900;
export const DISTRIBUTION_HEIGHT = 500;
export const DISTRIBUTION_LEFT = 144;
export const DISTRIBUTION_RIGHT = 874;
export const DISTRIBUTION_BASE = 456;
export const DISTRIBUTION_GATE_TOP = 84;
export const DISTRIBUTION_GATE_STEP = 35;

/** Keep all animation consumers on precisely the same staggered floating-point timing. */
export function distributionTiming(
  index: number,
  total: number,
  progress: number
): { bounded: number; delay: number; local: number } {
  const bounded = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 1));
  const delay = total > 1 ? (index / (total - 1)) * 0.62 : 0;
  return { bounded, delay, local: Math.max(0, Math.min(1, (bounded - delay) / 0.38)) };
}

/** Find the reached prefix without scanning every trade on each animation frame. */
function reachedPrefix(total: number, reached: (index: number) => boolean): number {
  let lower = 0;
  let upper = total;
  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if (reached(middle)) lower = middle + 1;
    else upper = middle;
  }
  return lower;
}

/** Count landed balls with the identical settlement predicate used by the canvas. */
export function distributionSettledCount(total: number, progress: number): number {
  return reachedPrefix(total, (index) => distributionTiming(index, total, progress).local === 1);
}

/** Count candidates that have reached a particular gate, including candidates rejected earlier. */
export function distributionGateReachedCount(
  total: number,
  progress: number,
  gateCount: number,
  gateIndex: number
): number {
  return reachedPrefix(
    total,
    (index) => Math.floor(distributionTiming(index, total, progress).local * (gateCount + 1)) > gateIndex
  );
}

/**
 * Pack every candidate into a symmetric, signed P&L histogram without sampling.
 * FPNumber normalizes exact decimals before the final conversion to pixel ratios.
 * Radius adapts to the densest bin so even identical outcomes remain in bounds.
 */
export function layoutTradeDistribution(trades: readonly DistributionTrade[]): {
  balls: DistributionBall[];
  gates: string[];
  extent: string;
} {
  const zero = new FPNumber('0', 36);
  const values = trades.map((trade) => {
    const value = new FPNumber(trade.pnl, 36);
    return value.isFinity() ? value : zero;
  });
  const extent = values.reduce((largest, value) => {
    const magnitude = value.lt(zero) ? zero.sub(value) : value;
    return magnitude.gt(largest) ? magnitude : largest;
  }, zero);
  const gates = [...new Set(trades.flatMap((trade) => trade.checks.map((check) => check.key)))];
  const binCount = 35;
  const binWidth = (DISTRIBUTION_RIGHT - DISTRIBUTION_LEFT) / binCount;
  const bins = Array.from({ length: binCount }, () => [] as number[]);
  values.forEach((value, index) => {
    const ratio = extent.isZero() ? 0 : Number(value.div(extent).toString());
    const middle = Math.floor(binCount / 2);
    const offset = Math.max(1, Math.ceil(Math.abs(ratio) * middle));
    const bin = value.isZero() ? middle : value.gt(zero) ? middle + offset : middle - offset;
    bins[bin].push(index);
  });
  const largestBin = Math.max(1, ...bins.map((bin) => bin.length));
  const pileHeight = Math.max(
    80,
    DISTRIBUTION_BASE - (DISTRIBUTION_GATE_TOP + gates.length * DISTRIBUTION_GATE_STEP + 18)
  );
  let radius = 4.4;
  let columns = Math.max(1, Math.floor((binWidth - 2) / (radius * 2.3)));
  while (Math.ceil(largestBin / columns) * radius * 2.3 > pileHeight) {
    radius *= 0.9;
    columns = Math.max(1, Math.floor((binWidth - 2) / (radius * 2.3)));
  }
  const balls: DistributionBall[] = new Array(trades.length);
  bins.forEach((bin, binIndex) => {
    bin.forEach((tradeIndex, position) => {
      const trade = trades[tradeIndex];
      const column = position % columns;
      const row = Math.floor(position / columns);
      const rowSize = Math.min(columns, bin.length - row * columns);
      balls[tradeIndex] = {
        id: trade.id,
        index: tradeIndex,
        x: DISTRIBUTION_LEFT + (binIndex + 0.5) * binWidth + (column - (rowSize - 1) / 2) * radius * 2.3,
        y: DISTRIBUTION_BASE - radius - row * radius * 2.3,
        radius,
        positive: values[tradeIndex].gt(zero),
        neutral: values[tradeIndex].isZero(),
        selected: trade.selected,
        gates: gates.map((key) => trade.checks.find((check) => check.key === key)?.passed ?? false),
      };
    });
  });
  return { balls, gates, extent: extent.toString() };
}

/** Return a measured fan from the incoming cohort through each gate to its actual outcome. */
export function distributionRoute(ball: DistributionBall): { x: number; y: number }[] {
  const center = (DISTRIBUTION_LEFT + DISTRIBUTION_RIGHT) / 2;
  const offset = ball.x - center;
  return [
    { x: center + offset * 0.12, y: 24 },
    ...ball.gates.map((_passed, index) => ({
      x: center + offset * (0.12 + 0.88 * ((index + 1) / (ball.gates.length + 1)) ** 1.5),
      y: DISTRIBUTION_GATE_TOP + index * DISTRIBUTION_GATE_STEP,
    })),
    { x: ball.x, y: ball.y },
  ];
}

/** Monotone cubic interpolation keeps velocity continuous at gates without overshoot or bouncing. */
function routeCoordinate(route: { x: number; y: number }[], segment: number, part: number, axis: 'x' | 'y'): number {
  const from = route[segment][axis];
  const to = route[segment + 1][axis];
  const delta = to - from;
  const before = segment > 0 ? from - route[segment - 1][axis] : 0;
  const after = segment + 2 < route.length ? route[segment + 2][axis] - to : 0;
  const startSlope = before * delta > 0 ? (2 * before * delta) / (before + delta) : 0;
  const endSlope = delta * after > 0 ? (2 * delta * after) / (delta + after) : 0;
  const squared = part * part;
  const cubed = squared * part;
  return (
    (2 * cubed - 3 * squared + 1) * from +
    (cubed - 2 * squared + part) * startSlope +
    (-2 * cubed + 3 * squared) * to +
    (cubed - squared) * endSlope
  );
}

/**
 * Seekable deterministic animation keeps queued and settled trades visible.
 * Progress changes only pixel coordinates; there is no simulated financial arithmetic here.
 */
export function distributionPosition(
  ball: DistributionBall,
  total: number,
  progress: number,
  route = distributionRoute(ball)
): { x: number; y: number; settled: boolean; rejected: boolean; waiting: boolean; gate: number } {
  const { bounded, delay, local } = distributionTiming(ball.index, total, progress);
  const segmentPosition = local * (route.length - 1);
  const segment = Math.min(route.length - 2, Math.floor(segmentPosition));
  const part = local === 1 ? 1 : segmentPosition - segment;
  return {
    x: local === 1 ? ball.x : routeCoordinate(route, segment, part, 'x'),
    y: local === 1 ? ball.y : routeCoordinate(route, segment, part, 'y'),
    settled: local === 1,
    rejected:
      ball.gates.slice(0, Math.floor(segmentPosition)).some((passed) => !passed) || (local === 1 && !ball.selected),
    waiting: bounded < delay,
    gate: segment > 0 && segment <= ball.gates.length ? segment - 1 : -1,
  };
}
