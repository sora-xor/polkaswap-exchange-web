/**
 * Descriptive statistics for historical candidate attribution, never a forecast.
 * Candidate outcomes share a final mark and can overlap; their counts are not
 * independent trials and their distribution is not a realizable portfolio.
 */
import { FPNumber } from '@/lib/substrate/math';

/** Minimal evidence accepted from ResearchCandidate or DistributionTrade. */
export interface ResultDistributionCandidate {
  pnl: string;
  selected: boolean;
}

/** Historical counts and interpolated empirical quantiles in the source P&L denomination. */
export interface ResultDistributionGroup {
  count: number;
  profitCount: number;
  lossCount: number;
  flatCount: number;
  /** Descriptive positive-outcome share, including flat observations in the denominator. */
  winRatePercent: string | null;
  min: string | null;
  p10: string | null;
  q1: string | null;
  median: string | null;
  q3: string | null;
  p90: string | null;
  max: string | null;
}

/** A signed interval with explicit ownership of exact boundary values. */
export interface ResultDistributionBin {
  index: number;
  sign: 'loss' | 'zero' | 'profit';
  lower: string;
  upper: string;
  lowerInclusive: boolean;
  upperInclusive: boolean;
  count: number;
  selectedCount: number;
  excludedCount: number;
  /** Original source indices allow range inspection without rescanning or reparsing candidates. */
  firstIndex: number | null;
  firstSelectedIndex: number | null;
  firstExcludedIndex: number | null;
}

/** Shared bins allow selected and excluded distributions to be compared on identical axes. */
export interface ResultDistributionInsights {
  count: number;
  omittedCount: number;
  extent: string | null;
  bins: ResultDistributionBin[];
  all: ResultDistributionGroup;
  selected: ResultDistributionGroup;
  excluded: ResultDistributionGroup;
  attribution: 'common-endpoint-mark-to-market';
  independentObservations: false;
  predictive: false;
}

interface ParsedCandidate {
  index: number;
  value: FPNumber;
  selected: boolean;
}

interface NumericBin {
  bin: ResultDistributionBin;
  lower: FPNumber;
  upper: FPNumber;
}

const EIGHTHS = ['0', '0.125', '0.25', '0.375', '0.5', '0.625', '0.75', '0.875', '1'];

/** Reject coercion, exponent notation and oversized input before the strict decimal parser. */
function validDecimal(value: string): boolean {
  return typeof value === 'string' && value.length <= 256 && /^-?(0|[1-9]\d*)(\.\d+)?$/.test(value);
}

/** Type-7 empirical quantile; only rank arithmetic uses JavaScript numbers. */
function quantile(sorted: readonly FPNumber[], numerator: number, denominator: number): string | null {
  if (!sorted.length) return null;
  const rankNumerator = (sorted.length - 1) * numerator;
  const lower = Math.floor(rankNumerator / denominator);
  const remainder = rankNumerator % denominator;
  const start = sorted[lower];
  if (!remainder) return start.toString();
  // All requested ranks use halves, quarters or tenths, whose decimal weights are exact.
  const weight = (remainder / denominator).toString();
  return start.add(sorted[lower + 1].sub(start).mul(weight)).toString();
}

/** Summarize a cohort without adding overlapping outcomes into a misleading portfolio total. */
function summarizeGroup(candidates: readonly ParsedCandidate[]): ResultDistributionGroup {
  const sorted = candidates.map(({ value }) => value).sort((a, b) => (a.lt(b) ? -1 : a.gt(b) ? 1 : 0));
  const zero = new FPNumber('0', sorted[0]?.precision ?? 40);
  const profitCount = sorted.filter((value) => value.gt(zero)).length;
  const lossCount = sorted.filter((value) => value.lt(zero)).length;
  return {
    count: sorted.length,
    profitCount,
    lossCount,
    flatCount: sorted.length - profitCount - lossCount,
    winRatePercent: sorted.length
      ? new FPNumber(profitCount.toString(), 40).mul('100').div(sorted.length.toString()).dp(2, 4).toString()
      : null,
    min: sorted[0]?.toString() ?? null,
    p10: quantile(sorted, 1, 10),
    q1: quantile(sorted, 1, 4),
    median: quantile(sorted, 1, 2),
    q3: quantile(sorted, 3, 4),
    p90: quantile(sorted, 9, 10),
    max: sorted[sorted.length - 1]?.toString() ?? null,
  };
}

/** Create the zero point and eight exact-width intervals on each nonzero side. */
function createBins(extent: FPNumber): NumericBin[] {
  const zero = new FPNumber('0', extent.precision);
  const numeric: NumericBin[] = [];
  const append = (sign: ResultDistributionBin['sign'], lower: FPNumber, upper: FPNumber): void => {
    numeric.push({
      lower,
      upper,
      bin: {
        index: numeric.length,
        sign,
        lower: lower.toString(),
        upper: upper.toString(),
        lowerInclusive: sign !== 'profit',
        upperInclusive: sign !== 'loss',
        count: 0,
        selectedCount: 0,
        excludedCount: 0,
        firstIndex: null,
        firstSelectedIndex: null,
        firstExcludedIndex: null,
      },
    });
  };
  if (!extent.isZero()) {
    for (let index = 0; index < 8; index += 1) {
      append('loss', zero.sub(extent.mul(EIGHTHS[8 - index])), zero.sub(extent.mul(EIGHTHS[7 - index])));
    }
  }
  append('zero', zero, zero);
  if (!extent.isZero()) {
    for (let index = 0; index < 8; index += 1) {
      append('profit', extent.mul(EIGHTHS[index]), extent.mul(EIGHTHS[index + 1]));
    }
  }
  return numeric;
}

/**
 * Describe historical candidate P&L on a shared signed axis with a dedicated zero bin.
 * All financial arithmetic stays in FPNumber. Eighth-width edges and Type-7 quantiles
 * remain exact finite decimal strings; percentage shares are rounded to two places.
 * Invalid/nonfinite values and noncanonical decimal strings are omitted explicitly.
 * Empty groups have null statistics. Small groups keep their empirical values without
 * inventing confidence intervals or interpreting observed shares as future probabilities.
 */
export function summarizeResultDistribution(
  candidates: readonly ResultDistributionCandidate[]
): ResultDistributionInsights {
  const valid = candidates
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => validDecimal(candidate.pnl));
  // Guard digits preserve eighth-bin edges and interpolated ranks even at the smallest source unit.
  const precision = valid.reduce(
    (maximum, { candidate }) => Math.max(maximum, (candidate.pnl.split('.')[1]?.length ?? 0) + 4),
    40
  );
  const parsed = valid
    .map(({ candidate, index }) => ({
      index,
      value: new FPNumber(candidate.pnl, precision),
      selected: candidate.selected,
    }))
    .filter(({ value }) => value.isFinity());
  const zero = new FPNumber('0', precision);
  const extent = parsed.reduce((largest, { value }) => {
    const magnitude = value.lt(zero) ? zero.sub(value) : value;
    return magnitude.gt(largest) ? magnitude : largest;
  }, zero);
  const numericBins = parsed.length ? createBins(extent) : [];
  for (const candidate of parsed) {
    const match = numericBins.find(
      ({ bin, lower, upper }) =>
        (bin.lowerInclusive ? candidate.value.gte(lower) : candidate.value.gt(lower)) &&
        (bin.upperInclusive ? candidate.value.lte(upper) : candidate.value.lt(upper))
    );
    if (!match) continue; // All finite parsed values are bounded by the shared extent.
    match.bin.count += 1;
    match.bin.firstIndex ??= candidate.index;
    if (candidate.selected) {
      match.bin.selectedCount += 1;
      match.bin.firstSelectedIndex ??= candidate.index;
    } else {
      match.bin.excludedCount += 1;
      match.bin.firstExcludedIndex ??= candidate.index;
    }
  }
  return {
    count: parsed.length,
    omittedCount: candidates.length - parsed.length,
    extent: parsed.length ? extent.toString() : null,
    bins: numericBins.map(({ bin }) => bin),
    all: summarizeGroup(parsed),
    selected: summarizeGroup(parsed.filter((candidate) => candidate.selected)),
    excluded: summarizeGroup(parsed.filter((candidate) => !candidate.selected)),
    attribution: 'common-endpoint-mark-to-market',
    independentObservations: false,
    predictive: false,
  };
}
