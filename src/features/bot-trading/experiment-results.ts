import { FPNumber } from '@/lib/substrate/math';
import { decimalRatio } from './engine';
import type { ResearchCandidate, ResearchCheck, ResearchFold, ResearchResult } from './research';
import type { BotEquityPoint } from './types';

/** Values of the same full-period portfolio, including its separately allocated fee reserve. */
export interface ExperimentPortfolioSummary {
  initial: string;
  final: string;
  netChange: string;
  heldFinal: string;
  excessOverHolding: string;
  valuedAt: number;
}

/** Read net values from the engine's marked holdings without inventing a liquidation or subtracting costs twice. */
export function summarizeExperimentPortfolio(
  equity: readonly BotEquityPoint[]
): ExperimentPortfolioSummary | undefined {
  if (equity.length < 2) return undefined;
  const first = equity[0];
  const last = equity.at(-1)!;
  const initial = new FPNumber(first.value, 36);
  const final = new FPNumber(last.value, 36);
  const heldFinal = new FPNumber(last.benchmark, 36);
  const zero = new FPNumber('0', 36);
  if (
    [initial, final, heldFinal].some((value) => !value.isFinity() || value.lt(zero)) ||
    !Number.isFinite(last.timestamp)
  )
    return undefined;
  return {
    initial: initial.toString(),
    final: final.toString(),
    netChange: final.sub(initial).toString(),
    heldFinal: heldFinal.toString(),
    excessOverHolding: final.sub(heldFinal).toString(),
    valuedAt: last.timestamp,
  };
}

/** Format a portfolio value without converting token amounts to JavaScript floating point. */
export function formatExperimentValue(value: string | undefined, signed = false): string {
  if (value === undefined) return '—';
  const amount = new FPNumber(value, 36);
  if (!amount.isFinity()) return '—';
  const zero = new FPNumber('0', 36);
  const prefix = amount.lt(zero) ? '−' : signed && amount.gt(zero) ? '+' : '';
  const magnitude = amount.abs();
  if (magnitude.gt(zero) && magnitude.lt(new FPNumber('0.0001', 36))) return `${prefix}<0.0001`;
  return `${prefix}${magnitude.value.toFixed(4, 1).replace(/\.?0+$/, '') || '0'}`;
}

export type ExperimentReviewTarget = 'order-size' | 'rules' | 'fees';
type BlockingCheck = Exclude<ResearchCheck['key'], 'signal'>;

/** One mutually exclusive decision outcome per historical price check. */
export interface ExperimentDecisionSummary {
  checked: number;
  signals: number;
  taken: number;
  noSignal: number;
  blocked: number;
  unexplained: number;
  dominantBlock?: { key: BlockingCheck; count: number };
  reviewTarget?: ExperimentReviewTarget;
}

/** Separate bars without a signal from signals blocked by the first failed execution constraint. */
export function summarizeExperimentDecisions(candidates: readonly ResearchCandidate[]): ExperimentDecisionSummary {
  const order: BlockingCheck[] = ['cooldown', 'balance', 'tradeLimit', 'feeBudget', 'priceImpact', 'goal'];
  const blockedCounts = new Map<BlockingCheck, number>(order.map((key) => [key, 0]));
  const summary: ExperimentDecisionSummary = {
    checked: candidates.length,
    signals: 0,
    taken: 0,
    noSignal: 0,
    blocked: 0,
    unexplained: 0,
  };
  for (const candidate of candidates) {
    const signal = candidate.checks.find((check) => check.key === 'signal');
    if (candidate.selected) {
      // A recorded fill remains authoritative even if an older saved check is missing.
      summary.taken++;
      summary.signals++;
    } else if (signal?.passed === false) {
      summary.noSignal++;
    } else if (signal?.passed === true) {
      summary.signals++;
      const firstFailure = order.find((key) => candidate.checks.find((check) => check.key === key)?.passed === false);
      if (firstFailure) {
        summary.blocked++;
        blockedCounts.set(firstFailure, blockedCounts.get(firstFailure)! + 1);
      } else summary.unexplained++;
    } else summary.unexplained++;
  }
  for (const key of order) {
    const count = blockedCounts.get(key)!;
    if (count > (summary.dominantBlock?.count ?? 0)) summary.dominantBlock = { key, count };
  }
  if (summary.dominantBlock) {
    summary.reviewTarget =
      summary.dominantBlock.key === 'feeBudget'
        ? 'fees'
        : ['cooldown', 'goal'].includes(summary.dominantBlock.key)
          ? 'rules'
          : 'order-size';
  } else if (summary.noSignal) summary.reviewTarget = 'rules';
  return summary;
}

/**
 * Return from holding the original asset allocation, including any separate XOR fee reserve.
 * The engine's benchmark values that unchanged portfolio in input-token units; it is not
 * a hypothetical purchase of the output token. Missing/invalid evidence stays unavailable.
 */
export function holdingBenchmarkReturn(equity: readonly BotEquityPoint[]): string | undefined {
  if (equity.length < 2) return undefined;
  const first = new FPNumber(equity[0].benchmark, 36);
  const last = new FPNumber(equity.at(-1)!.benchmark, 36);
  const zero = new FPNumber('0', 36);
  if (!first.isFinity() || !last.isFinity() || !first.gt(zero) || last.lt(zero)) return undefined;
  return decimalRatio(last.sub(first), first).mul(new FPNumber('100', 36)).toString();
}

/** Select the latest chronological test window without implying it covers the entire study. */
export function latestHeldOutFold(result?: ResearchResult): ResearchFold | undefined {
  if (!result || result.validation.mode === 'none') return undefined;
  return result.validation.folds.reduce<ResearchFold | undefined>(
    (latest, fold) => (!latest || fold.testEnd > latest.testEnd ? fold : latest),
    undefined
  );
}

/** Render historical intervals consistently in UTC, guarding invalid persisted timestamps. */
export function experimentDateRange(start?: number, end?: number): string {
  if (start === undefined || end === undefined || !Number.isFinite(start) || !Number.isFinite(end)) return '—';
  const first = new Date(start);
  const last = new Date(end);
  if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime()) || end < start) return '—';
  return `${first.toISOString().slice(0, 10)} – ${last.toISOString().slice(0, 10)} UTC`;
}
