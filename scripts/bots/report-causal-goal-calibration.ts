/** Offline integrity/coverage report for independently funded, exposed-calibration scenarios. */
import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANDIDATES = ['momentum-breakout', 'rebound-from-discount', 'trend-pullback-accumulation'] as const;
const START = Date.parse('2026-06-30T19:00:00.000Z');
const HOUR = 3_600_000;
const DAY = HOUR * 24;
const UNIT = 10n ** 18n;
const DATA_SHA = '2180d4381ebacd0ea14d22adcb9e81e76924928baf273eb7049adbeac1274653';
const LIMITATIONS = [
  'Already exposed calibration; no untouched validation or live qualification.',
  'Twenty-eight independently funded 24-hour episodes per candidate; arithmetic means are not compounded returns.',
  'Hypothetical fills and modeled arrival times; no transaction, realized profit, annualization, or future-profit claim.',
  'Zero-fill returns can reflect changing values of untouched holdings; excess compares against those same holdings.',
  'Observed drawdown includes valuation after a stop and does not measure intrahour risk.',
  'Unkeyed artifact hashes check internal consistency, not independent authenticity or a replay of raw evidence.',
];
type RecordValue = Record<string, unknown>;
type Fraction = { n: bigint; d: bigint };
type TimingMode = 'strict' | 'gap';
/** Accounting coverage and available execution windows remain distinct from actual candidate actions. */
export interface CausalTimingStatistics {
  closingStates: number;
  timelyClosingStates: number;
  potentialExecutions: number;
  timelyPotentialExecutions: number;
  staleSignalHours: number;
  staleSignalSkips: number;
  pendingLateCancellations: number;
}
export interface ExactStatistic {
  numerator: string;
  denominator: string;
  decimal: string;
}
export interface CausalEpisodeStatistics {
  ordinal: number;
  startedAt: string;
  endedAt: string;
  netXor: ExactStatistic;
  returnPercent: ExactStatistic;
  excessReturnPercent: ExactStatistic;
  controlDrawdownPercent: ExactStatistic;
  retrospectiveDrawdownPercent: ExactStatistic;
  fills: number;
  feesPaidCodec: string;
  outcome: string;
  stoppedAtMs: number;
  quoteRequests: number;
  rejections: Record<string, number>;
  cancellations: Record<string, number>;
  timing?: CausalTimingStatistics;
}
export interface CausalCandidateStatistics {
  candidate: string;
  episodes: CausalEpisodeStatistics[];
  meanReturnPercent: ExactStatistic;
  medianReturnPercent: ExactStatistic;
  meanExcessReturnPercent: ExactStatistic;
  medianExcessReturnPercent: ExactStatistic;
  meanNetXor: ExactStatistic;
  medianNetXor: ExactStatistic;
  positiveExcessEpisodes: number;
  tradedEpisodes: number;
  totalFills: number;
  totalFeesPaidCodec: string;
  totalFeesPaidXor: string;
  maximumControlDrawdownPercent: ExactStatistic;
  maximumRetrospectiveDrawdownPercent: ExactStatistic;
  rejections: Record<string, number>;
  cancellations: Record<string, number>;
  outcomes: Record<string, number>;
  timing?: CausalTimingStatistics;
}
export interface CausalCalibrationReport {
  kind: 'causal-goal-calibration-report-v1';
  status: 'complete' | 'incomplete';
  diagnostics: string[];
  coverage: { expected: 84; present: number; complete: number; incomplete: number; missing: number; invalid: number };
  registrationSha256?: string;
  timingMode?: TimingMode;
  retainedFailure?: RecordValue;
  incompleteEpisodes?: { ordinal: number; candidate: string; diagnostics: unknown[] }[];
  candidates?: CausalCandidateStatistics[];
  limitations: string[];
  observedFill: false;
  transactionSubmitted: false;
  qualificationAuthority: false;
}

function check(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(reason);
}
function record(value: unknown): RecordValue {
  check(value && typeof value === 'object' && !Array.isArray(value), 'invalid-object');
  return value as RecordValue;
}
function rows(value: unknown): unknown[] {
  check(Array.isArray(value) && value.length <= 4096, 'invalid-array');
  return value;
}
function integer(value: unknown): number {
  check(Number.isSafeInteger(value) && Number(value) >= 0, 'invalid-integer');
  return value as number;
}
function unsigned(value: unknown): bigint {
  check(typeof value === 'string' && /^(0|[1-9]\d{0,999})$/.test(value), 'invalid-unsigned-decimal');
  return BigInt(value);
}
function fraction(n: bigint, d = 1n): Fraction {
  check(d > 0n, 'invalid-denominator');
  let a = n < 0n ? -n : n,
    b = d;
  while (b) [a, b] = [b, a % b];
  return { n: n / a, d: d / a };
}
function ratio(value: unknown): Fraction {
  const item = record(value);
  return fraction(unsigned(item.numerator), unsigned(item.denominator));
}
const add = (a: Fraction, b: Fraction) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
const subtract = (a: Fraction, b: Fraction) => fraction(a.n * b.d - b.n * a.d, a.d * b.d);
const compare = (a: Fraction, b: Fraction) => a.n * b.d - b.n * a.d;
const percent = (a: Fraction, base: Fraction) => fraction(a.n * base.d * 100n, a.d * base.n);
function decimal(value: Fraction): string {
  const unit = 10n ** 36n,
    raw = (value.n * unit) / value.d,
    absolute = raw < 0n ? -raw : raw;
  const remainder = (absolute % unit).toString().padStart(36, '0').replace(/0+$/, '');
  return `${raw < 0n ? '-' : ''}${absolute / unit}${remainder ? `.${remainder}` : ''}`;
}
function statistic(value: Fraction): ExactStatistic {
  return { numerator: String(value.n), denominator: String(value.d), decimal: decimal(value) };
}
function exact(value: ExactStatistic): Fraction {
  return fraction(BigInt(value.numerator), BigInt(value.denominator));
}
function mean(values: Fraction[]): Fraction {
  const sum = values.reduce(add, fraction(0n));
  return fraction(sum.n, sum.d * BigInt(values.length));
}
function median(values: Fraction[]): Fraction {
  const sorted = [...values].sort((a, b) => (compare(a, b) < 0n ? -1 : compare(a, b) > 0n ? 1 : 0));
  const index = sorted.length / 2;
  return Number.isInteger(index) ? mean([sorted[index - 1], sorted[index]]) : sorted[Math.floor(index)];
}
function maximum(values: Fraction[]): Fraction {
  return values.reduce((a, b) => (compare(a, b) > 0n ? a : b), fraction(0n));
}
function drawdown(equities: unknown[]): Fraction {
  let peak = fraction(0n),
    worst = fraction(0n);
  for (const item of equities) {
    const value = ratio(record(item).value);
    if (compare(value, peak) > 0n) peak = value;
    check(peak.n > 0n, 'zero-equity-peak');
    worst = maximum([worst, percent(subtract(peak, value), peak)]);
  }
  return worst;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record(value)[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
function count(items: RecordValue[], kind: string): Record<string, number> {
  const counts: Record<string, number> = Object.create(null);
  for (const item of items.filter((item) => item.kind === kind)) {
    check(typeof item.reason === 'string' && item.reason.length <= 256, 'invalid-event-reason');
    counts[item.reason] = (counts[item.reason] ?? 0) + 1;
  }
  return counts;
}
function merge(items: Record<string, number>[]): Record<string, number> {
  const result: Record<string, number> = Object.create(null);
  for (const item of items) for (const [key, value] of Object.entries(item)) result[key] = (result[key] ?? 0) + value;
  return result;
}
async function readArtifact(directory: string, name: string): Promise<unknown | undefined> {
  const path = join(directory, name);
  try {
    const file = await lstat(path);
    check(file.isFile() && !file.isSymbolicLink() && file.size <= 32 * 1024 * 1024, `invalid-file:${name}`);
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (recordErrorCode(error) === 'ENOENT') return undefined;
    throw error;
  }
}
function recordErrorCode(error: unknown): unknown {
  return error && typeof error === 'object' && 'code' in error ? error.code : undefined;
}

/** Check native timing counters and the fixed expiry clock, without claiming to reauthenticate raw RPC receipts. */
function gapTiming(
  result: RecordValue,
  hourly: unknown[],
  controls: RecordValue[],
  events: RecordValue[],
  start: number
): CausalTimingStatistics {
  const timing = record(result.timing),
    timestamps = rows(timing.closingStateTimestampsMs).map(integer),
    ages = rows(timing.closingStateAgesMs).map(integer),
    lags = rows(timing.potentialExecutionLagsMs).map(integer);
  for (let i = 1; i < hourly.length; i++)
    check(Number(record(hourly[i]).observedAtMs) > Number(controls[i - 1].observedAtMs), 'nonadvancing-hour');
  check(
    canonical(timestamps) === canonical(hourly.map((row) => record(row).observedAtMs)) &&
      canonical(ages) === canonical(timestamps.map((at, i) => start + i * HOUR - at)) &&
      canonical(lags) ===
        canonical(controls.slice(1).map((row, i) => Number(row.observedAtMs) - start - (i + 1) * HOUR)),
    'timing-native-coverage'
  );
  const signals = events.filter((row) => row.kind === 'signal');
  check(signals.length === 24, 'timing-signal-coverage');
  let staleSkips = 0;
  for (const [i, signal] of signals.entries()) {
    const at = Number(controls[i].observedAtMs) + 12000;
    check(signal.signalIndex === i && signal.atMs === at, 'timing-signal-clock');
    const stopped = result.outcome !== 'expired' && Number(result.stoppedAtMs) <= Number(controls[i].observedAtMs);
    if (stopped) check(signal.reason === 'goal-complete', 'timing-stopped-signal');
    else if (ages[i] > 12000) {
      check(signal.reason === 'stale-closing-state', 'timing-stale-signal');
      staleSkips++;
    } else check(!['goal-complete', 'stale-closing-state'].includes(String(signal.reason)), 'timing-fresh-signal');
  }
  let previousAt = start - 1;
  const usedSignals = new Set<number>();
  for (const event of events) {
    const at = integer(event.atMs);
    check(
      at >= previousAt && at <= start + DAY && (event.kind === 'terminal' || at < start + DAY),
      'event-clock-order'
    );
    previousAt = at;
    if (!['scenario-fill', 'rejected', 'cancelled'].includes(String(event.kind))) continue;
    const index = integer(event.signalIndex);
    check(index < 24 && !usedSignals.has(index), 'duplicate-or-invalid-order-signal');
    usedSignals.add(index);
    check(
      !['goal-complete', 'stale-closing-state'].includes(String(signals[index].reason)),
      'order-from-skipped-signal'
    );
    if (event.reason === 'deadline') {
      check(event.kind === 'cancelled' && index === 23 && at === signals[index].atMs, 'deadline-cancellation-clock');
      continue;
    }
    const pending = record(event.pending),
      target = start + (index + 1) * HOUR,
      controlAt = Number(controls[index + 1]?.observedAtMs);
    check(
      index < 23 &&
        pending.signalIndex === index &&
        pending.decidedAtMs === signals[index].atMs &&
        pending.targetExecutionAtMs === target,
      'pending-fixed-clock'
    );
    if (event.reason === 'execution-window-expired')
      check(event.kind === 'cancelled' && at === target + 12000 && controlAt > at, 'late-expiry-clock');
    else check(at === controlAt && at <= target + 12000, 'order-outside-execution-window');
  }
  const output: CausalTimingStatistics = {
    closingStates: 25,
    timelyClosingStates: ages.filter((age) => age <= 12000).length,
    potentialExecutions: 23,
    timelyPotentialExecutions: lags.filter((lag) => lag <= 12000).length,
    staleSignalHours: ages.slice(0, 24).filter((age) => age > 12000).length,
    staleSignalSkips: staleSkips,
    pendingLateCancellations: events.filter((event) => event.reason === 'execution-window-expired').length,
  };
  check(
    timing.timelyClosingStates === output.timelyClosingStates &&
      timing.timelyPotentialExecutions === output.timelyPotentialExecutions &&
      timing.staleSignalHourCount === output.staleSignalHours &&
      timing.staleSignalSkipCount === output.staleSignalSkips &&
      timing.pendingLateCancelCount === output.pendingLateCancellations,
    'timing-derived-counts'
  );
  check(
    result.quoteRequests ===
      events.filter((event) => ['scenario-fill', 'rejected'].includes(String(event.kind))).length,
    'quote-event-count'
  );
  return output;
}

/** Recompute statistics from exact values and require each expected episode's complete clock coverage. */
function episode(value: unknown, ordinal: number, candidate: string, mode: TimingMode): CausalEpisodeStatistics {
  const result = record(value),
    summary = record(result.summary),
    bot = record(result.bot),
    portfolio = record(bot.portfolio);
  const hourly = rows(result.hourlyEquity),
    control = rows(result.controlEquity),
    events = rows(result.events).map(record);
  const start = START + ordinal * DAY,
    end = start + DAY;
  check(
    result.protocol === (mode === 'gap' ? 'causal-goal-calibration-gap-v1' : 'causal-goal-calibration-v1') &&
      result.candidate === candidate &&
      result.status === 'complete',
    'result-identity'
  );
  check(
    result.observedFill === false && result.transactionSubmitted === false && result.qualificationAuthority === false,
    'result-authority'
  );
  check(rows(result.diagnostics).length === 0 && result.signalsConsumed === 24, 'result-diagnostics-or-signals');
  check(hourly.length === 25, 'hourly-coverage');
  for (const [index, item] of hourly.entries()) {
    const row = record(item),
      boundary = start + index * HOUR,
      observed = integer(row.observedAtMs);
    check(
      row.accountingAtMs === boundary &&
        observed < boundary &&
        (mode === 'gap' ? observed > boundary - HOUR : boundary - observed <= 12000),
      'hourly-date-coverage'
    );
    ratio(row.value);
    ratio(row.idleValue);
  }
  const fills = integer(portfolio.trades),
    fees = unsigned(portfolio.feesPaidCodec);
  check(
    fills === summary.fills && fills === events.filter((item) => item.kind === 'scenario-fill').length,
    'fill-count'
  );
  check(fees <= UNIT && (fills > 0 || fees === 0n), 'fee-reserve-or-zero-fill-fees');
  check(control.length === 25 + fills && record(control[0]).accountingAtMs === start, 'control-coverage');
  const initial = ratio(summary.initialValue),
    final = ratio(summary.finalValue),
    idle = ratio(summary.heldFinalValue);
  check(initial.n > 0n, 'zero-initial-equity');
  let cursor = 1,
    seenFills = 0,
    peak = initial;
  const expectedStop = { outcome: 'active', atMs: end };
  const preFillControls: RecordValue[] = [];
  const observe = (row: RecordValue) => {
    const current = ratio(row.value),
      idleAt = ratio(row.idleValue);
    if (expectedStop.outcome !== 'active') return;
    if (compare(current, peak) > 0n) peak = current;
    if (current.n * peak.d * 10n <= peak.n * current.d * 9n) expectedStop.outcome = 'loss';
    else if (
      seenFills > 0 &&
      current.n * initial.d * 100n >= initial.n * current.d * 105n &&
      compare(current, idleAt) > 0n
    )
      expectedStop.outcome = 'target';
    if (expectedStop.outcome !== 'active') expectedStop.atMs = integer(row.observedAtMs);
  };
  for (let index = 0; index < 24; index++) {
    const boundary = start + index * HOUR;
    const row = record(control[cursor++]),
      at = integer(row.observedAtMs);
    check(
      row.accountingAtMs === at &&
        at >= boundary &&
        (mode === 'gap' ? at + 12000 < boundary + HOUR : at <= boundary + 12000),
      'control-date-coverage'
    );
    preFillControls.push(row);
    const filled = events.filter((item) => item.kind === 'scenario-fill' && item.atMs === at).length;
    check(filled <= 1, 'duplicate-fill');
    observe(row);
    if (filled) {
      check(
        index > 0 && expectedStop.outcome === 'active' && at <= boundary + 12000,
        'fill-at-opening-late-or-after-stop'
      );
      const after = record(control[cursor++]);
      check(after.accountingAtMs === at && after.observedAtMs === at, 'post-fill-control');
      if (mode === 'gap')
        check(
          compare(ratio(after.idleValue), ratio(row.idleValue)) === 0n && after.blockHash === row.blockHash,
          'post-fill-shared-market'
        );
      seenFills++;
      observe(after);
      check(expectedStop.outcome !== 'loss', 'fill-crossed-loss-admission');
    }
  }
  check(cursor === control.length && seenFills === fills, 'extra-control-or-unmatched-fill');
  if (expectedStop.outcome === 'active') expectedStop.outcome = 'expired';
  check(result.outcome === expectedStop.outcome && result.stoppedAtMs === expectedStop.atMs, 'control-stop-mismatch');
  check(fills > 0 || compare(final, idle) === 0n, 'zero-fill-excess');
  check(
    initial.n > 0n &&
      compare(initial, ratio(record(hourly[0]).value)) === 0n &&
      compare(initial, ratio(record(control[0]).value)) === 0n &&
      compare(final, ratio(record(hourly[24]).value)) === 0n &&
      compare(idle, ratio(record(hourly[24]).idleValue)) === 0n,
    'equity-summary'
  );
  const net = subtract(final, initial),
    returns = percent(net, initial),
    excess = percent(subtract(final, idle), initial);
  const netXor = fraction(net.n, net.d * UNIT),
    controlDd = drawdown(control),
    retrospectiveDd = drawdown(hourly);
  check(
    summary.netXor === decimal(netXor) &&
      summary.returnPercent === decimal(returns) &&
      summary.excessReturnPercent === decimal(excess) &&
      summary.controlDrawdownPercent === decimal(controlDd) &&
      summary.retrospectiveDrawdownPercent === decimal(retrospectiveDd),
    'derived-summary'
  );
  check(['loss', 'target', 'expired'].includes(String(result.outcome)), 'outcome');
  const stopped = integer(result.stoppedAtMs);
  check(stopped >= start && stopped <= end && (result.outcome !== 'expired' || stopped === end), 'stop-date');
  const terminal = events.filter((item) => item.kind === 'terminal');
  check(
    terminal.length === 1 && terminal[0].atMs === end && terminal[0].reason === result.outcome,
    'terminal-coverage'
  );
  const timing = mode === 'gap' ? gapTiming(result, hourly, preFillControls, events, start) : undefined;
  if (mode === 'gap')
    check(
      record(control[0]).observedAtMs === record(hourly[0]).observedAtMs &&
        record(control[0]).blockHash === record(hourly[0]).blockHash &&
        compare(ratio(record(control[0]).idleValue), initial) === 0n &&
        compare(ratio(record(hourly[0]).idleValue), initial) === 0n,
      'opening-shared-market'
    );
  return {
    ordinal,
    startedAt: new Date(start).toISOString(),
    endedAt: new Date(end).toISOString(),
    netXor: statistic(netXor),
    returnPercent: statistic(returns),
    excessReturnPercent: statistic(excess),
    controlDrawdownPercent: statistic(controlDd),
    retrospectiveDrawdownPercent: statistic(retrospectiveDd),
    fills,
    feesPaidCodec: String(fees),
    outcome: String(result.outcome),
    stoppedAtMs: stopped,
    quoteRequests: integer(result.quoteRequests),
    rejections: count(events, 'rejected'),
    cancellations: count(events, 'cancelled'),
    ...(timing ? { timing } : {}),
  };
}
function aggregate(candidate: string, episodes: CausalEpisodeStatistics[]): CausalCandidateStatistics {
  const returns = episodes.map((item) => exact(item.returnPercent)),
    excess = episodes.map((item) => exact(item.excessReturnPercent));
  const net = episodes.map((item) => exact(item.netXor)),
    fees = episodes.reduce((sum, item) => sum + BigInt(item.feesPaidCodec), 0n);
  return {
    candidate,
    episodes,
    meanReturnPercent: statistic(mean(returns)),
    medianReturnPercent: statistic(median(returns)),
    meanExcessReturnPercent: statistic(mean(excess)),
    medianExcessReturnPercent: statistic(median(excess)),
    meanNetXor: statistic(mean(net)),
    medianNetXor: statistic(median(net)),
    positiveExcessEpisodes: excess.filter((value) => value.n > 0n).length,
    tradedEpisodes: episodes.filter((item) => item.fills > 0).length,
    totalFills: episodes.reduce((sum, item) => sum + item.fills, 0),
    totalFeesPaidCodec: String(fees),
    totalFeesPaidXor: decimal(fraction(fees, UNIT)),
    maximumControlDrawdownPercent: statistic(maximum(episodes.map((item) => exact(item.controlDrawdownPercent)))),
    maximumRetrospectiveDrawdownPercent: statistic(
      maximum(episodes.map((item) => exact(item.retrospectiveDrawdownPercent)))
    ),
    rejections: merge(episodes.map((item) => item.rejections)),
    cancellations: merge(episodes.map((item) => item.cancellations)),
    outcomes: merge(episodes.map((item) => ({ [item.outcome]: 1 }))),
    ...(episodes[0].timing
      ? {
          timing: episodes.reduce(
            (sum, item) => {
              for (const key of Object.keys(sum) as (keyof CausalTimingStatistics)[]) sum[key] += item.timing![key];
              return sum;
            },
            {
              closingStates: 0,
              timelyClosingStates: 0,
              potentialExecutions: 0,
              timelyPotentialExecutions: 0,
              staleSignalHours: 0,
              staleSignalSkips: 0,
              pendingLateCancellations: 0,
            }
          ),
        }
      : {}),
  };
}

/** Read retained local artifacts only; any missing, inconsistent, or failed input suppresses all aggregates. */
export async function reportCausalGoalCalibration(directory: string): Promise<CausalCalibrationReport> {
  const report: CausalCalibrationReport = {
    kind: 'causal-goal-calibration-report-v1',
    status: 'incomplete',
    diagnostics: [],
    coverage: { expected: 84, present: 0, complete: 0, incomplete: 0, missing: 0, invalid: 0 },
    limitations: [...LIMITATIONS],
    observedFill: false,
    transactionSubmitted: false,
    qualificationAuthority: false,
  };
  try {
    const registration = record(await readArtifact(directory, 'registration.json')),
      body = record(registration.body);
    check(registration.sha256 === digest(body), 'registration-digest');
    report.registrationSha256 = String(registration.sha256);
    const scope = record(body.scope),
      calibration = record(body.calibration),
      access = record(body.access);
    check(
      ['causal-goal-calibration-registration-v1', 'causal-gap-calibration-registration-v1'].includes(String(body.kind)),
      'registration-kind'
    );
    const mode: TimingMode = body.kind === 'causal-gap-calibration-registration-v1' ? 'gap' : 'strict';
    report.timingMode = mode;
    if (mode === 'gap')
      report.limitations.push(
        'Gap-aware accounting includes stale signal skips and expired execution windows; complete coverage is not uninterrupted tradability.'
      );
    check(
      scope.startAtMs === START &&
        scope.endAtMs === START + 28 * DAY &&
        scope.episodes === 28 &&
        scope.hours === 24 &&
        scope.warmupStartAtMs === START - 13 * HOUR &&
        scope.warmupEndAtMs === START - HOUR &&
        calibration.sha256 === DATA_SHA &&
        canonical(Object.keys(record(body.candidates)).sort()) === canonical([...CANDIDATES].sort()),
      'registration-scope'
    );
    check(
      access.calibrationOnly === true && access.untouchedValidation === false && access.financialActions === false,
      'registration-authority'
    );
    const started = record(await readArtifact(directory, 'acquisition-started.json'));
    check(started.registrationSha256 === registration.sha256 && started.restartAllowed === false, 'start-registration');
    const failure = await readArtifact(directory, 'failed.json');
    if (failure !== undefined) {
      report.retainedFailure = record(failure);
      report.diagnostics.push('terminal-failure-retained');
      check(report.retainedFailure.registrationSha256 === registration.sha256, 'failure-registration');
    }
    const matrix: unknown[][] = [],
      candidateRows = CANDIDATES.map(() => [] as CausalEpisodeStatistics[]);
    for (let ordinal = 0; ordinal < 28; ordinal++) {
      const row: unknown[] = [];
      for (const [index, candidate] of CANDIDATES.entries()) {
        try {
          const result = await readArtifact(directory, `episodes/${ordinal}/${candidate}.json`);
          if (result === undefined) {
            report.coverage.missing++;
            continue;
          }
          report.coverage.present++;
          row.push(result);
          if (record(result).status === 'incomplete') {
            report.coverage.incomplete++;
            (report.incompleteEpisodes ??= []).push({
              ordinal,
              candidate,
              diagnostics: rows(record(result).diagnostics),
            });
            continue;
          }
          candidateRows[index].push(episode(result, ordinal, candidate, mode));
          report.coverage.complete++;
        } catch {
          report.coverage.invalid++;
          report.diagnostics.push(`invalid-episode:${ordinal}:${candidate}`);
        }
      }
      matrix.push(row);
    }
    if (report.coverage.complete !== 84) report.diagnostics.push('incomplete-episode-coverage');
    const completed = await readArtifact(directory, 'complete.json');
    if (completed === undefined) report.diagnostics.push('missing-complete-marker');
    if (report.diagnostics.length) return report;
    const complete = record(completed),
      first = record(await readArtifact(directory, 'first-episode-complete.json'));
    check(
      complete.registrationSha256 === registration.sha256 &&
        complete.episodes === 28 &&
        canonical(complete.candidates) === canonical(CANDIDATES) &&
        complete.resultsSha256 === digest(matrix),
      'complete-result-digest-or-coverage'
    );
    check(
      complete.observedFill === false &&
        complete.transactionSubmitted === false &&
        complete.qualificationAuthority === false,
      'complete-authority'
    );
    check(
      first.ordinal === 0 &&
        canonical(first.candidates) === canonical(CANDIDATES) &&
        first.resultsSha256 === digest(matrix[0]),
      'first-episode-digest'
    );
    report.candidates = CANDIDATES.map((candidate, index) => aggregate(candidate, candidateRows[index]));
    if (mode === 'gap')
      for (let ordinal = 0; ordinal < 28; ordinal++) {
        const common = candidateRows.map((candidate, index) => {
          const {
            staleSignalSkips: _skips,
            pendingLateCancellations: _cancels,
            ...coverage
          } = candidate[ordinal].timing!;
          const result = record(matrix[ordinal][index]),
            timing = record(result.timing);
          const sharedRow = (value: unknown) => {
            const row = record(value);
            return {
              observedAtMs: row.observedAtMs,
              blockHash: row.blockHash ?? null,
              idleValue: statistic(ratio(row.idleValue)),
            };
          };
          const controls = rows(result.controlEquity).map(sharedRow);
          return {
            coverage,
            closingStateTimestampsMs: timing.closingStateTimestampsMs,
            closingStateAgesMs: timing.closingStateAgesMs,
            potentialExecutionLagsMs: timing.potentialExecutionLagsMs,
            initialValue: statistic(ratio(record(result.summary).initialValue)),
            hourly: rows(result.hourlyEquity).map(sharedRow),
            controls: controls.filter((row, i) => i === 0 || row.observedAtMs !== controls[i - 1].observedAtMs),
          };
        });
        check(
          common.every((coverage) => canonical(coverage) === canonical(common[0])),
          'candidate-shared-evidence-mismatch'
        );
      }
    report.status = 'complete';
  } catch (error) {
    delete report.candidates;
    report.diagnostics.push(error instanceof Error ? error.message : 'invalid-input');
  }
  return report;
}

/** Compact human-readable output; complete means artifact coverage, never a strategy pass. */
export function formatCausalCalibrationReport(report: CausalCalibrationReport): string {
  const lines = [
    '# Causal calibration report',
    '',
    `Artifact status: **${report.status}**. Valid complete results: ${report.coverage.complete}/84.`,
    '',
  ];
  if (report.status === 'complete' && report.candidates) {
    lines.push(
      'All episodes are independently funded; percentages are arithmetic summaries.',
      '',
      '| Candidate | Mean / median return % | Mean / median excess % | Positive excess / traded episodes | Fills | Fees XOR | Max control / hourly drawdown % |',
      '| --- | --- | --- | --- | --- | --- | --- |'
    );
    for (const item of report.candidates)
      lines.push(
        `| ${item.candidate} | ${item.meanReturnPercent.decimal} / ${item.medianReturnPercent.decimal} | ${item.meanExcessReturnPercent.decimal} / ${item.medianExcessReturnPercent.decimal} | ${item.positiveExcessEpisodes} / ${item.tradedEpisodes} | ${item.totalFills} | ${item.totalFeesPaidXor} | ${item.maximumControlDrawdownPercent.decimal} / ${item.maximumRetrospectiveDrawdownPercent.decimal} |`
      );
    for (const item of report.candidates)
      lines.push(
        '',
        `- ${item.candidate}: outcomes ${JSON.stringify(item.outcomes)}; rejections ${JSON.stringify(item.rejections)}; cancellations ${JSON.stringify(item.cancellations)}.`
      );
    for (const item of report.candidates)
      if (item.timing)
        lines.push(
          '',
          `- ${item.candidate}: ${item.timing.timelyClosingStates}/${item.timing.closingStates} timely closing states; ${item.timing.timelyPotentialExecutions}/${item.timing.potentialExecutions} timely potential execution windows; ${item.timing.staleSignalHours} stale funded hours, ${item.timing.staleSignalSkips} active stale-signal skips, ${item.timing.pendingLateCancellations} pending orders expired.`
        );
  } else
    lines.push(
      'No aggregate candidate statistics are reported.',
      '',
      ...report.diagnostics.map((reason) => `- ${reason}`)
    );
  lines.push('', ...report.limitations.map((reason) => `- ${reason}`), '');
  return lines.join('\n');
}

async function main(): Promise<void> {
  check(
    process.argv.length >= 3 &&
      process.argv.length <= 4 &&
      (process.argv[3] === undefined || process.argv[3] === '--markdown'),
    'Usage: tsx scripts/bots/report-causal-goal-calibration.ts RUN_DIRECTORY [--markdown]'
  );
  const report = await reportCausalGoalCalibration(resolve(process.argv[2]));
  process.stdout.write(
    process.argv[3] === '--markdown' ? formatCausalCalibrationReport(report) : `${JSON.stringify(report, null, 2)}\n`
  );
  if (report.status !== 'complete') process.exitCode = 2;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'report-failed'}\n`);
    process.exitCode = 2;
  });
