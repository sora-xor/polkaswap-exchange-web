/**
 * Offline exposed-calibration scenarios, never qualification or trading authority.
 * Callers authenticate/archive raw receipts. This adapter joins their projections,
 * keeps delayed indicators separate from exact-state risk checks, and never fetches.
 */
import { createHash } from 'node:crypto';
import {
  applyPaperFill,
  copyStrategyConfig,
  evaluateStrategy,
  parseBotPrice,
  type PaperFill,
} from '../../src/features/bot-trading/engine';
import { toCodec } from '../../src/features/bot-trading/amounts';
import type { BotCandle, BotDefinition, StrategyConfig } from '../../src/features/bot-trading/types';
import {
  planHistoricalExecutionClock,
  type HistoricalClockBlock,
  type HistoricalExecutionClockPlan,
} from './historical-execution-clock';
import { prepareHistoricalGoalFill } from './historical-goal-quote';
import {
  applyHistoricalGoalBoundFee,
  type HistoricalGoalBoundFeeSource,
  type HistoricalGoalBoundFeeReceipt,
} from './historical-goal-bound-fee';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from './historical-execution-codec';

const HOUR = 3_600_000,
  DAY = 24 * HOUR,
  DELAY = 12_000,
  UNIT = 10n ** 18n;
const MAX = (1n << 128n) - 1n;
export type CausalCalibrationCandidate = 'momentum-breakout' | 'rebound-from-discount' | 'trend-pullback-accumulation';

/** Exact, fixed hypotheses: no candidate generation, tuning or data-dependent parameters. */
export function causalCalibrationCandidates(): Readonly<Record<CausalCalibrationCandidate, StrategyConfig>> {
  const common = {
    kind: 'rules' as const,
    amount: '2.5',
    threshold: '0',
    direction: 'below' as const,
    fastWindow: 2,
    slowWindow: 12,
    prompt: '',
  };
  return freeze({
    'momentum-breakout': {
      ...common,
      intervalMs: 6 * HOUR,
      rules: {
        version: 1,
        entry: {
          operator: 'all',
          conditions: [
            { kind: 'breakout', window: 12, direction: 'above' },
            { kind: 'momentum', window: 6, direction: 'above', threshold: '3' },
          ],
        },
        exit: { operator: 'all', conditions: [{ kind: 'momentum', window: 3, direction: 'below', threshold: '0' }] },
      },
    },
    'rebound-from-discount': {
      ...common,
      intervalMs: 6 * HOUR,
      rules: {
        version: 1,
        entry: {
          operator: 'all',
          conditions: [
            { kind: 'deviation', window: 12, direction: 'below', threshold: '-3' },
            { kind: 'momentum', window: 2, direction: 'above', threshold: '0' },
          ],
        },
        exit: { operator: 'all', conditions: [{ kind: 'deviation', window: 12, direction: 'above', threshold: '0' }] },
      },
    },
    'trend-pullback-accumulation': {
      ...common,
      intervalMs: DAY,
      rules: {
        version: 1,
        entry: {
          operator: 'all',
          conditions: [
            { kind: 'trend', window: 12, direction: 'above' },
            { kind: 'momentum', window: 2, direction: 'below', threshold: '-1' },
          ],
        },
        exit: null,
      },
    },
  });
}

/** Both boundary identities are adjacent canonical/finalized reader projections. */
export interface CausalCalibrationHour {
  completedAtMs: number;
  closing: HistoricalClockBlock;
  successor: HistoricalClockBlock;
  closingPoolEvidence: unknown;
  /** Required for hours 0..23 only. It is the successor's pool state, including no-order checkpoints. */
  riskPoolEvidence?: unknown;
}
/** Warmup provenance belongs to the caller's source-bound registration; only these 12 older closes are consumed. */
export interface CausalCalibrationInput {
  candidate: CausalCalibrationCandidate;
  startedAtMs: number;
  expectedDenominator: string;
  warmup: BotCandle[];
  hours: CausalCalibrationHour[];
}
/** Immutable proposal formed solely at its delayed signal, not resized at execution. */
export interface CausalCalibrationPending {
  signalIndex: number;
  decidedAtMs: number;
  targetExecutionAtMs: number;
  assetIn: string;
  assetOut: string;
  amountInCodec: string;
  plan: HistoricalExecutionClockPlan;
}
export interface CausalCalibrationQuoteProjection {
  quoteEvidence: unknown;
  boundFee?: { source: HistoricalGoalBoundFeeSource; receipt: HistoricalGoalBoundFeeReceipt };
}
/** The provider is an evidence seam; only matched quote and redecoded fee projections reach the ledger. */
export type CausalCalibrationQuoteProvider = (
  pending: Readonly<CausalCalibrationPending>,
  hour: Readonly<CausalCalibrationHour>
) => Promise<CausalCalibrationQuoteProjection>;
/** Values are exact XOR codec-unit fractions. Monetary comparisons never use floating point. */
export interface CausalCalibrationRatio {
  numerator: string;
  denominator: string;
}
export interface CausalCalibrationEquity {
  accountingAtMs: number;
  observedAtMs: number;
  blockHash: string;
  holdings: Record<string, string>;
  value: CausalCalibrationRatio;
  idleValue: CausalCalibrationRatio;
}
export interface CausalCalibrationEvent {
  atMs: number;
  kind: 'signal' | 'risk' | 'rejected' | 'scenario-fill' | 'cancelled' | 'terminal';
  signalIndex?: number;
  reason?: string;
  pending?: CausalCalibrationPending;
  value?: CausalCalibrationRatio;
  peak?: CausalCalibrationRatio;
  evidenceSha256?: string;
}
export interface CausalCalibrationResult {
  protocol: 'causal-goal-calibration-v1';
  candidate?: CausalCalibrationCandidate;
  status: 'complete' | 'incomplete';
  diagnostics: string[];
  events: CausalCalibrationEvent[];
  hourlyEquity: CausalCalibrationEquity[];
  controlEquity: CausalCalibrationEquity[];
  bot?: BotDefinition;
  outcome: 'active' | 'loss' | 'target' | 'expired';
  stoppedAtMs?: number;
  signalsConsumed: number;
  quoteRequests: number;
  summary?: {
    initialValue: CausalCalibrationRatio;
    finalValue: CausalCalibrationRatio;
    heldFinalValue: CausalCalibrationRatio;
    netXor: string;
    returnPercent: string;
    excessReturnPercent: string;
    retrospectiveDrawdownPercent: string;
    controlDrawdownPercent: string;
    fills: number;
  };
  observedFill: false;
  transactionSubmitted: false;
  qualificationAuthority: false;
}
interface Mark {
  timestampMs: number;
  blockHash: string;
  kusdReserveCodec: string;
  xorReserveCodec: string;
}
type Fraction = { n: bigint; d: bigint };

function check(value: unknown, reason = 'invalid-evidence'): asserts value {
  if (!value) throw new Error(`Causal calibration: ${reason}`);
}
/** Snapshot public own data before any await; reject getters, sparse arrays and unbounded evidence. */
function copy<T>(input: T): T {
  let nodes = 0,
    chars = 0;
  const active = new Set<object>();
  const visit = (value: unknown, depth: number): unknown => {
    check(++nodes <= 100_000 && depth <= 30, 'evidence-size');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      chars += value.length;
      check(chars <= 16_777_216, 'evidence-size');
      return value;
    }
    if (typeof value === 'number') {
      check(Number.isSafeInteger(value), 'noninteger-field');
      return value;
    }
    check(value && typeof value === 'object' && !active.has(value), 'non-public-data');
    active.add(value);
    const descriptors = Object.getOwnPropertyDescriptors(value),
      keys = Reflect.ownKeys(descriptors);
    check(
      keys.every((k) => typeof k === 'string' && 'value' in descriptors[k]),
      'accessor'
    );
    let result: unknown;
    if (Array.isArray(value)) {
      check(
        Object.getPrototypeOf(value) === Array.prototype && value.length <= 4096 && keys.length === value.length + 1,
        'array'
      );
      result = Array.from({ length: value.length }, (_, i) => {
        check(descriptors[i]?.enumerable, 'sparse-array');
        return visit(descriptors[i].value, depth + 1);
      });
    } else {
      check(
        [Object.prototype, null].includes(Object.getPrototypeOf(value)) &&
          keys.every((k) => descriptors[k as string].enumerable),
        'object'
      );
      result = Object.fromEntries(keys.map((k) => [k, visit(descriptors[k as string].value, depth + 1)]));
    }
    active.delete(value);
    return result;
  };
  return visit(input, 0) as T;
}
function record(value: unknown): Record<string, unknown> {
  check(value && typeof value === 'object' && !Array.isArray(value), 'record');
  return value as Record<string, unknown>;
}
function keys(value: unknown, names: string[]): void {
  const own = Object.keys(record(value));
  check(own.length === names.length && names.every((k) => own.includes(k)), 'fields');
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function canonical(value: unknown): string {
  return Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(value);
}
function amount(value: unknown): bigint {
  check(typeof value === 'string' && /^(0|[1-9]\d{0,38})$/.test(value), 'amount');
  const n = BigInt(value);
  check(n <= MAX, 'amount');
  return n;
}
function positive(value: unknown): bigint {
  const n = amount(value);
  check(n > 0n, 'zero-amount');
  return n;
}
function hash(value: unknown): void {
  check(typeof value === 'string' && /^0x[0-9a-f]{64}$/.test(value), 'hash');
}
function fraction(n: bigint, d = 1n): Fraction {
  check(d > 0n, 'ratio');
  return { n, d };
}
function ratio(f: Fraction): CausalCalibrationRatio {
  return { numerator: String(f.n), denominator: String(f.d) };
}
function cmp(a: Fraction, b: Fraction): bigint {
  return a.n * b.d - b.n * a.d;
}
function minus(a: Fraction, b: Fraction): Fraction {
  return fraction(a.n * b.d - b.n * a.d, a.d * b.d);
}
function divide(a: Fraction, b: Fraction): Fraction {
  return fraction(a.n * b.d, a.d * b.n);
}
function format(f: Fraction, scale = 1n): string {
  const unit = 10n ** 36n,
    raw = (f.n * unit) / (f.d * scale),
    magnitude = raw < 0n ? -raw : raw;
  const decimal = String(magnitude % unit)
    .padStart(36, '0')
    .replace(/0+$/, '');
  return `${raw < 0n ? '-' : ''}${magnitude / unit}${decimal ? `.${decimal}` : ''}`;
}
function percent(f: Fraction): string {
  return format(fraction(f.n * 100n, f.d));
}
function value(holdings: Record<string, string>, mark: Mark): Fraction {
  const k = positive(mark.kusdReserveCodec),
    x = positive(mark.xorReserveCodec);
  return fraction(amount(holdings[KUSD]) * x + amount(holdings[XOR]) * k, k);
}
function lossReached(peak: Fraction, current: Fraction): boolean {
  return current.n * peak.d * 10n <= peak.n * current.d * 9n;
}
function drawdown(rows: CausalCalibrationEquity[]): string {
  let peak = fraction(0n),
    worst = fraction(0n);
  for (const row of rows) {
    const latest = fraction(BigInt(row.value.numerator), BigInt(row.value.denominator));
    if (cmp(latest, peak) > 0n) peak = latest;
    const dd = divide(minus(peak, latest), peak);
    if (cmp(dd, worst) > 0n) worst = dd;
  }
  return percent(worst);
}
function block(value: HistoricalClockBlock): void {
  keys(value, ['height', 'hash', 'parentHash', 'timestampMs']);
  check(
    Number.isSafeInteger(value.height) &&
      value.height > 0 &&
      Number.isSafeInteger(value.timestampMs) &&
      value.timestampMs > 0,
    'block'
  );
  hash(value.hash);
  hash(value.parentHash);
  check(value.hash !== value.parentHash, 'block-self-parent');
}
/** Validate the reader's exact native-state pool projection; transport/finality evidence stays upstream. */
function markFromPool(input: unknown, at: HistoricalClockBlock, denominator: string): Mark {
  const pool = record(input),
    binding = record(pool.binding),
    state = record(pool.state),
    runtime = record(binding.runtimeVersion);
  check(
    binding.genesisHash === GENESIS && binding.blockHash === at.hash && binding.metadataVersion === 14,
    'pool-binding'
  );
  check(typeof binding.metadataSha256 === 'string' && /^[0-9a-f]{64}$/.test(binding.metadataSha256), 'metadata');
  check(
    [130, 131].includes(runtime.specVersion as number) && runtime.specVersion === runtime.transactionVersion,
    'native-runtime'
  );
  check(state.timestampMs === at.timestampMs && state.denominator === denominator, 'pool-state');
  check(
    pool.status === 'present' &&
      pool.basis === 'direct-pool-reserve-ratio' &&
      pool.observedFill === false &&
      pool.transactionSubmitted === false,
    'pool-unavailable'
  );
  const pair = record(pool.pair),
    accounts = record(pool.accounts),
    reserves = record(pool.reserves),
    marks = record(pool.marks);
  check(
    pair.baseAssetId === XOR && pair.targetAssetId === KUSD && pair.baseDecimals === 18 && pair.targetDecimals === 18,
    'pair'
  );
  hash(accounts.reservesAccountId);
  hash(accounts.feesAccountId);
  const k = positive(reserves.kusdCodec),
    x = positive(reserves.xorCodec),
    xpk = record(marks.xorPerKusd),
    kpx = record(marks.kusdPerXor);
  check(
    xpk.numeratorCodec === reserves.xorCodec &&
      xpk.denominatorCodec === reserves.kusdCodec &&
      kpx.numeratorCodec === reserves.kusdCodec &&
      kpx.denominatorCodec === reserves.xorCodec,
    'pool-ratio'
  );
  return { timestampMs: at.timestampMs, blockHash: at.hash, kusdReserveCodec: String(k), xorReserveCodec: String(x) };
}
function makeBot(candidate: CausalCalibrationCandidate, startedAtMs: number, opening: Mark): BotDefinition {
  const initial = { [KUSD]: String(10n * UNIT), [XOR]: String(UNIT) };
  const outputCeiling = (10n * UNIT * positive(opening.xorReserveCodec)) / positive(opening.kusdReserveCodec);
  check(outputCeiling <= MAX, 'output-ceiling');
  return {
    version: 1,
    id: `causal-calibration:${candidate}:${startedAtMs}`,
    name: candidate,
    account: '',
    network: GENESIS,
    mode: 'paper',
    status: 'idle',
    assetIn: { address: KUSD, symbol: 'KUSD', decimals: 18 },
    assetOut: { address: XOR, symbol: 'XOR', decimals: 18 },
    strategy: copyStrategyConfig(causalCalibrationCandidates()[candidate]),
    policy: {
      maxTradeCodec: { [KUSD]: String(10n * UNIT), [XOR]: String(outputCeiling) },
      slippagePercent: '0.5',
      maxPriceImpactPercent: '1',
      feeAsset: { address: XOR, symbol: 'XOR', decimals: 18 },
      feeBudgetCodec: String(UNIT),
      sessionDurationMs: DAY,
    },
    portfolio: { initial, holdings: { ...initial }, feesPaidCodec: '0', trades: 0 },
    state: { lastEvaluatedAt: 0, lastTradeAt: 0 },
    provider: 'openai',
    model: '',
    endpoint: '',
    createdAt: startedAtMs,
    sessionExpiresAt: 0,
    activity: [],
    equity: [],
    apiUsage: { inputTokens: 0, outputTokens: 0, requests: 0 },
    goal: {
      title: 'Grow XOR',
      targetReturnPercent: '5',
      maxLossPercent: '10',
      durationMs: DAY,
      valuationAsset: 'output',
      lossMetric: 'drawdown',
      targetRequiresIdleOutperformance: true,
    },
  };
}

/**
 * Replay one unchanged 24-hour funded episode. Required state projections preflight
 * before any quote; a missing/inconsistent quote stops with partial evidence.
 * Hourly accounting never changes control peak, target or loss state.
 */
async function replayValidatedCausalGoalCalibration(
  input: CausalCalibrationInput,
  quoteProvider: CausalCalibrationQuoteProvider
): Promise<CausalCalibrationResult> {
  const data = copy(input);
  keys(data, ['candidate', 'startedAtMs', 'expectedDenominator', 'warmup', 'hours']);
  check(Object.hasOwn(causalCalibrationCandidates(), data.candidate), 'candidate');
  check(
    Number.isSafeInteger(data.startedAtMs) &&
      data.startedAtMs >= 12 * HOUR &&
      data.startedAtMs <= Number.MAX_SAFE_INTEGER - DAY - DELAY &&
      data.startedAtMs % HOUR === 0,
    'funding-clock'
  );
  positive(data.expectedDenominator);
  check(
    Array.isArray(data.warmup) && data.warmup.length === 12 && Array.isArray(data.hours) && data.hours.length === 25,
    'fixed-coverage'
  );
  data.warmup.forEach((c, i) => {
    keys(c, ['timestamp', 'close']);
    check(c.timestamp === data.startedAtMs + (i - 12) * HOUR, 'warmup-gap');
    parseBotPrice(c.close);
  });
  const closing: Mark[] = [],
    risk = new Map<number, Mark>(),
    identities = new Map<number, HistoricalClockBlock>(),
    hashes = new Set<string>();
  const register = (b: HistoricalClockBlock) => {
    block(b);
    const old = identities.get(b.height);
    check(!old || canonical(old) === canonical(b), 'contradictory-block');
    if (!old) {
      check(!hashes.has(b.hash), 'reused-hash');
      identities.set(b.height, b);
      hashes.add(b.hash);
    }
  };
  for (const [i, row] of data.hours.entries()) {
    keys(row, [
      'completedAtMs',
      'closing',
      'successor',
      'closingPoolEvidence',
      ...(i < 24 ? ['riskPoolEvidence'] : []),
    ]);
    const boundary = data.startedAtMs + i * HOUR;
    check(row.completedAtMs === boundary, 'hour-gap');
    register(row.closing);
    register(row.successor);
    check(
      row.closing.timestampMs < boundary &&
        boundary - row.closing.timestampMs <= DELAY &&
        row.successor.timestampMs >= boundary &&
        row.successor.timestampMs - boundary <= DELAY &&
        row.closing.height + 1 === row.successor.height &&
        row.successor.parentHash === row.closing.hash,
      'boundary-proof'
    );
    if (i)
      check(
        row.closing.height > data.hours[i - 1].successor.height &&
          row.closing.timestampMs > data.hours[i - 1].successor.timestampMs,
        'nonadvancing-hour'
      );
    const close = markFromPool(row.closingPoolEvidence, row.closing, data.expectedDenominator);
    parseBotPrice(format(fraction(positive(close.kusdReserveCodec), positive(close.xorReserveCodec))));
    closing.push(close);
    if (i < 24) risk.set(i, markFromPool(row.riskPoolEvidence, row.successor, data.expectedDenominator));
  }
  freeze(data);
  let bot = makeBot(data.candidate, data.startedAtMs, closing[0]);
  const baseline = value(bot.portfolio.initial, closing[0]);
  let peak = baseline,
    outcome: CausalCalibrationResult['outcome'] = 'active',
    stoppedAtMs: number | undefined;
  let signalsConsumed = 0,
    quoteRequests = 0,
    pending: CausalCalibrationPending | undefined;
  const events: CausalCalibrationEvent[] = [],
    hourlyEquity: CausalCalibrationEquity[] = [],
    controlEquity: CausalCalibrationEquity[] = [],
    diagnostics: string[] = [];
  const candles = [...data.warmup];
  const equity = (mark: Mark, accountingAtMs: number): CausalCalibrationEquity => ({
    accountingAtMs,
    observedAtMs: mark.timestampMs,
    blockHash: mark.blockHash,
    holdings: { ...bot.portfolio.holdings },
    value: ratio(value(bot.portfolio.holdings, mark)),
    idleValue: ratio(value(bot.portfolio.initial, mark)),
  });
  const observe = (mark: Mark) => {
    const current = value(bot.portfolio.holdings, mark),
      idle = value(bot.portfolio.initial, mark);
    controlEquity.push(equity(mark, mark.timestampMs));
    if (outcome === 'active') {
      if (cmp(current, peak) > 0n) peak = current;
      if (lossReached(peak, current)) outcome = 'loss';
      else if (
        current.n * baseline.d * 100n >= baseline.n * current.d * 105n &&
        bot.portfolio.trades > 0 &&
        cmp(current, idle) > 0n
      )
        outcome = 'target';
      if (outcome !== 'active') stoppedAtMs = mark.timestampMs;
    }
    events.push({ kind: 'risk', atMs: mark.timestampMs, value: ratio(current), peak: ratio(peak), reason: outcome });
  };
  const finish = (status: CausalCalibrationResult['status']): CausalCalibrationResult => {
    const last = hourlyEquity.at(-1);
    const final = last && fraction(BigInt(last.value.numerator), BigInt(last.value.denominator));
    const idle = last && fraction(BigInt(last.idleValue.numerator), BigInt(last.idleValue.denominator));
    return freeze({
      protocol: 'causal-goal-calibration-v1',
      candidate: data.candidate,
      status,
      diagnostics,
      events,
      hourlyEquity,
      controlEquity,
      bot,
      outcome,
      ...(stoppedAtMs === undefined ? {} : { stoppedAtMs }),
      signalsConsumed,
      quoteRequests,
      ...(status === 'complete' && final && idle
        ? {
            summary: {
              initialValue: ratio(baseline),
              finalValue: ratio(final),
              heldFinalValue: ratio(idle),
              netXor: format(minus(final, baseline), UNIT),
              returnPercent: percent(divide(minus(final, baseline), baseline)),
              excessReturnPercent: percent(divide(minus(final, idle), baseline)),
              retrospectiveDrawdownPercent: drawdown(hourlyEquity),
              controlDrawdownPercent: drawdown(controlEquity),
              fills: bot.portfolio.trades,
            },
          }
        : {}),
      observedFill: false,
      transactionSubmitted: false,
      qualificationAuthority: false,
    });
  };
  // Once the journal starts, an unexpected evaluator/ledger error must preserve its prefix.
  let replayStage = 'opening';
  try {
    controlEquity.push(equity(closing[0], data.startedAtMs));
    for (let i = 0; i < 24; i++) {
      replayStage = `accounting:${i}`;
      const hour = data.hours[i];
      // These holdings existed at the closing block, before the successor's possible fill.
      hourlyEquity.push(equity(closing[i], hour.completedAtMs));
      {
        replayStage = `risk:${i}`;
        const mark = risk.get(i)!;
        observe(mark);
        const order = pending;
        pending = undefined;
        if (order && outcome !== 'active')
          events.push({
            kind: 'cancelled',
            atMs: mark.timestampMs,
            signalIndex: order.signalIndex,
            pending: order,
            reason: 'goal-complete',
          });
        if (order && outcome === 'active') {
          quoteRequests++;
          let joined: ReturnType<typeof prepareHistoricalGoalFill>,
            response: CausalCalibrationQuoteProjection,
            digest: string;
          try {
            response = copy(await quoteProvider(freeze(order), hour));
            keys(response, ['quoteEvidence', ...(Object.hasOwn(response, 'boundFee') ? ['boundFee'] : [])]);
            joined = prepareHistoricalGoalFill(
              {
                assetIn: order.assetIn,
                assetOut: order.assetOut,
                amountInCodec: order.amountInCodec,
                expectedDenominator: data.expectedDenominator,
              },
              order.plan,
              hour.closing,
              hour.successor,
              response.quoteEvidence,
              hour.riskPoolEvidence
            );
            digest = createHash('sha256').update(canonical(response)).digest('hex');
          } catch {
            diagnostics.push(`quote-evidence:${i}`);
            return finish('incomplete');
          }
          if (joined.kind !== 'ready') {
            if (response.boundFee !== undefined) {
              diagnostics.push(`unexpected-bound-fee:${i}`);
              return finish('incomplete');
            }
            events.push({
              kind: 'rejected',
              atMs: mark.timestampMs,
              signalIndex: order.signalIndex,
              pending: order,
              reason: joined.kind,
              evidenceSha256: digest,
            });
          } else {
            let fill: PaperFill;
            try {
              check(response.boundFee, 'missing-bound-fee');
              check(
                canonical(response.boundFee.source.quoteEvidence) === canonical(response.quoteEvidence),
                'changed-fee-source'
              );
              const adjusted = applyHistoricalGoalBoundFee(joined, response.boundFee.source, response.boundFee.receipt);
              check(adjusted.kind === 'ready' && 'feeEvidenceDigest' in adjusted, 'bound-fee');
              fill = adjusted.fill;
            } catch {
              diagnostics.push(`bound-fee-evidence:${i}`);
              return finish('incomplete');
            }
            replayStage = `fill:${i}`;
            let next: BotDefinition['portfolio'] | undefined, rejection: string | undefined;
            try {
              next = applyPaperFill(bot, fill);
            } catch (error) {
              const reason = error instanceof Error ? error.message : '';
              if (!['bots.errors.balance', 'bots.errors.feeBudget', 'bots.errors.policy'].includes(reason)) throw error;
              rejection = reason;
            }
            if (next) {
              const failure = {
                ...bot.portfolio.holdings,
                [XOR]: String(amount(bot.portfolio.holdings[XOR]) - amount(fill.feeCodec)),
              };
              if (lossReached(peak, value(next.holdings, mark)) || lossReached(peak, value(failure, mark)))
                rejection = 'goalTradeCost';
            }
            if (rejection)
              events.push({
                kind: 'rejected',
                atMs: mark.timestampMs,
                signalIndex: order.signalIndex,
                pending: order,
                reason: rejection,
                evidenceSha256: digest,
              });
            else {
              check(next, 'missing-fill');
              bot = { ...bot, portfolio: next, state: { ...bot.state, lastTradeAt: mark.timestampMs } };
              events.push({
                kind: 'scenario-fill',
                atMs: mark.timestampMs,
                signalIndex: order.signalIndex,
                pending: order,
                evidenceSha256: digest,
              });
              observe(mark);
            }
          }
        }
      }
      replayStage = `signal:${i}`;
      const decidedAtMs = hour.successor.timestampMs + DELAY;
      candles.push({
        timestamp: hour.completedAtMs,
        close: format(fraction(positive(closing[i].kusdReserveCodec), positive(closing[i].xorReserveCodec))),
      });
      signalsConsumed++;
      if (outcome !== 'active') {
        events.push({ kind: 'signal', atMs: decidedAtMs, signalIndex: i, reason: 'goal-complete' });
        continue;
      }
      const decision = evaluateStrategy(bot, candles, decidedAtMs);
      bot = { ...bot, state: decision.state };
      events.push({ kind: 'signal', atMs: decidedAtMs, signalIndex: i, reason: decision.proposal.reason });
      if (decision.proposal.action === 'hold') continue;
      if (i === 23) {
        events.push({ kind: 'cancelled', atMs: decidedAtMs, signalIndex: i, reason: 'deadline' });
        continue;
      }
      const buy = decision.proposal.action === 'buy',
        targetExecutionAtMs = hour.completedAtMs + HOUR;
      const plan = planHistoricalExecutionClock(
        { completedAtMs: hour.completedAtMs, closing: hour.closing, successor: hour.successor },
        {
          version: 1,
          purpose: 'development',
          availability: 'assumed-after-successor-block',
          signalDelayMs: DELAY,
          executionDelayMs: targetExecutionAtMs - decidedAtMs,
          maximumExecutionLagMs: DELAY,
        },
        { startedAtMs: data.startedAtMs, endedAtMs: data.startedAtMs + DAY }
      );
      pending = freeze({
        signalIndex: i,
        decidedAtMs,
        targetExecutionAtMs,
        assetIn: buy ? KUSD : XOR,
        assetOut: buy ? XOR : KUSD,
        amountInCodec: toCodec(decision.proposal.amount, 18),
        plan,
      });
    }
    replayStage = 'terminal';
    check(!pending, 'pending-at-deadline');
    hourlyEquity.push(equity(closing[24], data.startedAtMs + DAY));
    if (outcome === 'active') {
      outcome = 'expired';
      stoppedAtMs = data.startedAtMs + DAY;
    }
    events.push({ kind: 'terminal', atMs: data.startedAtMs + DAY, value: hourlyEquity[24].value, reason: outcome });
    return finish('complete');
  } catch {
    diagnostics.push(`replay-stage:${replayStage}`);
    return finish('incomplete');
  }
}

/** Reject missing, gapped or inconsistent preflight evidence as an incomplete scenario. */
export async function replayCausalGoalCalibration(
  input: CausalCalibrationInput,
  quoteProvider: CausalCalibrationQuoteProvider
): Promise<CausalCalibrationResult> {
  try {
    return await replayValidatedCausalGoalCalibration(input, quoteProvider);
  } catch (error) {
    const reason =
      error instanceof Error && error.message.startsWith('Causal calibration:')
        ? error.message
        : 'Causal calibration: invalid-input';
    return freeze({
      protocol: 'causal-goal-calibration-v1',
      status: 'incomplete',
      diagnostics: [reason],
      events: [],
      hourlyEquity: [],
      controlEquity: [],
      outcome: 'active',
      signalsConsumed: 0,
      quoteRequests: 0,
      observedFill: false,
      transactionSubmitted: false,
      qualificationAuthority: false,
    });
  }
}
