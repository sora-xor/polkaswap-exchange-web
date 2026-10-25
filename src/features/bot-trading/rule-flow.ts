import { FPNumber } from '@/lib/substrate/math';
import { evaluateStrategyRules, requiredRuleCandles } from './strategy-rules';
import type { RuleCondition, RuleEvidence, StrategyRules } from './strategy-rules';
import type { BotCandle } from './types';

export type RuleFlowOutcome = 'buy' | 'sell' | 'hold' | 'conflict' | 'warmup';
export interface RuleFlowObservation {
  candle: BotCandle;
  evaluation: ReturnType<typeof evaluateStrategyRules>;
  outcome: RuleFlowOutcome;
}
export interface RuleFlowModel {
  source: 'historical' | 'illustrative';
  observations: RuleFlowObservation[];
  stops: number[];
  durationMs: number;
}
export interface RuleFlowFrame {
  index: number;
  position: number;
  progress: number;
  complete: boolean;
  holding: boolean;
}
export interface RuleFlowPoint {
  x: number;
  y: number;
}
export interface RuleFlowTrace {
  price: RuleFlowPoint[];
  value: (RuleFlowPoint | null)[];
  threshold: (RuleFlowPoint | null)[];
  priceDomain: [string, string];
  indicatorDomain: [string, string];
}
const VISIBLE = 48;
const TRAVEL_MS = 8000;
const HOLD_MS = 1600;
const fp = (value: string | number) => new FPNumber(String(value), 36);

/** Authored hourly prices teach rules; the restoring lesson repeats a bounded dip/recovery, never a market forecast. */
export function illustrativeRuleCandles(count: number, profile: 'general' | 'restoring' = 'general'): BotCandle[] {
  const anchors = ['100', '112', '96', '119', '91', '107', '101'];
  const restoringCycle = [
    '99',
    '100',
    '101',
    '102',
    '103',
    '102',
    '101',
    '100',
    '99',
    '98',
    '97',
    '96',
    '95',
    '96',
    '97',
    '98',
  ];
  return Array.from({ length: count }, (_, index) => {
    if (profile === 'restoring')
      return {
        timestamp: Date.UTC(2020, 0, 1) + index * 3_600_000,
        close: restoringCycle[index % restoringCycle.length],
      };
    const at = fp(index)
      .mul(fp(anchors.length - 1))
      .div(fp(Math.max(1, count - 1)));
    const lower = Math.min(anchors.length - 2, Math.floor(at.toNumber()));
    const portion = at.sub(fp(lower));
    const eased = portion.mul(portion).mul(fp(3).sub(portion.mul(fp(2))));
    return {
      timestamp: Date.UTC(2020, 0, 1) + index * 3_600_000,
      close: fp(anchors[lower])
        .add(
          fp(anchors[lower + 1])
            .sub(fp(anchors[lower]))
            .mul(eased)
        )
        .dp(8, 4)
        .toString(),
    };
  });
}

/** Return a signal, not a virtual fill: simultaneous entry and exit are shown explicitly. */
export function ruleFlowOutcome(evaluation: ReturnType<typeof evaluateStrategyRules>): RuleFlowOutcome {
  if (!evaluation.ready) return 'warmup';
  if (evaluation.entry && evaluation.exit) return 'conflict';
  return evaluation.entry ? 'buy' : evaluation.exit ? 'sell' : 'hold';
}

/**
 * Evaluate every displayed observation using only its preceding history. A bounded
 * tail includes indicator warmup; malformed chronology stays visibly unavailable.
 */
export function buildRuleFlow(rules: StrategyRules, candles?: readonly BotCandle[]): RuleFlowModel {
  const needed = requiredRuleCandles(rules);
  const source = candles === undefined ? 'illustrative' : 'historical';
  const profile =
    needed > 0 &&
    [...rules.entry.conditions, ...(rules.exit?.conditions ?? [])].some(({ kind }) => kind === 'restoring')
      ? 'restoring'
      : 'general';
  const history =
    candles === undefined
      ? illustrativeRuleCandles(needed + VISIBLE - 1, profile)
      : candles.slice(-(needed + VISIBLE - 1));
  const empty: RuleFlowModel = { source, observations: [], stops: [], durationMs: 0 };
  if (
    !history.length ||
    history.some(
      (candle, index) =>
        !Number.isSafeInteger(candle.timestamp) ||
        candle.timestamp < 0 ||
        (index > 0 && candle.timestamp <= history[index - 1].timestamp) ||
        !/^(0|[1-9]\d*)(\.\d+)?$/.test(candle.close) ||
        candle.close.length > 100 ||
        (candle.close.split('.')[1]?.length ?? 0) > 36 ||
        !fp(candle.close).gt(fp(0))
    )
  )
    return empty;
  const start = Math.max(0, history.length - VISIBLE);
  const observations = history.slice(start).map((candle, offset) => {
    const evaluation = evaluateStrategyRules(rules, history.slice(0, start + offset + 1));
    return { candle, evaluation, outcome: ruleFlowOutcome(evaluation) };
  });
  const stops: number[] = [];
  observations.forEach((observation, index) => {
    if (
      index > 0 &&
      index < observations.length - 1 &&
      observation.outcome !== observations[index - 1].outcome &&
      stops.length < 4
    )
      stops.push(index);
  });
  return { source, observations, stops, durationMs: observations.length > 1 ? TRAVEL_MS + stops.length * HOLD_MS : 0 };
}

/** A smooth finite clock pauses at actual signal changes and never fabricates extra observations. */
export function ruleFlowFrame(model: RuleFlowModel, elapsedMs: number): RuleFlowFrame {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, Math.min(model.durationMs, elapsedMs)) : 0;
  const last = Math.max(0, model.observations.length - 1);
  let held = 0;
  for (const index of model.stops) {
    const at = (index / last) * TRAVEL_MS + held;
    if (elapsed >= at && elapsed < at + HOLD_MS)
      return { index, position: index, progress: index / last, complete: false, holding: true };
    if (elapsed >= at + HOLD_MS) held += HOLD_MS;
  }
  const progress = model.durationMs === 0 ? 1 : Math.min(1, (elapsed - held) / TRAVEL_MS);
  const position = progress * last;
  return {
    index: Math.min(last, Math.floor(position)),
    position,
    progress,
    complete: elapsed >= model.durationMs,
    holding: false,
  };
}

/** Preserve the evaluator's exact comparison values when selecting a condition. */
export function ruleFlowEvidence(
  observation: RuleFlowObservation,
  group: 'entry' | 'exit',
  index: number
): RuleEvidence | undefined {
  return (group === 'entry' ? observation.evaluation.entryConditions : observation.evaluation.exitConditions)[index];
}

/** Keep financial domains exact; convert only the final normalized screen position to floating point. */
function domain(values: readonly string[]): [FPNumber, FPNumber] {
  if (!values.length) return [fp(0), fp(1)];
  let low = fp(values[0]);
  let high = low;
  values.forEach((value) => {
    low = low.min(fp(value));
    high = high.max(fp(value));
  });
  let padding = high.sub(low).mul(fp('0.08'));
  if (padding.isZero()) padding = high.abs().mul(fp('0.01'));
  if (padding.isZero()) padding = fp(1);
  return [low.sub(padding), high.add(padding)];
}

/** Two aligned axes prevent percent indicators from being overlaid misleadingly on price units. */
export function ruleFlowTrace(
  model: RuleFlowModel,
  group: 'entry' | 'exit',
  index: number,
  width: number
): RuleFlowTrace {
  const safeWidth = Number.isFinite(width) ? Math.max(240, width) : 780;
  const observations = model.observations;
  const prices = domain(observations.map(({ candle }) => candle.close));
  const evidence = observations.map((observation) => ruleFlowEvidence(observation, group, index));
  const values = evidence.flatMap((item) =>
    item?.ready ? [item.value, item.threshold].filter((value): value is string => value !== null) : []
  );
  const indicator = domain(values);
  const x = (at: number) => 18 + (at / Math.max(1, observations.length - 1)) * (safeWidth - 36);
  const y = (value: string, bounds: [FPNumber, FPNumber], top: number, bottom: number) =>
    bottom - fp(value).sub(bounds[0]).div(bounds[1].sub(bounds[0])).toNumber(12) * (bottom - top);
  return {
    price: observations.map(({ candle }, at) => ({ x: x(at), y: y(candle.close, prices, 18, 92) })),
    value: evidence.map((item, at) =>
      item?.ready && item.value !== null ? { x: x(at), y: y(item.value, indicator, 120, 180) } : null
    ),
    threshold: evidence.map((item, at) =>
      item?.ready && item.threshold !== null ? { x: x(at), y: y(item.threshold, indicator, 120, 180) } : null
    ),
    priceDomain: [prices[0].toString(), prices[1].toString()],
    indicatorDomain: [indicator[0].toString(), indicator[1].toString()],
  };
}

/** Null warmup gaps break the path instead of implying observed values exist. */
export function ruleFlowPath(points: readonly (RuleFlowPoint | null)[]): string {
  let previous = false;
  return points
    .map((point) => {
      if (!point) {
        previous = false;
        return '';
      }
      const command = previous ? 'L' : 'M';
      previous = true;
      return `${command}${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    })
    .filter(Boolean)
    .join(' ');
}

/** Short exact-value labels retain the sign of tiny observations instead of rounding them into zero. */
export function formatRuleFlowValue(value: string | null | undefined, condition: RuleCondition | undefined): string {
  if (value === null || value === undefined) return '—';
  const amount = fp(value);
  const suffix = condition && !['trend', 'breakout'].includes(condition.kind) ? '%' : '';
  if (!amount.isZero() && amount.abs().lt(fp('0.0001'))) return `${amount.lt(fp(0)) ? '−' : '+'}<0.0001${suffix}`;
  return `${amount.dp(4, 4).toString()}${suffix}`;
}
