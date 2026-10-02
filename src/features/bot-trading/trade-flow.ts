/**
 * Deterministic presentation of actual historical candidates passing their recorded checks.
 * Exact P&L only chooses an authoritative histogram interval; all trajectories use pixels.
 * Excluded candidates retain their measured outcome and never become simulated fills.
 */
import { FPNumber } from '@/lib/substrate/math';
import type { ResultDistributionInsights } from './result-insights';
import type { DistributionTrade } from './tradeDistribution';

export const FLOW_WIDTH = 900;
export const FLOW_HEIGHT = 620;
export const FLOW_PLOT_LEFT = 76;
export const FLOW_PLOT_RIGHT = 876;
export const FLOW_PLOT_TOP = 330;
export const FLOW_PLOT_BOTTOM = 552;
export const FLOW_INLET_Y = 28;
export const FLOW_BYPASS_X = 848;

/** Independent recorded check counts; missing checks contribute to neither outcome. */
export interface TradeFlowGate {
  key: string;
  passed: number;
  rejected: number;
  total: number;
  y: number;
}

/** One measured candidate and its immutable final footprint within a signed histogram bin. */
export interface TradeFlowParticle {
  id: string;
  sourceIndex: number;
  binIndex: number;
  selected: boolean;
  /** Complete selected count in this bin; presentation may reserve only the already landed portion. */
  selectedBelow: number;
  sign: 'profit' | 'loss' | 'zero';
  x: number;
  y: number;
  radius: number;
  firstFailedGate: number | null;
  gates: readonly (boolean | null)[];
}

/** A single count scale and ordered gate rail shared by every visibility filter and particle. */
export interface TradeFlowLayout {
  particles: TradeFlowParticle[];
  gates: TradeFlowGate[];
  countMaximum: number;
  binWidth: number;
  omittedCount: number;
}

/** Presentation state only; rejected means a real failed check has been reached. */
export interface TradeFlowPosition {
  x: number;
  y: number;
  waiting: boolean;
  gate: number;
  rejected: boolean;
  settled: boolean;
}

/** First-failure explanation in display order, separate from independently evaluated checks. */
export interface TradeFlowDecisionGate {
  key: string;
  /** Opportunities that have not already been attributed to an earlier skip reason. */
  reached: number;
  /** Opportunities continuing to the next displayed check, including missing check evidence. */
  continued: number;
  /** Skipped opportunities attributed to their first recorded failed check exactly once. */
  skippedHere: number;
  /** Reached opportunities without a recorded result for this check; never treated as passes. */
  missingHere: number;
}

/** Recorded decisions reconcile without counting one skipped opportunity at several failed checks. */
export interface TradeFlowDecisionSummary {
  total: number;
  selectedCount: number;
  skippedCount: number;
  unexplainedSkippedCount: number;
  /** Contradictory imported evidence is exposed instead of changing the recorded decision. */
  inconsistentSelectedCount: number;
  gates: TradeFlowDecisionGate[];
}

/** Mutually exclusive presentation phases and arrived outcomes, independent of chart visibility. */
export interface TradeFlowProgress {
  total: number;
  waiting: number;
  inFlight: number;
  checking: number;
  travellingToBin: number;
  landed: number;
  landedSelected: number;
  landedSkipped: number;
  gates: TradeFlowDecisionGate[];
}

interface FlowPoint {
  x: number;
  y: number;
}

/** Immutable layouts own their cached pixel routes; discarded views release both weak keys. */
const routeCache = new WeakMap<TradeFlowLayout, WeakMap<TradeFlowParticle, readonly FlowPoint[]>>();

/**
 * Explain each recorded skip once, at its first failed check in the shared display order.
 * These are display-sequence counts, not the engine's independent pass/fail totals. Missing
 * evidence continues through the visual sequence but is counted separately, never as a pass.
 * A recorded skipped opportunity without a failed check remains explicitly unexplained.
 * P&L validity does not affect decision counts: an omitted outcome still has its decision.
 */
export function summarizeTradeFlowDecisions(trades: readonly DistributionTrade[]): TradeFlowDecisionSummary {
  const keys = [...new Set(trades.flatMap((trade) => trade.checks.map((check) => check.key)))];
  const gates: TradeFlowDecisionGate[] = keys.map((key) => ({
    key,
    reached: 0,
    continued: 0,
    skippedHere: 0,
    missingHere: 0,
  }));
  let selectedCount = 0;
  let skippedCount = 0;
  let unexplainedSkippedCount = 0;
  let inconsistentSelectedCount = 0;
  for (const trade of trades) {
    const checks = keys.map((key) => trade.checks.find((check) => check.key === key)?.passed ?? null);
    const firstFailed = checks.indexOf(false);
    if (trade.selected) {
      selectedCount += 1;
      if (firstFailed >= 0) inconsistentSelectedCount += 1;
    } else {
      skippedCount += 1;
      if (firstFailed < 0) unexplainedSkippedCount += 1;
    }
    // The recorded selection remains authoritative if imported check evidence contradicts it.
    const stop = trade.selected || firstFailed < 0 ? keys.length : firstFailed;
    gates.forEach((gate, index) => {
      if (index > stop) return;
      gate.reached += 1;
      if (checks[index] === null) gate.missingHere += 1;
      if (index === stop) gate.skippedHere += 1;
      else gate.continued += 1;
    });
  }
  return {
    total: trades.length,
    selectedCount,
    skippedCount,
    unexplainedSkippedCount,
    inconsistentSelectedCount,
    gates,
  };
}

/** Reject the same noncanonical, oversized and nonfinite outcomes as result-insights. */
function validOutcome(value: string): boolean {
  return typeof value === 'string' && value.length <= 256 && /^-?(0|[1-9]\d*)(\.\d+)?$/.test(value);
}

/**
 * Bind every valid candidate to the exact supplied histogram interval without sampling.
 * Selected observations occupy each bar's lower portion, excluded observations its upper
 * portion. Independent gate counts include available checks even when P&L is omitted.
 * Callers supply insights for this same immutable candidate collection.
 */
export function layoutTradeFlow(
  trades: readonly DistributionTrade[],
  insights: ResultDistributionInsights
): TradeFlowLayout {
  const keys = [...new Set(trades.flatMap((trade) => trade.checks.map((check) => check.key)))];
  const gates = keys.map((key, index): TradeFlowGate => {
    let passed = 0;
    let rejected = 0;
    for (const trade of trades) {
      const check = trade.checks.find((entry) => entry.key === key);
      if (check?.passed === true) passed += 1;
      else if (check?.passed === false) rejected += 1;
    }
    return {
      key,
      passed,
      rejected,
      total: passed + rejected,
      y: 70 + (keys.length > 1 ? (index / (keys.length - 1)) * 150 : 0),
    };
  });
  const precision = trades.reduce(
    (maximum, trade) =>
      validOutcome(trade.pnl) ? Math.max(maximum, (trade.pnl.split('.')[1]?.length ?? 0) + 4) : maximum,
    40
  );
  const numericBins = insights.bins.map((bin) => ({
    bin,
    lower: new FPNumber(bin.lower, Math.max(precision, (bin.lower.split('.')[1]?.length ?? 0) + 4)),
    upper: new FPNumber(bin.upper, Math.max(precision, (bin.upper.split('.')[1]?.length ?? 0) + 4)),
  }));
  const countMaximum = Math.max(4, Math.ceil(Math.max(0, ...insights.bins.map((bin) => bin.count)) / 4) * 4);
  const binWidth = (FLOW_PLOT_RIGHT - FLOW_PLOT_LEFT) / Math.max(1, insights.bins.length);
  const width = Math.max(1, Math.min(64, binWidth - 5));
  const columns = Math.max(1, Math.min(5, Math.floor(width / 9)));
  const countHeight = (FLOW_PLOT_BOTTOM - FLOW_PLOT_TOP) / countMaximum;
  const positions = new Map<number, { selected: number; excluded: number }>();
  const particles: TradeFlowParticle[] = [];
  trades.forEach((trade, sourceIndex) => {
    if (!validOutcome(trade.pnl)) return;
    const value = new FPNumber(trade.pnl, precision);
    if (!value.isFinity()) return;
    const match = numericBins.find(
      ({ bin, lower, upper }) =>
        (bin.lowerInclusive ? value.gte(lower) : value.gt(lower)) &&
        (bin.upperInclusive ? value.lte(upper) : value.lt(upper))
    );
    if (!match) return;
    const { bin } = match;
    const ranks = positions.get(bin.index) ?? { selected: 0, excluded: 0 };
    const rank = trade.selected ? ranks.selected++ : ranks.excluded++;
    positions.set(bin.index, ranks);
    const baseCount = trade.selected ? 0 : bin.selectedCount;
    const column = rank % columns;
    const columnOffset =
      columns % 2 === 0
        ? (Math.floor(column / 2) + 0.5) * (column % 2 === 0 ? -1 : 1)
        : Math.ceil(column / 2) * (column % 2 === 0 ? 1 : -1);
    const gateResults = keys.map((key) => trade.checks.find((check) => check.key === key)?.passed ?? null);
    const firstFailed = gateResults.indexOf(false);
    particles.push({
      id: trade.id,
      sourceIndex,
      binIndex: bin.index,
      selected: trade.selected,
      selectedBelow: bin.selectedCount,
      sign: bin.sign,
      x: FLOW_PLOT_LEFT + (bin.index + 0.5) * binWidth + columnOffset * (width / columns),
      y: FLOW_PLOT_BOTTOM - (baseCount + rank + 0.5) * countHeight,
      radius: Math.min(4.4, width / columns / 2.4, countHeight / 2.4),
      firstFailedGate: firstFailed < 0 ? null : firstFailed,
      gates: gateResults,
    });
  });
  return { particles, gates, countMaximum, binWidth, omittedCount: trades.length - particles.length };
}

/** Clamp only presentation time, with invalid progress safely showing the settled evidence. */
function boundedProgress(progress: number): number {
  return Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 1;
}

/** Stagger an actual checkpoint batch; no index depends on the size of previously settled data. */
export function flowBatchProgress(index: number, total: number, progress: number): number {
  const bounded = boundedProgress(progress);
  if (!Number.isFinite(total) || total <= 1) return bounded;
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.min(Math.max(0, total - 1), index)) : 0;
  const delay = (safeIndex / (total - 1)) * 0.42;
  return Math.max(0, Math.min(1, (bounded - delay) / 0.58));
}

/**
 * Count only observed crossings and arrivals at the exact progress used by the renderer.
 * Previously settled IDs contribute their complete path; incoming IDs use the same stagger
 * as flowPosition. Gates attribute each recorded skip once. Counts describe plotted outcomes,
 * so omitted outcomes remain in summarizeTradeFlowDecisions but never become moving points.
 */
export function summarizeTradeFlowProgress(
  layout: TradeFlowLayout,
  incoming: ReadonlyMap<string, number>,
  progress: number
): TradeFlowProgress {
  const summary: TradeFlowProgress = {
    total: layout.particles.length,
    waiting: 0,
    inFlight: 0,
    checking: 0,
    travellingToBin: 0,
    landed: 0,
    landedSelected: 0,
    landedSkipped: 0,
    gates: layout.gates.map(({ key }) => ({ key, reached: 0, continued: 0, skippedHere: 0, missingHere: 0 })),
  };
  for (const particle of layout.particles) {
    const index = incoming.get(particle.id);
    const local = index === undefined ? 1 : flowBatchProgress(index, incoming.size, progress);
    const position = flowPosition(particle, local, layout);
    if (position.waiting) summary.waiting += 1;
    else if (position.settled) {
      summary.landed += 1;
      if (particle.selected) summary.landedSelected += 1;
      else summary.landedSkipped += 1;
    } else {
      summary.inFlight += 1;
      if (position.rejected || local * (layout.gates.length + 3) >= layout.gates.length + 1)
        summary.travellingToBin += 1;
      else summary.checking += 1;
    }
    const reached = Math.floor(local * (layout.gates.length + 3)) - 1;
    const stop =
      particle.selected || particle.firstFailedGate === null ? layout.gates.length : particle.firstFailedGate;
    summary.gates.forEach((gate, gateIndex) => {
      if (position.waiting || gateIndex > reached || gateIndex > stop) return;
      gate.reached += 1;
      if (particle.gates[gateIndex] === null) gate.missingHere += 1;
      if (gateIndex === stop) gate.skippedHere += 1;
      else gate.continued += 1;
    });
  }
  return summary;
}

/** Build a fan through recorded gates, branching onto a separate rail after the first failure. */
function particleRoute(particle: TradeFlowParticle, layout: TradeFlowLayout): readonly FlowPoint[] {
  let routes = routeCache.get(layout);
  if (!routes) {
    routes = new WeakMap();
    routeCache.set(layout, routes);
  }
  const cached = routes.get(particle);
  if (cached) return cached;
  const center = (FLOW_PLOT_LEFT + FLOW_PLOT_RIGHT) / 2;
  const offset = particle.x - center;
  const lane = ((particle.sourceIndex % 9) - 4) * 6;
  const route = [{ x: center + lane + offset * 0.025, y: FLOW_INLET_Y }];
  layout.gates.forEach((gate, index) => {
    const diverted = particle.firstFailedGate !== null && index > particle.firstFailedGate;
    route.push({
      x: diverted ? FLOW_BYPASS_X + lane * 0.15 : center + lane + offset * 0.06,
      y: gate.y,
    });
  });
  route.push({
    x: particle.firstFailedGate !== null ? FLOW_BYPASS_X + lane * 0.15 : center + offset * 0.3,
    y: 266,
  });
  route.push({ x: particle.x, y: 310 });
  route.push({ x: particle.x, y: particle.y });
  routes.set(particle, route);
  return route;
}

/** Monotone cubic interpolation keeps gate crossings smooth and stays between adjacent endpoints. */
function coordinate(route: readonly FlowPoint[], segment: number, part: number, axis: 'x' | 'y'): number {
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
 * Seek an actual candidate through its checks and into its exact outcome bin.
 * Missing checks never produce a failure. A failed candidate bypasses later visual gates,
 * although all independently evaluated check counts remain available in the layout.
 */
export function flowPosition(
  particle: TradeFlowParticle,
  localProgress: number,
  layout: TradeFlowLayout
): TradeFlowPosition {
  const progress = boundedProgress(localProgress);
  const route = particleRoute(particle, layout);
  const position = progress * (route.length - 1);
  const segment = Math.min(route.length - 2, Math.floor(position));
  const part = progress === 1 ? 1 : position - segment;
  const reachedGate = Math.min(layout.gates.length - 1, Math.floor(position) - 1);
  const rejected = particle.firstFailedGate !== null && reachedGate >= particle.firstFailedGate;
  const gate =
    reachedGate >= 0 &&
    position < layout.gates.length + 1 &&
    particle.gates[reachedGate] !== null &&
    (!rejected || reachedGate === particle.firstFailedGate)
      ? reachedGate
      : -1;
  return {
    x: progress === 1 ? particle.x : coordinate(route, segment, part, 'x'),
    y: progress === 1 ? particle.y : coordinate(route, segment, part, 'y'),
    waiting: progress === 0,
    gate,
    rejected,
    settled: progress === 1,
  };
}

/**
 * Align arrivals with the visible landed stack without changing their authoritative outcome bin.
 * Excluded points reserve only landed selected count in All, and no selected count in Excluded.
 * The destination adjustment blends through the final flight segment, preserving cached gates
 * and routes. Selected arrivals remain unchanged; only screen coordinates are adjusted.
 */
export function flowLandingPosition(
  particle: TradeFlowParticle,
  localProgress: number,
  layout: TradeFlowLayout,
  landedSelectedCount: number,
  visibility: 'all' | 'selected' | 'excluded'
): TradeFlowPosition {
  const point = flowPosition(particle, localProgress, layout);
  if (particle.selected || visibility === 'selected') return point;
  const landedSelected = Number.isFinite(landedSelectedCount)
    ? Math.max(0, Math.min(particle.selectedBelow, landedSelectedCount))
    : 0;
  const countOffset = visibility === 'excluded' ? particle.selectedBelow : particle.selectedBelow - landedSelected;
  const lastSegment = layout.gates.length + 2;
  const landing = boundedProgress(boundedProgress(localProgress) * (lastSegment + 1) - lastSegment);
  const blend = landing * landing * (3 - 2 * landing);
  const countHeight = (FLOW_PLOT_BOTTOM - FLOW_PLOT_TOP) / layout.countMaximum;
  return { ...point, y: point.y + countOffset * countHeight * blend };
}
