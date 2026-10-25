/** Engineering-only rational scenarios. No input data, qualification, network, storage or wallet authority. */
import {
  assessGoalExactFill,
  createGoalExactLedger,
  markGoalExactLedger,
  settleGoalExactLedger,
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
  GOAL_EXACT_POLICY,
  type GoalExactLedgerState,
  type GoalExactMark,
  type GoalExactRatio,
} from '../../src/features/bot-trading/goal-exact-ledger';
import { evaluateStrategyRules, type StrategyRules } from '../../src/features/bot-trading/strategy-rules';

const UNIT = 10n ** 18n,
  START = 201 * 3600000,
  MINUTE = 60000,
  INITIAL = 10n * UNIT,
  BUY = 5n * UNIT,
  SELL = UNIT;
type Policy = 'passive' | 'delayed-entry' | 'partial-target';
type Point = readonly [minute: number, xorPerKusdBasisPoints: number];
type Scenario = {
  id: string;
  points: readonly Point[];
  publicationDelayMinutes: number;
  fee: 'ordinary' | 'failure-boundary' | 'success-boundary' | 'inside-boundary';
  failFirstAttempt: boolean;
};
const rules: StrategyRules = {
  version: 1,
  entry: { operator: 'all', conditions: [{ kind: 'deviation', window: 200, direction: 'below', threshold: '-25' }] },
  exit: { operator: 'all', conditions: [{ kind: 'deviation', window: 200, direction: 'above', threshold: '25' }] },
};
/** Round rational engineering cases declared independently of any historical observations. */
const declarations: readonly [string, readonly Point[], number, Scenario['fee'], boolean][] = [
  [
    'flat',
    [
      [0, 10000],
      [1440, 10000],
    ],
    1,
    'ordinary',
    false,
  ],
  [
    'xor-strengthens',
    [
      [0, 10000],
      [600, 9000],
      [1440, 9000],
    ],
    1,
    'ordinary',
    false,
  ],
  [
    'xor-weakens',
    [
      [0, 10000],
      [600, 11000],
      [1440, 11000],
    ],
    1,
    'ordinary',
    false,
  ],
  [
    'reversal',
    [
      [0, 10000],
      [600, 9400],
      [1200, 10000],
      [1440, 10000],
    ],
    1,
    'ordinary',
    false,
  ],
  [
    'jump-before-decision',
    [
      [0, 10000],
      [1, 9400],
      [1440, 9400],
    ],
    2,
    'ordinary',
    false,
  ],
  [
    'publication-delay',
    [
      [0, 10000],
      [30, 9400],
      [1440, 9400],
    ],
    31,
    'ordinary',
    false,
  ],
  [
    'fee-only-failure',
    [
      [0, 10000],
      [1440, 10000],
    ],
    1,
    'ordinary',
    true,
  ],
  [
    'failure-headroom-boundary',
    [
      [0, 10000],
      [1440, 10000],
    ],
    1,
    'failure-boundary',
    false,
  ],
  [
    'success-headroom-boundary',
    [
      [0, 10000],
      [1440, 10000],
    ],
    1,
    'success-boundary',
    false,
  ],
  [
    'inside-headroom-boundary',
    [
      [0, 10000],
      [1440, 10000],
    ],
    1,
    'inside-boundary',
    false,
  ],
];
const scenarios: readonly Scenario[] = declarations.map(
  ([id, points, publicationDelayMinutes, fee, failFirstAttempt]) => ({
    id,
    points,
    publicationDelayMinutes,
    fee,
    failFirstAttempt,
  })
);
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
function assert(value: unknown, reason: string): asserts value {
  if (!value) throw Error(`synthetic-reachability:${reason}`);
}
function freeze<T>(value: T): Readonly<T> {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function ratio(numerator: bigint, denominator: bigint): GoalExactRatio {
  let a = numerator < 0n ? -numerator : numerator,
    b = denominator;
  while (b) [a, b] = [b, a % b];
  return { numerator: String(numerator / (a || 1n)), denominator: String(denominator / (a || 1n)) };
}
function subtract(a: GoalExactRatio, b: GoalExactRatio): GoalExactRatio {
  return ratio(
    BigInt(a.numerator) * BigInt(b.denominator) - BigInt(b.numerator) * BigInt(a.denominator),
    BigInt(a.denominator) * BigInt(b.denominator)
  );
}
function aboveFloor(value: GoalExactRatio, peak: GoalExactRatio): boolean {
  return (
    BigInt(value.numerator) * BigInt(peak.denominator) * 100n > BigInt(peak.numerator) * BigInt(value.denominator) * 95n
  );
}
/** Piecewise linear integer-basis-point marks; amounts and interpolation never use floating point. */
function price(scenario: Scenario, minute: number): bigint {
  if (minute < 0) return 10000n;
  for (let i = 1; i < scenario.points.length; i++) {
    const [end, to] = scenario.points[i],
      [start, from] = scenario.points[i - 1];
    if (minute <= end) return BigInt(from) + (BigInt(to - from) * BigInt(minute - start)) / BigInt(end - start);
  }
  return BigInt(scenario.points.at(-1)![1]);
}
function mark(scenario: Scenario, minute: number): GoalExactMark {
  return {
    blockHash: hash(1000 + minute),
    blockNumber: 1000 + minute,
    timestampMs: START + minute * MINUTE,
    denominator: '1',
    kusdReserveCodec: String(10000n * UNIT),
    xorReserveCodec: String(price(scenario, minute) * UNIT),
  };
}
function opening(scenario: Scenario, policy: Policy) {
  return createGoalExactLedger(
    {
      goalId: `synthetic-${scenario.id}-${policy}`,
      startedAtMs: START,
      initialKusdCodec: String(INITIAL),
      maxTradeKusdCodec: String(BUY),
      maxTradeXorCodec: String(SELL),
    },
    mark(scenario, 0)
  );
}
/** Real production rule evaluator receives only the 200 available completed closes. */
function delayedDirection(scenario: Scenario, hour: number) {
  const candles = Array.from({ length: 200 }, (_, i) => {
    const completedHour = hour - 199 + i,
      scaled = (10000n * 10n ** 36n) / price(scenario, completedHour * 60 - 1),
      whole = scaled / 10n ** 36n,
      fraction = (scaled % 10n ** 36n).toString().padStart(36, '0');
    return { timestamp: START + completedHour * 3600000, close: `${whole}.${fraction}` };
  });
  const result = evaluateStrategyRules(rules, candles);
  assert(result.ready, 'rule-warmup');
  return result.exit ? 'sell' : result.entry ? 'buy' : 'hold';
}
/** Explicit engineering baseline: inventory outside the illustrative 40–60% KUSD value band steps toward 50%. */
function targetDirection(state: GoalExactLedgerState) {
  const k = BigInt(state.holdings.kusdCodec),
    x = BigInt(state.holdings.xorCodec),
    rk = BigInt(state.lastMark.kusdReserveCodec),
    rx = BigInt(state.lastMark.xorReserveCodec),
    kusdValue = k * rx,
    total = kusdValue + x * rk;
  return kusdValue * 5n > total * 3n ? 'buy' : kusdValue * 5n < total * 2n ? 'sell' : 'hold';
}
function fee(scenario: Scenario): bigint {
  const openingHeadroom = ((INITIAL + UNIT) * 5n) / 100n,
    minimumOutputLoss = (BUY * 50n) / 10000n;
  if (scenario.fee === 'failure-boundary') return openingHeadroom;
  if (scenario.fee === 'success-boundary') return openingHeadroom - minimumOutputLoss;
  if (scenario.fee === 'inside-boundary') return openingHeadroom - minimumOutputLoss - UNIT / 1000n;
  return UNIT / 100n;
}
export interface SyntheticReachabilityEvent {
  minute: number;
  kind: 'decision' | 'proposal' | 'latch';
  action?: 'hold' | 'buy' | 'sell';
  reason?: string;
  inputCodec?: string;
  feeCodec?: string;
  success?: boolean;
  successInsideHeadroom?: boolean;
  failureInsideHeadroom?: boolean;
  outcome?: GoalExactLedgerState['outcome'];
}
function replay(scenario: Scenario, policy: Policy) {
  let state = opening(scenario, policy),
    consumedHour = -1,
    attempts = 0;
  const events: SyntheticReachabilityEvent[] = [];
  let firstDecision: number | null = null,
    firstProposal: number | null = null,
    firstFill: number | null = null;
  const latch = (previous: GoalExactLedgerState, next: GoalExactLedgerState, minute: number) => {
    if (previous.outcome === 'active' && next.outcome !== 'active')
      events.push({ minute, kind: 'latch', outcome: next.outcome });
    if (previous.outcome !== 'active') {
      assert(next.outcome === previous.outcome && next.stoppedAtMs === previous.stoppedAtMs, 'latch-reset');
      assert(JSON.stringify(next.goalPeakValue) === JSON.stringify(previous.goalPeakValue), 'peak-reset');
    }
  };
  for (let minute = 0; minute <= 1440; minute++) {
    const previous = state,
      current = mark(scenario, minute);
    state = markGoalExactLedger(state, {
      expectedRevision: state.revision,
      accountingAtMs: current.timestampMs,
      mark: current,
    });
    latch(previous, state, minute);
    if (minute === 1440 || state.outcome !== 'active') continue;
    const hour = Math.floor(minute / 60);
    if (hour === consumedHour || minute % 60 < scenario.publicationDelayMinutes) continue;
    consumedHour = hour;
    firstDecision ??= minute;
    const action =
      policy === 'passive'
        ? 'hold'
        : policy === 'delayed-entry'
          ? delayedDirection(scenario, hour)
          : targetDirection(state);
    events.push({ minute, kind: 'decision', action });
    if (action === 'hold') continue;
    const reserve = UNIT - BigInt(state.feesPaidCodec),
      available = action === 'buy' ? BigInt(state.holdings.kusdCodec) : BigInt(state.holdings.xorCodec) - reserve,
      lot = action === 'buy' ? BUY : SELL,
      input = available < lot ? available : lot;
    if (input <= 0n) {
      events.push({ minute, kind: 'proposal', action, reason: 'no-spendable-allocation' });
      continue;
    }
    assert(input < INITIAL && input <= lot, 'full-budget-or-resized-lot');
    assert(input === lot || input === available, 'not-inventory-capped');
    if (action === 'sell') assert(input <= BigInt(state.holdings.xorCodec) - reserve, 'reserve-sale');
    firstProposal ??= minute;
    const quoted =
        action === 'buy' ? (input * price(scenario, minute)) / 10000n : (input * 10000n) / price(scenario, minute),
      fill = {
        inputAsset: action === 'buy' ? KUSD : XOR,
        outputAsset: action === 'buy' ? XOR : KUSD,
        inputCodec: String(input),
        minimumOutputCodec: String((quoted * 9950n) / 10000n),
        feeCeilingCodec: String(fee(scenario)),
      };
    const assessed = assessGoalExactFill(state, {
      expectedRevision: state.revision,
      accountingAtMs: current.timestampMs,
      mark: current,
      fill,
    });
    const event: SyntheticReachabilityEvent = {
      minute,
      kind: 'proposal',
      action,
      inputCodec: String(input),
      feeCodec: fill.feeCeilingCodec,
      ...(assessed.minimumSuccessValue
        ? { successInsideHeadroom: aboveFloor(assessed.minimumSuccessValue, assessed.state.goalPeakValue) }
        : {}),
      ...(assessed.feeOnlyFailureValue
        ? { failureInsideHeadroom: aboveFloor(assessed.feeOnlyFailureValue, assessed.state.goalPeakValue) }
        : {}),
    };
    events.push(event);
    state = assessed.state;
    if (assessed.rejection) {
      event.reason = assessed.rejection;
      continue;
    }
    assert(event.successInsideHeadroom && event.failureInsideHeadroom, 'cost-gate-bypass');
    assert(state.outcome === 'active', 'post-latch-trade');
    const success = !(scenario.failFirstAttempt && attempts === 0),
      before = state;
    attempts++;
    state = settleGoalExactLedger(state, {
      expectedRevision: state.revision,
      accountingAtMs: current.timestampMs,
      mark: current,
      orderId: `invented-${minute}`,
      receipt: {
        blockHash: current.blockHash,
        blockNumber: current.blockNumber,
        extrinsicHash: hash(100000 + minute),
        extrinsicIndex: 0,
      },
      fill,
      success,
      actualOutputCodec: success ? fill.minimumOutputCodec : '0',
      actualFeeCodec: fill.feeCeilingCodec,
    }).state;
    event.success = success;
    event.reason = success ? 'synthetic-minimum-output-fill' : 'synthetic-fee-only-failure';
    if (success) firstFill ??= minute;
    latch(before, state, minute);
    assert(
      state.attention.length === 0 && BigInt(state.holdings.xorCodec) >= UNIT - BigInt(state.feesPaidCodec),
      'accounting-invariant'
    );
  }
  return {
    policy,
    firstEligibleMinute: scenario.publicationDelayMinutes,
    firstDecisionMinute: firstDecision,
    firstProposalMinute: firstProposal,
    firstFillMinute: firstFill,
    firstLatch: events.find((event) => event.kind === 'latch') ?? null,
    fills: state.trades,
    failures: state.failures,
    feesPaidCodec: state.feesPaidCodec,
    endingValue: state.latestValue,
    maximumDrawdown: state.maximumDrawdownRatio,
    holdings: state.holdings,
    outcome: state.outcome,
    events,
  };
}

/** Run the fixed declared feasibility cases; exact ratios are XOR codec units, never claimed realized returns. */
export function runGoalSyntheticReachability() {
  const cases = scenarios.map((scenario) => {
    const policies = (['passive', 'delayed-entry', 'partial-target'] as const).map((policy) =>
      replay(scenario, policy)
    );
    return {
      scenario,
      feeCodec: String(fee(scenario)),
      policies: policies.map((result) => ({
        ...result,
        excessOverPassive: subtract(result.endingValue, policies[0].endingValue),
      })),
    };
  });
  return freeze({
    kind: 'synthetic-goal-reachability-v1',
    engineeringOnly: true,
    qualificationEligible: false,
    realDataRead: false,
    networkAttempts: 0,
    transactionsSubmitted: 0,
    policy: GOAL_EXACT_POLICY,
    initialKusdCodec: String(INITIAL),
    protectedInitialXorCodec: String(UNIT),
    buyLotCodec: String(BUY),
    sellLotCodec: String(SELL),
    assumptions: {
      observationMs: MINUTE,
      decisionMs: 60 * MINUTE,
      syntheticCombinedQuoteHaircutBasisPoints: 50,
      targetKusdWeight: '1/2',
      noTradeKusdWeight: ['2/5', '3/5'],
      priorCloses: 200,
      execution: 'same-mark invented minimum output or fee-only failure; no market feedback',
      result: 'reachability only; not profitability, qualification, observed fills or a hard loss guarantee',
    },
    cases,
  });
}
