import { FPNumber } from '@/lib/substrate/math';
import type { ResearchFold, ResearchResult } from './research';
import type { BacktestResult } from './types';

/** A descriptive sample screen, not a statistical confidence level or a trading recommendation. */
export const VALIDATION_INSIGHT_THRESHOLDS = Object.freeze({ minimumFolds: 3, minimumTestTradesPerFold: 5 });

export type ValidationVerdict = 'not-validated' | 'insufficient-trades' | 'mixed' | 'consistent';
export type ValidationInsightNote =
  | 'few-folds'
  | 'no-cost-stress'
  | 'tuning-risk'
  | 'unequal-periods'
  | 'incomplete-coverage'
  | 'invalid-fold-data'
  | 'missing-benchmark';

type FoldMetrics = Pick<BacktestResult, 'trades' | 'returnPercent' | 'drawdownPercent' | 'coverage'>;

/** Narrow structural input also accepts older persisted folds without the newer benchmark evidence. */
export interface ValidationFoldInput extends Pick<
  ResearchFold,
  'index' | 'trainStart' | 'trainEnd' | 'testStart' | 'testEnd'
> {
  train: FoldMetrics;
  test: FoldMetrics;
  trainEvidence?: { returnPerDayPercent: string | null };
  testEvidence?: {
    returnPerDayPercent: string | null;
    excessReturnPercent: string | null;
    benchmark: { returnPercent: string } | null;
  };
}

export interface ValidationFoldInsight {
  index: number;
  valid: boolean;
  eligible: boolean;
  testTrades: number;
  trainDurationMs: number | null;
  testDurationMs: number | null;
  trainReturnPercent: string | null;
  testReturnPercent: string | null;
  testDrawdownPercent: string | null;
  /** Raw training minus test percentage points; the periods can have different lengths. */
  returnGapPercentagePoints: string | null;
  durationsDiffer: boolean;
  trainReturnPerDayPercent: string | null;
  testReturnPerDayPercent: string | null;
  benchmarkReturnPercent: string | null;
  excessReturnPercent: string | null;
}

/** Each fold starts with fresh capital: these summaries never compound or pool fold returns. */
export interface ValidationInsights {
  verdict: ValidationVerdict;
  thresholds: typeof VALIDATION_INSIGHT_THRESHOLDS;
  foldCount: number;
  validFoldCount: number;
  eligibleFoldCount: number;
  insufficientTradeFoldCount: number;
  emptyFoldCount: number;
  invalidFoldCount: number;
  positiveFoldCount: number;
  negativeFoldCount: number;
  flatFoldCount: number;
  testTradeCount: number;
  eligibleTestTradeCount: number;
  medianReturnPercent: string | null;
  minReturnPercent: string | null;
  maxReturnPercent: string | null;
  maxDrawdownPercent: string | null;
  benchmarkedFoldCount: number;
  benchmarkBeatCount: number;
  medianExcessReturnPercent: string | null;
  folds: ValidationFoldInsight[];
  notes: ValidationInsightNote[];
}

// One extra decimal preserves the midpoint of two returns reported to 36 decimal places.
const PRECISION = 37;
const ZERO = new FPNumber('0', PRECISION);
const HALF = new FPNumber('0.5', PRECISION);
const HUNDRED = new FPNumber('100', PRECISION);

/** Accept bounded exact decimal strings without interpreting scientific notation through a JS number. */
function metric(value: unknown): FPNumber | null {
  if (typeof value !== 'string' || value.length > 150 || !/^-?\d+(?:\.\d{1,36})?$/.test(value)) return null;
  const parsed = new FPNumber(value, PRECISION);
  return parsed.isFinity() ? parsed : null;
}

/** Sort exact values without coercing returns to floating point; even medians are their exact midpoint. */
function median(values: readonly FPNumber[]): string | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => (left.lt(right) ? -1 : left.gt(right) ? 1 : 0));
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle].toString() : sorted[middle - 1].add(sorted[middle]).mul(HALF).toString();
}

/** The engine emits at most one execution per candle in its 10,000-observation history bound. */
function tradeCount(value: number): number | null {
  return Number.isSafeInteger(value) && value >= 0 && value <= 10_000 ? value : null;
}

/**
 * Describe observed held-out windows with exact arithmetic. "Consistent" requires
 * at least three chronological folds, five executions in every fold, complete
 * reported coverage, and strictly positive net returns in every fold. This is
 * an explicit presentation screen, not evidence of future profitability.
 * Returns and drawdowns cover all valid folds, including inactive zero-trade
 * windows; eligibility and execution counts expose that distinction separately.
 */
export function summarizeValidation(
  validation: Pick<ResearchResult['validation'], 'mode' | 'tuned'> & { folds: readonly ValidationFoldInput[] }
): ValidationInsights {
  const input = validation.mode === 'none' ? [] : validation.folds;
  const notes = new Set<ValidationInsightNote>();
  const testReturns: FPNumber[] = [];
  const drawdowns: FPNumber[] = [];
  const excessReturns: FPNumber[] = [];
  let previousTestEnd = -Infinity;
  const folds = input.map((fold): ValidationFoldInsight => {
    const trainReturn = metric(fold.train.returnPercent);
    const testReturn = metric(fold.test.returnPercent);
    const drawdown = metric(fold.test.drawdownPercent);
    const trades = tradeCount(fold.test.trades);
    const dates = [fold.trainStart, fold.trainEnd, fold.testStart, fold.testEnd];
    const chronological =
      dates.every(Number.isSafeInteger) &&
      fold.trainStart < fold.trainEnd &&
      fold.trainEnd < fold.testStart &&
      fold.testStart < fold.testEnd &&
      fold.testStart > previousTestEnd;
    const valid = Boolean(
      chronological &&
      trainReturn &&
      testReturn &&
      drawdown &&
      drawdown.gte(ZERO) &&
      drawdown.lte(HUNDRED) &&
      trades !== null
    );
    if (chronological) previousTestEnd = fold.testEnd;
    const completeCoverage = fold.test.coverage === 1;
    if (!completeCoverage) notes.add('incomplete-coverage');
    if (!valid || !trainReturn) notes.add('invalid-fold-data');
    const trainDurationMs = chronological ? fold.trainEnd - fold.trainStart : null;
    const testDurationMs = chronological ? fold.testEnd - fold.testStart : null;
    const durationsDiffer = chronological && trainDurationMs !== testDurationMs;
    if (durationsDiffer) notes.add('unequal-periods');
    const benchmarkReturn = metric(fold.testEvidence?.benchmark?.returnPercent);
    const excessReturn = benchmarkReturn ? metric(fold.testEvidence?.excessReturnPercent) : null;
    if (valid) {
      testReturns.push(testReturn!);
      drawdowns.push(drawdown!);
      if (excessReturn) excessReturns.push(excessReturn);
      else notes.add('missing-benchmark');
    }
    return {
      index: fold.index,
      valid,
      eligible: valid && completeCoverage && trades! >= VALIDATION_INSIGHT_THRESHOLDS.minimumTestTradesPerFold,
      testTrades: trades ?? 0,
      trainDurationMs,
      testDurationMs,
      trainReturnPercent: trainReturn?.toString() ?? null,
      testReturnPercent: testReturn?.toString() ?? null,
      testDrawdownPercent: drawdown?.toString() ?? null,
      returnGapPercentagePoints:
        chronological && trainReturn && testReturn ? trainReturn.sub(testReturn).toString() : null,
      durationsDiffer,
      trainReturnPerDayPercent: metric(fold.trainEvidence?.returnPerDayPercent)?.toString() ?? null,
      testReturnPerDayPercent: metric(fold.testEvidence?.returnPerDayPercent)?.toString() ?? null,
      benchmarkReturnPercent: benchmarkReturn?.toString() ?? null,
      excessReturnPercent: excessReturn?.toString() ?? null,
    };
  });
  const validFolds = folds.filter((fold) => fold.valid);
  const eligibleFolds = folds.filter((fold) => fold.eligible);
  const positiveFoldCount = testReturns.filter((value) => value.gt(ZERO)).length;
  const negativeFoldCount = testReturns.filter((value) => value.lt(ZERO)).length;
  const insufficientTradeFoldCount = validFolds.filter(
    (fold) => fold.testTrades < VALIDATION_INSIGHT_THRESHOLDS.minimumTestTradesPerFold
  ).length;
  const verdict: ValidationVerdict = !validFolds.length
    ? 'not-validated'
    : insufficientTradeFoldCount
      ? 'insufficient-trades'
      : folds.length >= VALIDATION_INSIGHT_THRESHOLDS.minimumFolds &&
          eligibleFolds.length === folds.length &&
          positiveFoldCount === folds.length
        ? 'consistent'
        : 'mixed';
  if (input.length) {
    if (validFolds.length < VALIDATION_INSIGHT_THRESHOLDS.minimumFolds) notes.add('few-folds');
    notes.add('no-cost-stress');
    if (validation.tuned) notes.add('tuning-risk');
  }
  return {
    verdict,
    thresholds: VALIDATION_INSIGHT_THRESHOLDS,
    foldCount: folds.length,
    validFoldCount: validFolds.length,
    eligibleFoldCount: eligibleFolds.length,
    insufficientTradeFoldCount,
    emptyFoldCount: validFolds.filter((fold) => fold.testTrades === 0).length,
    invalidFoldCount: folds.length - validFolds.length,
    positiveFoldCount,
    negativeFoldCount,
    flatFoldCount: validFolds.length - positiveFoldCount - negativeFoldCount,
    testTradeCount: folds.reduce((sum, fold) => sum + fold.testTrades, 0),
    eligibleTestTradeCount: eligibleFolds.reduce((sum, fold) => sum + fold.testTrades, 0),
    medianReturnPercent: median(testReturns),
    minReturnPercent: testReturns.length ? testReturns.reduce((lowest, value) => lowest.min(value)).toString() : null,
    maxReturnPercent: testReturns.length ? testReturns.reduce((highest, value) => highest.max(value)).toString() : null,
    maxDrawdownPercent: drawdowns.length ? drawdowns.reduce((highest, value) => highest.max(value)).toString() : null,
    benchmarkedFoldCount: excessReturns.length,
    benchmarkBeatCount: excessReturns.filter((value) => value.gt(ZERO)).length,
    medianExcessReturnPercent: median(excessReturns),
    folds,
    notes: [...notes],
  };
}
