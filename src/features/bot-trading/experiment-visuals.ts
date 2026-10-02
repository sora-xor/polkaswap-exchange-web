import { FPNumber } from '@/lib/substrate/math';
import { decimalRatio } from './engine';
import type { BotEquityPoint } from './types';
import {
  DISTRIBUTION_BASE,
  DISTRIBUTION_LEFT,
  DISTRIBUTION_RIGHT,
  distributionPosition,
  distributionRoute,
  layoutTradeDistribution,
  type DistributionBall,
  type DistributionTrade,
} from './tradeDistribution';

/** Plot coordinates are lossy display values; source returns retain exact decimal arithmetic. */
export interface ExperimentPlotPoint {
  timestamp: number;
  returnPercent: string;
  x: number;
  y: number;
}

/** An equity curve normalized to its own opening allocation for cross-token comparisons. */
export interface ExperimentPlotSeries {
  id: string;
  points: ExperimentPlotPoint[];
  path: string;
}

const ZERO = new FPNumber('0', 36);
const HUNDRED = new FPNumber('100', 36);

/** Format human-facing metrics without floating-point token math or negative zero. */
export function formatExperimentPercent(value: string | undefined, signed = false): string {
  if (value === undefined) return '—';
  const amount = new FPNumber(value, 36);
  if (!amount.isFinity()) return '—';
  const rounded = amount.value.toFixed(2, 4);
  if (new FPNumber(rounded, 36).isZero()) return '0.00';
  return `${signed && amount.gt(ZERO) ? '+' : ''}${rounded}`;
}

/**
 * Place every valid equity observation on common UTC and percentage axes.
 * Missing/invalid observations break the curve. They never become fabricated zero returns.
 * The zero-return baseline is included so flat strategies stay visually interpretable.
 */
export function plotExperimentEquity(
  input: readonly { id: string; equity: readonly BotEquityPoint[] }[],
  width = 800,
  height = 220
): {
  series: ExperimentPlotSeries[];
  minimum: string;
  maximum: string;
  start: number | null;
  end: number | null;
  zeroY: number;
} {
  const padding = 10;
  const safeWidth = Math.max(padding * 2 + 1, width);
  const safeHeight = Math.max(padding * 2 + 1, height);
  let minimum = ZERO;
  let maximum = ZERO;
  let start = Infinity;
  let end = -Infinity;
  const normalized = input.map(({ id, equity }) => {
    const initial = new FPNumber(equity[0]?.value ?? '0', 36);
    const points = equity.map((point) => {
      const value = new FPNumber(point.value, 36);
      if (!Number.isFinite(point.timestamp) || !initial.isFinity() || !initial.gt(ZERO) || !value.isFinity())
        return null;
      const change = decimalRatio(value.sub(initial), initial).mul(HUNDRED);
      minimum = minimum.min(change);
      maximum = maximum.max(change);
      start = Math.min(start, point.timestamp);
      end = Math.max(end, point.timestamp);
      return { timestamp: point.timestamp, change };
    });
    return { id, points };
  });
  if (maximum.eq(minimum)) {
    minimum = minimum.sub(new FPNumber('1', 36));
    maximum = maximum.add(new FPNumber('1', 36));
  }
  const range = maximum.sub(minimum);
  const toY = (value: FPNumber) =>
    safeHeight - padding - decimalRatio(value.sub(minimum), range).toNumber() * (safeHeight - padding * 2);
  return {
    minimum: minimum.toString(),
    maximum: maximum.toString(),
    start: Number.isFinite(start) ? start : null,
    end: Number.isFinite(end) ? end : null,
    zeroY: toY(ZERO),
    series: normalized.map(({ id, points }) => {
      let connected = false;
      const commands: string[] = [];
      const plotted: ExperimentPlotPoint[] = [];
      for (const point of points) {
        if (!point) {
          connected = false;
          continue;
        }
        const x = padding + ((point.timestamp - start) / Math.max(1, end - start)) * (safeWidth - padding * 2);
        const y = toY(point.change);
        commands.push(`${connected ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`);
        plotted.push({ timestamp: point.timestamp, returnPercent: point.change.toString(), x, y });
        connected = true;
      }
      return { id, path: commands.join(' '), points: plotted };
    }),
  };
}

/** A real evaluated opportunity; missing P&L is never displayed as a zero return. */
export interface CalculationDecision extends Omit<DistributionTrade, 'pnl'> {
  pnl?: string;
}

/** Engine checkpoints are the only clock used by the computation visualization. */
export interface CalculationUpdate {
  checkpoint: number;
  scope: 'study' | 'train' | 'test';
  fold?: number;
  variant?: number;
  scopeCompleted: number;
  scopeTotal: number;
  decisions: readonly CalculationDecision[];
  /** The runner retains all current-scope evidence so newly mounted lanes recover earlier checkpoints. */
  scopeDecisions?: readonly CalculationDecision[];
  gateTotals: Record<string, { passed: number; rejected: number }>;
}

/** Only one calculation scope is retained; validation never masquerades as study P&L. */
export interface CalculationDistributionState {
  scope: string;
  checkpoint: number;
  decisions: CalculationDecision[];
  currentIds: string[];
}

/** Each real evaluator checkpoint has one short presentation window before work continues. */
export const CALCULATION_MOTION_MS = 160;

/**
 * Keep candidates at their real category positions throughout a checkpoint.
 * Arrival is conveyed by opacity, so batch boundaries cannot relaunch or teleport prior evidence.
 */
export function calculationDistributionPosition(
  ball: DistributionBall,
  incomingIndex: number | undefined,
  incomingCount: number,
  progress: number,
  route = distributionRoute(ball)
): ReturnType<typeof distributionPosition> {
  const point = distributionPosition(ball, 1, 1, route);
  return {
    ...point,
    settled:
      incomingIndex === undefined || calculationDistributionOpacity(incomingIndex, incomingCount, progress) === 1,
  };
}

/** Fade only actual incoming candidates in place, with a small stagger and zero-velocity endpoints. */
export function calculationDistributionOpacity(
  incomingIndex: number | undefined,
  incomingCount: number,
  progress: number
): number {
  if (incomingIndex === undefined) return 1;
  const bounded = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 1));
  const delay = incomingCount > 1 ? (incomingIndex / (incomingCount - 1)) * 0.12 : 0;
  const local = Math.max(0, Math.min(1, (bounded - delay) / (1 - delay)));
  return local * local * (3 - 2 * local);
}

/** Append actual checkpoint deltas once, resetting at a new study/fold or restarted calculation. */
export function extendCalculationDistribution(
  previous: CalculationDistributionState | undefined,
  update: CalculationUpdate
): CalculationDistributionState {
  const scope = `${update.scope}:${update.fold ?? 0}:${update.variant ?? 0}`;
  if (previous?.scope === scope && previous.checkpoint === update.checkpoint) return previous;
  const retained = previous?.scope === scope && previous.checkpoint < update.checkpoint ? previous.decisions : [];
  const decisions = new Map((update.scopeDecisions ?? retained).map((decision) => [decision.id, decision]));
  for (const decision of update.decisions) decisions.set(decision.id, { ...decision, checks: [...decision.checks] });
  return {
    scope,
    checkpoint: update.checkpoint,
    decisions: [...decisions.values()].slice(-10000),
    currentIds: update.decisions.map((decision) => decision.id),
  };
}

/** Position evaluated decisions in accepted/excluded bins without manufacturing financial outcomes. */
export function layoutCalculationDistribution(decisions: readonly CalculationDecision[]) {
  // Zero is only a layout seed: this graph labels decision categories and never renders monetary P&L.
  const layout = layoutTradeDistribution(decisions.map((decision) => ({ ...decision, pnl: '0' })));
  const groups = [layout.balls.filter((ball) => !ball.selected), layout.balls.filter((ball) => ball.selected)];
  const width = (DISTRIBUTION_RIGHT - DISTRIBUTION_LEFT) / 3;
  groups.forEach((group, index) => {
    group.forEach((ball, position) => {
      // A fixed lattice prevents earlier decisions resizing and jumping on every appended batch.
      ball.radius = 1.1;
      const columns = Math.max(1, Math.floor((width - 12) / (ball.radius * 2.3)));
      const column = position % columns;
      const row = Math.floor(position / columns);

      ball.x =
        DISTRIBUTION_LEFT +
        (index === 0 ? 0.25 : 0.75) * (DISTRIBUTION_RIGHT - DISTRIBUTION_LEFT) +
        (column - (columns - 1) / 2) * ball.radius * 2.3;
      ball.y = DISTRIBUTION_BASE - ball.radius - row * ball.radius * 2.3;
      ball.positive = ball.selected;
      ball.neutral = !ball.selected;
    });
  });
  return layout;
}
