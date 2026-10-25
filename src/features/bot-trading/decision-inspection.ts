import type { ResultDistributionBin, ResultDistributionInsights } from './result-insights';
import type { DistributionTrade } from './tradeDistribution';
import { FPNumber } from '@/lib/substrate/math';
import type { BotAsset } from './types';
import { FLOW_PLOT_BOTTOM, FLOW_PLOT_TOP, type TradeFlowLayout } from './trade-flow';

export type DecisionView = 'all' | 'selected' | 'excluded';
export type DecisionKind = 'taken' | 'noSignal' | 'blocked' | 'unknown';

/** Distinguish an hourly observation without a signal from an actual signal blocked by a check. */
export function decisionKind(trade: DistributionTrade): DecisionKind {
  if (trade.selected) return 'taken';
  const signal = trade.checks.find((check) => check.key === 'signal');
  return signal ? (signal.passed ? 'blocked' : 'noSignal') : 'unknown';
}

/** Mutually exclusive decision counts describe all recorded hourly checks, including omitted chart outcomes. */
export function summarizeDecisionKinds(trades: readonly DistributionTrade[]) {
  const summary = { checked: trades.length, taken: 0, noSignal: 0, blocked: 0, unknown: 0 };
  for (const trade of trades) summary[decisionKind(trade)] += 1;
  return summary;
}

/** Inspection follows the visible group; hiding skipped decisions must also hide them from arrow navigation. */
export function decisionsInView(trades: readonly DistributionTrade[], view: DecisionView): DistributionTrade[] {
  return trades.filter((trade) => view === 'all' || trade.selected === (view === 'selected'));
}

/** Count the displayed group within an immutable shared histogram interval. */
export function decisionsInBin(bin: ResultDistributionBin, view: DecisionView): number {
  return view === 'all' ? bin.count : view === 'selected' ? bin.selectedCount : bin.excludedCount;
}

/** Rescale only count heights; shared signed intervals, recorded identities and timing stay fixed. */
export function tradeFlowForView(
  layout: TradeFlowLayout,
  insights: ResultDistributionInsights,
  view: DecisionView
): TradeFlowLayout {
  if (view === 'all') return layout;
  const countMaximum = Math.max(
    4,
    Math.ceil(Math.max(0, ...insights.bins.map((bin) => decisionsInBin(bin, view))) / 4) * 4
  );
  const countHeight = (FLOW_PLOT_BOTTOM - FLOW_PLOT_TOP) / countMaximum;
  const width = Math.max(1, Math.min(64, layout.binWidth - 5));
  const columns = Math.max(1, Math.min(5, Math.floor(width / 9)));
  const ranks = new Map<number, { selected: number; excluded: number }>();
  const particles = layout.particles.map((particle) => {
    const rank = ranks.get(particle.binIndex) ?? { selected: 0, excluded: 0 };
    ranks.set(particle.binIndex, rank);
    const index = particle.selected ? rank.selected++ : rank.excluded++;
    const base = particle.selected ? 0 : particle.selectedBelow;
    return {
      ...particle,
      y: FLOW_PLOT_BOTTOM - (base + index + 0.5) * countHeight,
      radius: Math.min(4.4, width / columns / 2.4, countHeight / 2.4),
    };
  });
  return { ...layout, particles, countMaximum };
}

/** Only advertise a common valuation date when supplied records agree on it. */
export function commonDecisionEndpoint(trades: readonly DistributionTrade[]): number | undefined {
  let timestamp: number | undefined;
  for (const trade of trades) {
    const end = trade.endTimestamp;
    if (end === undefined) continue;
    if (!Number.isFinite(end) || !Number.isFinite(new Date(end).getTime())) return;
    if (timestamp !== undefined && timestamp !== end) return;
    timestamp = end;
  }
  return timestamp;
}

/** Decode amount evidence with its recorded asset; missing metadata never becomes an invented denomination. */
export function formatDecisionCheckValue(
  check: DistributionTrade['checks'][number],
  field: 'actual' | 'limit',
  assets: readonly BotAsset[]
): string | undefined {
  const value = check[field];
  if (value === undefined || value.length > 256 || !/^(0|[1-9]\d*)$/.test(value)) return;
  if (check.key === 'cooldown') return `${new FPNumber(value, 40).div('1000').toString()} s`;
  const asset = assets.find((entry) => entry.address === check.assetAddress);
  if (!asset || !Number.isInteger(asset.decimals) || asset.decimals < 0 || asset.decimals > 255) return;
  return `${FPNumber.fromCodecValue(value, asset.decimals).toString()} ${asset.symbol}`;
}
