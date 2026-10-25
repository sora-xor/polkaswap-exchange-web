/**
 * Bounded, stateless spot-rule composition over completed closes. Comparisons use
 * exact integer fractions; evidence strings truncate to 36 decimal places only
 * after the decision. Callers must exclude observations after the decision time.
 */
export type RuleDirection = 'above' | 'below';

export type RuleCondition =
  | { kind: 'trend' | 'breakout'; window: number; direction: RuleDirection }
  | {
      kind: 'momentum' | 'deviation' | 'mad' | 'efficiency' | 'rsi' | 'drawdown' | 'restoring';
      window: number;
      direction: RuleDirection;
      threshold: string;
    }
  | { kind: 'return-quantile'; window: number; direction: RuleDirection; percentile: number };

export interface RuleGroup {
  operator: 'all' | 'any';
  conditions: RuleCondition[];
}

export interface StrategyRules {
  version: 1;
  entry: RuleGroup;
  exit: RuleGroup | null;
}

export interface RuleEvidence {
  kind: RuleCondition['kind'];
  ready: boolean;
  passed: boolean;
  value: string | null;
  threshold: string | null;
}

export interface StrategyRuleEvaluation {
  entry: boolean;
  exit: boolean;
  ready: boolean;
  entryConditions: RuleEvidence[];
  exitConditions: RuleEvidence[];
}

type RuleCandle = { timestamp: number; close: string };
type Fraction = { numerator: bigint; denominator: bigint };
const SCALE = 10n ** 36n;
const HUNDRED = 100n;
const DECIMAL = /^-?(0|[1-9]\d*)(\.\d{1,36})?$/;

/** Accept plain data objects with precisely the declared own keys, never getters. */
function exactObject(value: unknown, keys: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  return (
    actual.length === keys.length &&
    actual.every((key) => typeof key === 'string' && keys.includes(key) && 'value' in descriptors[key])
  );
}

/** Decode bounded ordinary decimal notation into 36-place integer units. */
function decimalUnits(value: unknown): bigint | null {
  if (typeof value !== 'string' || value.length > 100 || !DECIMAL.test(value)) return null;
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  const units = BigInt(whole) * SCALE + BigInt(fraction.padEnd(36, '0'));
  return negative ? -units : units;
}

/** Render a rational as an ordinary decimal, truncating display precision toward zero. */
function formatFraction(value: Fraction): string {
  const units = (value.numerator * SCALE) / value.denominator;
  const magnitude = units < 0n ? -units : units;
  const whole = magnitude / SCALE;
  const fraction = (magnitude % SCALE).toString().padStart(36, '0').replace(/0+$/, '');
  return `${units < 0n ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

/** Validate a single leaf and copy only its supported, canonical fields. */
function parseCondition(value: unknown): RuleCondition | null {
  if (!value || typeof value !== 'object') return null;
  const kind = Object.getOwnPropertyDescriptor(value, 'kind')?.value;
  const thresholdKind = ['momentum', 'deviation', 'mad', 'efficiency', 'rsi', 'drawdown', 'restoring'].includes(kind);
  const keys = ['kind', 'window', 'direction'];
  if (thresholdKind) keys.push('threshold');
  else if (kind === 'return-quantile') keys.push('percentile');
  else if (kind !== 'trend' && kind !== 'breakout') return null;
  if (!exactObject(value, keys)) return null;
  const { window, direction } = value;
  if (
    typeof window !== 'number' ||
    !Number.isInteger(window) ||
    window < 2 ||
    window > 200 ||
    (direction !== 'above' && direction !== 'below')
  )
    return null;
  if (kind === 'trend' || kind === 'breakout') return { kind, window, direction };
  if (kind === 'return-quantile') {
    const { percentile } = value;
    if (typeof percentile !== 'number' || !Number.isInteger(percentile) || percentile < 1 || percentile > 99)
      return null;
    return { kind, window, direction, percentile };
  }
  const threshold = decimalUnits(value.threshold);
  const minimum = ['mad', 'efficiency', 'rsi', 'restoring'].includes(kind) ? 0n : -HUNDRED * SCALE;
  const maximum = kind === 'drawdown' ? 0n : HUNDRED * SCALE;
  if (threshold === null || threshold > maximum || threshold < minimum) return null;
  return { kind, window, direction, threshold: formatFraction({ numerator: threshold, denominator: SCALE }) };
}

/** Validate a nonempty bounded flat group; nested groups are deliberately unsupported. */
function parseGroup(value: unknown): RuleGroup | null {
  if (!exactObject(value, ['operator', 'conditions'])) return null;
  if (value.operator !== 'all' && value.operator !== 'any') return null;
  if (!Array.isArray(value.conditions) || value.conditions.length < 1 || value.conditions.length > 4) return null;
  const conditions: RuleCondition[] = [];
  for (const item of value.conditions) {
    const condition = parseCondition(item);
    if (!condition) return null;
    conditions.push(condition);
  }
  return { operator: value.operator, conditions };
}

/** Attempt strict parsing without leaking native errors from malformed input. */
function tryParseStrategyRules(value: unknown): StrategyRules | null {
  try {
    if (!exactObject(value, ['version', 'entry', 'exit']) || value.version !== 1) return null;
    const entry = parseGroup(value.entry);
    const exit = value.exit === null ? null : parseGroup(value.exit);
    if (!entry || (value.exit !== null && !exit)) return null;
    return { version: 1, entry, exit };
  } catch {
    return null;
  }
}

/** Parse untrusted rules into a canonical deep copy, rejecting invalid configuration. */
export function parseStrategyRules(value: unknown): StrategyRules {
  const parsed = tryParseStrategyRules(value);
  if (!parsed) throw new Error('bots.errors.config');
  return parsed;
}

/** Count the closes needed by a leaf, including lagged return/channel observations. */
function conditionCandles(condition: RuleCondition): number {
  if (['mad', 'return-quantile', 'restoring'].includes(condition.kind)) return condition.window + 2;
  if (['momentum', 'breakout', 'efficiency', 'rsi'].includes(condition.kind)) return condition.window + 1;
  return condition.window;
}

/** Return the largest lookback across both groups; malformed rules return zero. */
export function requiredRuleCandles(rules: StrategyRules): number {
  const parsed = tryParseStrategyRules(rules);
  if (!parsed) return 0;
  return Math.max(...[...parsed.entry.conditions, ...(parsed.exit?.conditions ?? [])].map(conditionCandles));
}

/** Compare fractions without rounding a return or an interpolated quantile. */
function compare(left: Fraction, right: Fraction): number {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

/** Reduce fractions to keep bounded-window median calculations inexpensive. */
function fraction(numerator: bigint, denominator: bigint): Fraction {
  let a = numerator < 0n ? -numerator : numerator;
  let b = denominator;
  while (b !== 0n) [a, b] = [b, a % b];
  return { numerator: numerator / a, denominator: denominator / a };
}

/** Interpolate exactly with an integer percentage weight in [0, 100]. */
function interpolate(left: Fraction, right: Fraction, weight: bigint): Fraction {
  return fraction(
    left.numerator * right.denominator * (HUNDRED - weight) + right.numerator * left.denominator * weight,
    left.denominator * right.denominator * HUNDRED
  );
}

/** Type-7 quantile, with exact rank and linear interpolation; input is never sorted in place. */
function quantile(values: Fraction[], percentile: number): Fraction {
  const sorted = [...values].sort(compare);
  const rank = BigInt(sorted.length - 1) * BigInt(percentile);
  const lower = Number(rank / HUNDRED);
  const weight = rank % HUNDRED;
  return weight === 0n ? sorted[lower] : interpolate(sorted[lower], sorted[lower + 1], weight);
}

/** Percentage return from two strictly positive prices in the same integer scale. */
function percentReturn(current: bigint, previous: bigint): Fraction {
  return fraction((current - previous) * HUNDRED, previous);
}

/** Create unavailable evidence without fabricating numerical values. */
function unavailable(condition: RuleCondition): RuleEvidence {
  return { kind: condition.kind, ready: false, passed: false, value: null, threshold: null };
}

/** Evaluate one level predicate; prior-return measures explicitly omit the current return. */
function evaluateCondition(condition: RuleCondition, prices: bigint[], timestamps: number[]): RuleEvidence {
  if (prices.length < conditionCandles(condition)) return unavailable(condition);
  const current = prices[prices.length - 1];
  const window = condition.window;
  let value: Fraction = { numerator: current, denominator: SCALE };
  let threshold: Fraction;
  if (condition.kind === 'trend' || condition.kind === 'deviation') {
    const sum = prices.slice(-window).reduce((total, price) => total + price, 0n);
    threshold = { numerator: sum, denominator: BigInt(window) * SCALE };
    if (condition.kind === 'deviation') {
      value = fraction((current * BigInt(window) - sum) * HUNDRED, sum);
      threshold = { numerator: decimalUnits(condition.threshold)!, denominator: SCALE };
    }
  } else if (condition.kind === 'breakout') {
    const prior = prices.slice(-window - 1, -1);
    const boundary = prior.reduce((extreme, price) =>
      condition.direction === 'above' ? (price > extreme ? price : extreme) : price < extreme ? price : extreme
    );
    threshold = { numerator: boundary, denominator: SCALE };
  } else if (condition.kind === 'momentum') {
    value = percentReturn(current, prices[prices.length - window - 1]);
    threshold = { numerator: decimalUnits(condition.threshold)!, denominator: SCALE };
  } else if (condition.kind === 'efficiency' || condition.kind === 'rsi') {
    const path = prices.slice(-window - 1);
    let gains = 0n;
    let losses = 0n;
    for (let index = 1; index < path.length; index++) {
      const change = path[index] - path[index - 1];
      if (change > 0n) gains += change;
      else losses -= change;
    }
    const distance = gains + losses;
    if (distance === 0n) {
      // A flat path has no directional efficiency and neutral simple-window RSI.
      value = { numerator: condition.kind === 'rsi' ? 50n : 0n, denominator: 1n };
    } else if (condition.kind === 'rsi') {
      // This is simple-window RSI over price changes, without Wilder smoothing.
      value = fraction(gains * HUNDRED, distance);
    } else {
      const displacement = current - path[0];
      value = fraction((displacement < 0n ? -displacement : displacement) * HUNDRED, distance);
    }
    threshold = { numerator: decimalUnits(condition.threshold)!, denominator: SCALE };
  } else if (condition.kind === 'drawdown') {
    const peak = prices.slice(-window).reduce((highest, price) => (price > highest ? price : highest));
    value = percentReturn(current, peak);
    threshold = { numerator: decimalUnits(condition.threshold)!, denominator: SCALE };
  } else if (condition.kind === 'restoring') {
    const times = timestamps.slice(-window - 2);
    const cadence = times[1] - times[0];
    if (times.slice(1).some((time, index) => time - times[index] !== cadence)) return unavailable(condition);
    const prior = prices.slice(-window - 2, -1);
    let sumX = 0n;
    let sumY = 0n;
    let sumXX = 0n;
    let sumXY = 0n;
    for (let index = 0; index < window; index++) {
      const x = prior[index];
      const y = prior[index + 1] - x;
      sumX += x;
      sumY += y;
      sumXX += x * x;
      sumXY += x * y;
    }
    // The OLS intercept is retained through centered covariance/variance sums.
    const variance = BigInt(window) * sumXX - sumX * sumX;
    if (variance === 0n) return unavailable(condition);
    const covariance = BigInt(window) * sumXY - sumX * sumY;
    value = fraction(-HUNDRED * covariance, variance);
    threshold = { numerator: decimalUnits(condition.threshold)!, denominator: SCALE };
  } else {
    const preceding = prices.slice(-window - 2, -1);
    const returns = preceding.slice(1).map((price, index) => percentReturn(price, preceding[index]));
    if (condition.kind === 'return-quantile') {
      value = percentReturn(current, prices[prices.length - 2]);
      threshold = quantile(returns, condition.percentile);
    } else if (condition.kind === 'mad') {
      const median = quantile(returns, 50);
      value = quantile(
        returns.map((item) => {
          const difference = item.numerator * median.denominator - median.numerator * item.denominator;
          return fraction(difference < 0n ? -difference : difference, item.denominator * median.denominator);
        }),
        50
      );
      threshold = { numerator: decimalUnits(condition.threshold)!, denominator: SCALE };
    } else return unavailable(condition);
  }
  const order = compare(value, threshold);
  return {
    kind: condition.kind,
    ready: true,
    passed: condition.direction === 'above' ? order > 0 : order < 0,
    value: formatFraction(value),
    threshold: formatFraction(threshold),
  };
}

/** Resolve a group only after every leaf is available, including `any` groups. */
function passedGroup(group: RuleGroup | null, evidence: RuleEvidence[]): boolean {
  if (!group || !evidence.every((item) => item.ready)) return false;
  return group.operator === 'all' ? evidence.every((item) => item.passed) : evidence.some((item) => item.passed);
}

/**
 * Evaluate past-only history without mutating rules/candles or carrying positions.
 * Invalid chronology/prices and incomplete warm-up cannot authorize either signal.
 * Trend/channel evidence is in price units; every other leaf reports percentages.
 */
export function evaluateStrategyRules(rules: StrategyRules, candles: readonly RuleCandle[]): StrategyRuleEvaluation {
  const parsed = tryParseStrategyRules(rules);
  const result: StrategyRuleEvaluation = {
    ready: false,
    entry: false,
    exit: false,
    entryConditions: parsed?.entry.conditions.map(unavailable) ?? [],
    exitConditions: parsed?.exit?.conditions.map(unavailable) ?? [],
  };
  if (!parsed || !Array.isArray(candles)) return result;
  const prices: bigint[] = [];
  const timestamps: number[] = [];
  let previous = -1;
  for (const candle of candles) {
    if (!candle || !Number.isSafeInteger(candle.timestamp) || candle.timestamp <= previous) return result;
    const price = decimalUnits(candle.close);
    if (price === null || price <= 0n || candle.close.startsWith('-')) return result;
    prices.push(price);
    timestamps.push(candle.timestamp);
    previous = candle.timestamp;
  }
  // At most eight canonical leaves share work only within this observation.
  // Detached evidence prevents an edited entry display from changing an exit.
  const evidenceCache = new Map<string, RuleEvidence>();
  const evaluateCached = (condition: RuleCondition): RuleEvidence => {
    const key = JSON.stringify(condition);
    let evidence = evidenceCache.get(key);
    if (!evidence) {
      evidence = evaluateCondition(condition, prices, timestamps);
      evidenceCache.set(key, evidence);
    }
    return { ...evidence };
  };
  result.entryConditions = parsed.entry.conditions.map(evaluateCached);
  result.exitConditions = parsed.exit?.conditions.map(evaluateCached) ?? [];
  result.ready = [...result.entryConditions, ...result.exitConditions].every((item) => item.ready);
  if (result.ready) {
    result.entry = passedGroup(parsed.entry, result.entryConditions);
    result.exit = passedGroup(parsed.exit, result.exitConditions);
  }
  return result;
}
