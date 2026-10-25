/** Fixed, market-value-free requests for one development episode; targets are not observed fills. */
import {
  planHistoricalExecutionClock,
  type HistoricalClockEpisode,
  type HistoricalClockPolicy,
  type HistoricalHourSignal,
} from './historical-execution-clock';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Sampling assumptions must be declared before any outcomes are read. */
export interface HistoricalGoalValuationPolicy {
  cadenceMs: number;
  maximumLagMs: number;
}

/** Read only exact own data fields, without invoking rejected accessors. */
function fields(value: unknown, expected: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype)
    throw new Error('Invalid historical goal schedule');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (
    Reflect.ownKeys(descriptors).length !== expected.length ||
    expected.some(
      (key) => !Object.hasOwn(descriptors, key) || !descriptors[key].enumerable || !('value' in descriptors[key])
    )
  )
    throw new Error('Invalid historical goal schedule');
  return Object.fromEntries(expected.map((key) => [key, descriptors[key].value]));
}

/**
 * Preserve all 24 hourly signal opportunities and every predetermined valuation request. Funding and
 * terminal marks require the exact fixed endpoint; a missing endpoint never shifts the episode.
 * Other marks use the first canonical block at/after the target within the explicit lag bound.
 * The consumer must merge resolved actual block times before replay; target order is not execution order.
 */
export function planHistoricalGoalSchedule(
  signals: readonly HistoricalHourSignal[],
  clock: HistoricalClockPolicy,
  episode: HistoricalClockEpisode,
  valuation: HistoricalGoalValuationPolicy
) {
  const funded = fields(episode, ['startedAtMs', 'endedAtMs']);
  const sample = fields(valuation, ['cadenceMs', 'maximumLagMs']);
  const start = funded.startedAtMs as number;
  const end = funded.endedAtMs as number;
  const cadence = sample.cadenceMs as number;
  const lag = sample.maximumLagMs as number;
  if (
    ![start, end, cadence, lag].every(Number.isSafeInteger) ||
    start < HOUR ||
    start % HOUR ||
    end - start !== DAY ||
    cadence < 6000 ||
    cadence > HOUR ||
    DAY % cadence ||
    lag < 0 ||
    lag >= cadence ||
    !Array.isArray(signals) ||
    signals.length !== 24 ||
    Reflect.ownKeys(signals).length !== 25
  )
    throw new Error('Invalid historical goal schedule');

  const plans = Array.from({ length: 24 }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(signals, String(index));
    if (!descriptor?.enumerable || !('value' in descriptor)) throw new Error('Invalid historical goal schedule');
    const plan = planHistoricalExecutionClock(descriptor.value, clock, { startedAtMs: start, endedAtMs: end });
    if (plan.signal.completedAtMs !== start + index * HOUR)
      throw new Error('Historical signals must retain every funded hour in order');
    if (plan.targetExecutionAtMs + plan.policy.maximumExecutionLagMs >= end)
      throw new Error('Historical execution lag extends beyond the fixed episode');
    return plan;
  });
  const identities = new Map<number, HistoricalHourSignal['closing']>();
  const heights = new Map<string, number>();
  for (const plan of plans) {
    for (const block of [plan.signal.closing, plan.signal.successor]) {
      const known = identities.get(block.height);
      const height = heights.get(block.hash);
      if (
        (height !== undefined && height !== block.height) ||
        (known &&
          (known.hash !== block.hash ||
            known.parentHash !== block.parentHash ||
            known.timestampMs !== block.timestampMs))
      )
        throw new Error('Contradictory historical block identity');
      identities.set(block.height, block);
      heights.set(block.hash, block.height);
    }
  }
  for (const block of identities.values()) {
    const parent = identities.get(block.height - 1);
    if (parent && block.parentHash !== parent.hash) throw new Error('Contradictory historical parent identity');
  }
  for (let index = 1; index < plans.length; index++) {
    const previous = plans[index - 1].signal;
    const current = plans[index].signal;
    if (
      current.closing.height < previous.successor.height ||
      current.closing.timestampMs < previous.successor.timestampMs ||
      current.successor.hash === previous.successor.hash ||
      current.successor.hash === previous.closing.hash ||
      (current.closing.height === previous.successor.height &&
        (current.closing.hash !== previous.successor.hash ||
          current.closing.parentHash !== previous.successor.parentHash ||
          current.closing.timestampMs !== previous.successor.timestampMs)) ||
      (current.closing.height > previous.successor.height &&
        (current.closing.hash === previous.successor.hash ||
          current.closing.hash === previous.closing.hash ||
          current.closing.timestampMs <= previous.successor.timestampMs))
    )
      throw new Error('Contradictory historical signal ordering');
  }
  const valuations = Object.freeze(
    Array.from({ length: DAY / cadence + 1 }, (_, index) => {
      const targetAtMs = start + index * cadence;
      const endpoint = targetAtMs === start || targetAtMs === end;
      return Object.freeze({
        kind:
          targetAtMs === start
            ? ('funding' as const)
            : targetAtMs === end
              ? ('terminal' as const)
              : ('valuation' as const),
        targetAtMs,
        maximumLagMs: endpoint ? 0 : Math.min(lag, end - targetAtMs),
        selection: endpoint ? ('exact-timestamp' as const) : ('first-canonical-at-or-after' as const),
      });
    })
  );
  return Object.freeze({
    protocol: 'goal-execution-schedule-v3-development' as const,
    purpose: 'development' as const,
    episode: Object.freeze({ startedAtMs: start, endedAtMs: end }),
    valuationPolicy: Object.freeze({ cadenceMs: cadence, maximumLagMs: lag }),
    executions: Object.freeze(plans),
    valuations,
    valuationContinuesAfterStop: true as const,
    missingEvidence: 'retain-incomplete-no-replacement' as const,
    observedFill: false as const,
    transactionSubmitted: false as const,
  });
}
