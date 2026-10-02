import { describe, expect, it, vi } from 'vitest';
import {
  createHistoricalGoalLedger,
  markHistoricalGoalLedger,
  assessHistoricalGoalFill,
  applyHistoricalGoalFill,
  finalizeHistoricalGoalLedger,
  type HistoricalGoalLedgerState,
  type HistoricalGoalMark,
} from '../../../../scripts/bots/historical-goal-ledger';
import type { PaperFill } from '../../../../src/features/bot-trading/engine';
import { botFixture } from '../../features/bot-trading/fixtures';

const KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
const UNIT = 10n ** 18n;
const START = 1_800_000_000_000;
const DAY = 86_400_000;
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const units = (whole: number) => String(BigInt(whole) * UNIT);
const episode = () => ({ startedAtMs: START, endedAtMs: START + DAY });
const mark = (seconds = 0, xor = units(1000), kusd = units(1000)): HistoricalGoalMark => ({
  timestampMs: START + seconds * 1000,
  blockHash: hash(seconds + 1),
  kusdReserveCodec: kusd,
  xorReserveCodec: xor,
});

describe('historical goal terminal accounting', () => {
  const policy = () => ({ accountingAtMs: START + DAY, maximumAgeMs: 12_000 });
  const terminal = (ageMs = 6000, xor = units(1000)) => ({
    ...mark(0, xor),
    timestampMs: START + DAY - ageMs,
    blockHash: hash(99),
  });

  it('keeps the true observed timestamp and expires at the separate fixed deadline', () => {
    const initial = ledger();
    const inputMark = terminal();
    const result = finalizeHistoricalGoalLedger(initial, inputMark, policy());
    expect(result).toMatchObject({
      kind: 'historical-goal-terminal-accounting',
      accountingAtMs: START + DAY,
      observedAtMs: START + DAY - 6000,
      ageMs: 6000,
      maximumAgeMs: 12_000,
      outcome: 'expired',
      stoppedAtMs: START + DAY,
    });
    expect(result.lastMark).toEqual(inputMark);
    expect(result.episode).toEqual(initial.episode);
    expect(result.bot.portfolio).toEqual(initial.bot.portfolio);
    expect(initial.outcome).toBe('active');
    expect(initial.lastMark.timestampMs).toBe(START);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.lastMark)).toBe(true);
    expect(Object.isFrozen(result.bot.portfolio.holdings)).toBe(true);
    expect(JSON.parse(JSON.stringify(result)).observedAtMs).toBe(inputMark.timestampMs);
    expectRatio(result.latestValue, 11n * UNIT);
  });

  it.each([
    ['target', units(1055)],
    ['loss', units(945)],
  ] as const)('does not turn a terminal-only %s crossing into a retroactive stop', (_outcome, reserve) => {
    const result = finalizeHistoricalGoalLedger(ledger(), terminal(6000, reserve), policy());
    expect(result.outcome).toBe('expired');
    expect(result.stoppedAtMs).toBe(START + DAY);
    if (_outcome === 'loss') expectRatio(result.maximumDrawdownRatio, 1n, 20n);
    else expectRatio(result.performancePeakValue, 1155n * UNIT, 100n);
  });

  it.each([
    ['target', units(1055)],
    ['loss', units(945)],
  ] as const)(
    'preserves an observed earlier %s outcome and stop time while valuing retained holdings',
    (outcome, reserve) => {
      const stopped = markHistoricalGoalLedger(ledger(), mark(1, reserve));
      const result = finalizeHistoricalGoalLedger(stopped, terminal(6000, units(800)), policy());
      expect(result.outcome).toBe(outcome);
      expect(result.stoppedAtMs).toBe(START + 1000);
      expect(result.goalPeakValue).toEqual(stopped.goalPeakValue);
      expect(result.bot.portfolio).toEqual(stopped.bot.portfolio);
      expectRatio(result.latestValue, 9n * UNIT);
      expect(BigInt(result.maximumDrawdownRatio.numerator) * 20n).toBeGreaterThan(
        BigInt(result.maximumDrawdownRatio.denominator)
      );
    }
  );

  it('preserves paid fees, partial holdings, successful trades and failed-attempt counts without liquidation', () => {
    const bought = applyHistoricalGoalFill(ledger(), fill(), mark(1), 'minimum-output-success').state;
    const failed = applyHistoricalGoalFill(bought, fill(), mark(2), 'fee-only-failure').state;
    const result = finalizeHistoricalGoalLedger(failed, terminal(), policy());
    expect(result.bot.portfolio).toEqual(failed.bot.portfolio);
    expect(result.bot.portfolio.trades).toBe(1);
    expect(result.bot.portfolio.feesPaidCodec).toBe('20000000000000000');
    expect(result.scenarioFailures).toBe(1);
    expectRatio(result.latestValue, 10955n * UNIT, 1000n);
  });

  it('accepts exact maximum age and exact deadline observations but rejects stale, future or shifted endpoints', () => {
    expect(finalizeHistoricalGoalLedger(ledger(), terminal(12_000), policy()).ageMs).toBe(12_000);
    expect(finalizeHistoricalGoalLedger(ledger(), terminal(0), { ...policy(), maximumAgeMs: 0 }).ageMs).toBe(0);
    expect(() => finalizeHistoricalGoalLedger(ledger(), terminal(12_001), policy())).toThrow();
    expect(() => finalizeHistoricalGoalLedger(ledger(), terminal(-1), policy())).toThrow();
    expect(() =>
      finalizeHistoricalGoalLedger(ledger(), terminal(), { ...policy(), accountingAtMs: START + DAY + 1 })
    ).toThrow();
    for (const maximumAgeMs of [-1, 60_001, 0.5, Infinity, NaN])
      expect(() => finalizeHistoricalGoalLedger(ledger(), terminal(), { ...policy(), maximumAgeMs })).toThrow();
  });

  it('rejects an older mark or conflicting same-timestamp state without relabelling either one', () => {
    const current = markHistoricalGoalLedger(ledger(), terminal());
    expect(finalizeHistoricalGoalLedger(current, terminal(), policy()).lastMark).toEqual(current.lastMark);
    expect(() => finalizeHistoricalGoalLedger(current, { ...terminal(7000), blockHash: hash(98) }, policy())).toThrow();
    expect(() => finalizeHistoricalGoalLedger(current, { ...terminal(), blockHash: hash(98) }, policy())).toThrow();
    expect(() => finalizeHistoricalGoalLedger(current, terminal(6000, units(999)), policy())).toThrow();
    expect(() => finalizeHistoricalGoalLedger(current, terminal(5000), policy())).toThrow(); // Same hash cannot advance time.
  });

  it('cannot use a terminal result as a live state or re-finalize it, while original immutable aliases remain caller-owned', () => {
    const initial = ledger();
    const result = finalizeHistoricalGoalLedger(initial, terminal(), policy());
    const invalid = result as unknown as HistoricalGoalLedgerState;
    expect(() => markHistoricalGoalLedger(invalid, terminal())).toThrow();
    expect(() => assessHistoricalGoalFill(invalid, fill(), terminal())).toThrow();
    expect(() => applyHistoricalGoalFill(invalid, fill(), terminal(), 'minimum-output-success')).toThrow();
    expect(() => finalizeHistoricalGoalLedger(invalid, terminal(), policy())).toThrow();
    // This pure function does not revoke another holder's existing immutable state reference.
    expect(markHistoricalGoalLedger(initial, mark(1)).outcome).toBe('active');
  });

  it('rejects forged ledger state and accessor policy or mark fields without invoking getters', () => {
    const getter = vi.fn(() => 12_000);
    const inputPolicy = policy();
    Object.defineProperty(inputPolicy, 'maximumAgeMs', { enumerable: true, get: getter });
    expect(() => finalizeHistoricalGoalLedger(ledger(), terminal(), inputPolicy)).toThrow();
    const inputMark = terminal();
    Object.defineProperty(inputMark, 'timestampMs', { enumerable: true, get: getter });
    expect(() => finalizeHistoricalGoalLedger(ledger(), inputMark, policy())).toThrow();
    expect(() =>
      finalizeHistoricalGoalLedger(
        JSON.parse(JSON.stringify(ledger())) as HistoricalGoalLedgerState,
        terminal(),
        policy()
      )
    ).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
});
const bot = () => {
  const value = botFixture();
  value.mode = 'paper';
  value.assetIn = { address: KUSD, symbol: 'KUSD', decimals: 18 };
  value.assetOut = { address: XOR, symbol: 'XOR', decimals: 18 };
  value.policy = {
    maxTradeCodec: { [KUSD]: units(10), [XOR]: units(10) },
    slippagePercent: '0.5',
    maxPriceImpactPercent: '1',
    feeAsset: { ...value.assetOut },
    feeBudgetCodec: units(1),
    sessionDurationMs: DAY,
  };
  value.strategy.amount = '2.5';
  value.portfolio = {
    initial: { [KUSD]: units(10), [XOR]: units(1) },
    holdings: { [KUSD]: units(10), [XOR]: units(1) },
    feesPaidCodec: '0',
    trades: 0,
  };
  value.goal = {
    title: 'Grow XOR',
    durationMs: DAY,
    targetReturnPercent: '5',
    maxLossPercent: '5',
    valuationAsset: 'output',
    lossMetric: 'drawdown',
  };
  return value;
};
const ledger = () => createHistoricalGoalLedger(bot(), episode(), mark());
const fill = (overrides: Partial<PaperFill> = {}): PaperFill => ({
  inputAsset: KUSD,
  inputCodec: '2500000000000000000',
  outputAsset: XOR,
  outputCodec: '2475000000000000000',
  feeAsset: XOR,
  feeCodec: '10000000000000000',
  ...overrides,
});
const expectRatio = (value: { numerator: string; denominator: string }, numerator: bigint, denominator = 1n) =>
  expect(BigInt(value.numerator) * denominator).toBe(numerator * BigInt(value.denominator));

describe('exact historical goal ledger', () => {
  it('detaches and freezes its funded baseline without resetting any allocation or inventing a funding mark', () => {
    const source = bot();
    const opening = mark();
    const result = createHistoricalGoalLedger(source, episode(), opening);
    source.portfolio.holdings[KUSD] = '0';
    expect(result.bot.portfolio.holdings[KUSD]).toBe(units(10));
    expectRatio(result.openingValue, 11n * UNIT);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.bot.portfolio.holdings)).toBe(true);
    expect(Object.isFrozen(result.openingValue)).toBe(true);
    expect(JSON.parse(JSON.stringify(result)).openingValue).toEqual(result.openingValue);
    expect(() => createHistoricalGoalLedger(bot(), episode(), mark(1))).toThrow();
    expect(() => createHistoricalGoalLedger(bot(), { ...episode(), endedAtMs: START + DAY + 1 }, mark())).toThrow();
  });

  it('keeps nonterminating reserve ratios exact, including values smaller than one codec unit', () => {
    const result = createHistoricalGoalLedger(bot(), episode(), mark(0, '1', '3'));
    expectRatio(result.openingValue, 13n * UNIT, 3n);
    const tiny = bot();
    tiny.portfolio.initial[KUSD] = '2';
    tiny.portfolio.holdings[KUSD] = '2';
    tiny.policy.maxTradeCodec[KUSD] = '2';
    tiny.strategy.amount = '0.000000000000000001';
    expectRatio(createHistoricalGoalLedger(tiny, episode(), mark(0, '1', '3')).openingValue, 3n * UNIT + 2n, 3n);
  });

  it.each([
    ['target', units(1055)],
    ['loss', units(945)],
  ] as const)('stops at the exact five-percent %s threshold and preserves its stop time', (outcome, reserves) => {
    const stopped = markHistoricalGoalLedger(ledger(), mark(1, reserves));
    expect(stopped.outcome).toBe(outcome);
    expect(stopped.stoppedAtMs).toBe(START + 1000);
    const later = markHistoricalGoalLedger(stopped, mark(2));
    expect(later.outcome).toBe(outcome);
    expect(later.stoppedAtMs).toBe(stopped.stoppedAtMs);
    expect(later.openingValue).toEqual(stopped.openingValue);
    expect(later.goalPeakValue).toEqual(stopped.goalPeakValue);
    expect(later.bot.portfolio).toEqual(stopped.bot.portfolio);
  });

  it('does not round a one-reserve-atom subthreshold drawdown into a stop', () => {
    expect(markHistoricalGoalLedger(ledger(), mark(1, String(945n * UNIT + 1n))).outcome).toBe('active');
    expect(markHistoricalGoalLedger(ledger(), mark(1, String(945n * UNIT - 1n))).outcome).toBe('loss');
  });

  it('measures drawdown against the observed peak, not just the opening value', () => {
    const increased = markHistoricalGoalLedger(ledger(), mark(1, units(1044)));
    expect(increased.outcome).toBe('active');
    expectRatio(increased.goalPeakValue, 1144n * UNIT, 100n);
    // Peak 11.44, then 10.868: exactly a 5% peak loss, above a 5% opening loss.
    const result = markHistoricalGoalLedger(increased, mark(2, '986800000000000000000'));
    expect(result.outcome).toBe('loss');
    expectRatio(result.maximumDrawdownRatio, 1n, 20n);
  });

  it('continues independent performance and holdings marks after a target instead of liquidating or hiding losses', () => {
    const stopped = markHistoricalGoalLedger(ledger(), mark(1, units(1055)));
    const peak = markHistoricalGoalLedger(stopped, mark(2, units(1200)));
    const close = markHistoricalGoalLedger(peak, mark(DAY / 1000, units(900)));
    expect(close.outcome).toBe('target');
    expectRatio(close.latestValue, 10n * UNIT);
    expectRatio(close.performancePeakValue, 13n * UNIT);
    expectRatio(close.maximumDrawdownRatio, 3n, 13n);
    expectRatio(close.goalPeakValue, 1155n * UNIT, 100n);
    expect(close.bot.portfolio.holdings).toEqual(ledger().bot.portfolio.holdings);
  });

  it('expires at the fixed endpoint before recognizing a newly observed target; a missing endpoint stays incomplete for its caller', () => {
    const earlier = markHistoricalGoalLedger(ledger(), mark(DAY / 1000 - 1));
    expect(earlier.outcome).toBe('active');
    expect(earlier.lastMark.timestampMs).toBeLessThan(earlier.episode.endedAtMs);
    const closed = markHistoricalGoalLedger(earlier, mark(DAY / 1000, units(1100)));
    expect(closed.outcome).toBe('expired');
    expect(closed.stoppedAtMs).toBe(START + DAY);
    expect(assessHistoricalGoalFill(closed, fill(), closed.lastMark).rejection).toBe('goalComplete');
    expect(() => markHistoricalGoalLedger(closed, mark(DAY / 1000 + 1))).toThrow();
  });

  it('permits identical same-state pre/post marks but rejects time regression and contradictory state identity', () => {
    const current = markHistoricalGoalLedger(ledger(), mark(1));
    expect(markHistoricalGoalLedger(current, mark(1)).latestValue).toEqual(current.latestValue);
    for (const next of [
      mark(),
      { ...mark(1), blockHash: hash(99) },
      mark(1, units(999)),
      { ...mark(2), blockHash: current.lastMark.blockHash },
    ])
      expect(() => markHistoricalGoalLedger(current, next)).toThrow();
  });

  it('assesses both branches without crediting hypothetical holdings, then applies only one selected minimum-output scenario', () => {
    const initial = ledger();
    const assessment = assessHistoricalGoalFill(initial, fill(), mark(1));
    expect(assessment.rejection).toBeUndefined();
    expect(assessment.state.bot.portfolio).toEqual(initial.bot.portfolio);
    expectRatio(assessment.successValue!, 10965n * UNIT, 1000n);
    expectRatio(assessment.failureValue!, 1099n * UNIT, 100n);
    const result = applyHistoricalGoalFill(initial, fill(), mark(1), 'minimum-output-success');
    expect(result.state.bot.portfolio).toMatchObject({
      holdings: { [KUSD]: '7500000000000000000', [XOR]: '3465000000000000000' },
      feesPaidCodec: '10000000000000000',
      trades: 1,
    });
    expectRatio(result.state.latestValue, 10965n * UNIT, 1000n);
    expect(result.state.bot.state.lastTradeAt).toBe(START + 1000);
    expect(initial.bot.portfolio.holdings[KUSD]).toBe(units(10));
  });

  it('charges a failed attempt once without acquisition, a trade count or invented successful-fill cooldown', () => {
    const result = applyHistoricalGoalFill(ledger(), fill(), mark(1), 'fee-only-failure').state;
    expect(result.bot.portfolio).toMatchObject({
      holdings: { [KUSD]: units(10), [XOR]: '990000000000000000' },
      feesPaidCodec: '10000000000000000',
      trades: 0,
    });
    expect(result.scenarioFailures).toBe(1);
    expect(result.bot.state.lastTradeAt).toBe(0);
  });

  it('rejects exact five-percent projected success cost and separately rejects fee-only loss despite profitable output', () => {
    const costly = fill({ outputCodec: '2050000000000000000', feeCodec: '100000000000000000' });
    expect(assessHistoricalGoalFill(ledger(), costly, mark(1)).rejection).toBe('goalTradeCost');
    const oneAtomSafer = { ...costly, outputCodec: String(BigInt(costly.outputCodec) + 1n) };
    expect(assessHistoricalGoalFill(ledger(), oneAtomSafer, mark(1)).rejection).toBeUndefined();
    const failureCost = fill({ outputCodec: units(4), feeCodec: '550000000000000000' });
    const result = applyHistoricalGoalFill(ledger(), failureCost, mark(1), 'minimum-output-success');
    expect(result.rejection).toBe('goalTradeCost');
    expect(result.state.bot.portfolio.feesPaidCodec).toBe('0');
    expect(result.state.latestValue).toEqual(result.state.openingValue);
  });

  it('marks and stops before a pending fill even when that hypothetical fill could repair the portfolio', () => {
    const result = applyHistoricalGoalFill(
      ledger(),
      fill({ outputCodec: units(9) }),
      mark(1, units(945)),
      'minimum-output-success'
    );
    expect(result.rejection).toBe('goalComplete');
    expect(result.state.outcome).toBe('loss');
    expect(result.state.bot.portfolio.feesPaidCodec).toBe('0');
  });

  it('sells exact acquired XOR only, protecting the remaining reserve without subtracting the new fee twice', () => {
    const bought = applyHistoricalGoalFill(ledger(), fill(), mark(1), 'minimum-output-success').state;
    const sell = fill({
      inputAsset: XOR,
      inputCodec: '2475000000000000000',
      outputAsset: KUSD,
      outputCodec: '2460000000000000000',
      feeCodec: '20000000000000000',
    });
    expect(assessHistoricalGoalFill(bought, { ...sell, inputCodec: '2475000000000000001' }, mark(2)).rejection).toBe(
      'balance'
    );
    const sold = applyHistoricalGoalFill(bought, sell, mark(2), 'minimum-output-success').state;
    expect(sold.bot.portfolio).toMatchObject({
      holdings: { [KUSD]: '9960000000000000000', [XOR]: '970000000000000000' },
      feesPaidCodec: '30000000000000000',
      trades: 2,
    });
    expect(assessHistoricalGoalFill(sold, { ...sell, inputCodec: '1' }, mark(3)).rejection).toBe('balance');
    expect(assessHistoricalGoalFill(bought, { ...sell, feeCodec: units(1) }, mark(2)).rejection).toBe('feeBudget');
  });

  it('preserves partial input and explicit sell ceilings rather than converting all capital or expanding a policy', () => {
    expect(assessHistoricalGoalFill(ledger(), fill({ inputCodec: units(10) }), mark(1)).rejection).toBe('tradeLimit');
    const template = bot();
    template.policy.maxTradeCodec[KUSD] = units(2);
    expect(
      assessHistoricalGoalFill(createHistoricalGoalLedger(template, episode(), mark()), fill(), mark(1)).rejection
    ).toBe('tradeLimit');
    const limited = bot();
    limited.policy.maxTradeCodec[XOR] = units(1);
    const bought = applyHistoricalGoalFill(
      createHistoricalGoalLedger(limited, episode(), mark()),
      fill(),
      mark(1),
      'minimum-output-success'
    ).state;
    expect(
      assessHistoricalGoalFill(bought, fill({ inputAsset: XOR, outputAsset: KUSD, inputCodec: units(2) }), mark(2))
        .rejection
    ).toBe('tradeLimit');
  });

  it('rejects larger funding, reused progress, wrong precision, relaxed limits and prefunded profits', () => {
    const changes: ((value: ReturnType<typeof bot>) => void)[] = [
      (value) => {
        value.portfolio.initial[KUSD] = units(11);
        value.portfolio.holdings[KUSD] = units(11);
      },
      (value) => {
        value.portfolio.holdings[XOR] = units(2);
      },
      (value) => {
        value.portfolio.feesPaidCodec = '1';
      },
      (value) => {
        value.assetOut.decimals = 6;
      },
      (value) => {
        value.policy.maxPriceImpactPercent = '3';
      },
      (value) => {
        value.goal!.maxLossPercent = '6';
      },
      (value) => {
        value.policy.feeBudgetCodec = units(2);
      },
      (value) => {
        value.strategy.amount = '10';
      },
      (value) => {
        value.state.lastTradeAt = START - 1000;
      },
      (value) => {
        value.state.previousSignal = 1;
      },
      (value) => {
        value.goalState = {
          startedAt: START,
          baselineValue: '11',
          lastValue: '11',
          peakValue: '11',
          returnPercent: '0',
          outcome: 'active',
        };
      },
    ];
    for (const change of changes) {
      const template = bot();
      change(template);
      expect(() => createHistoricalGoalLedger(template, episode(), mark())).toThrow();
    }
  });

  it('rejects forged states, accessors, prototypes, sparse arrays and noncanonical/u128-overflow amounts without executing getters', () => {
    const getter = vi.fn(() => units(1000));
    const accessor = { ...mark() };
    Object.defineProperty(accessor, 'kusdReserveCodec', { enumerable: true, get: getter });
    expect(() => createHistoricalGoalLedger(bot(), episode(), accessor)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(() =>
      markHistoricalGoalLedger(JSON.parse(JSON.stringify(ledger())) as HistoricalGoalLedgerState, mark(1))
    ).toThrow();
    expect(() => createHistoricalGoalLedger(Object.create(bot()), episode(), mark())).toThrow();
    const sparse = bot();
    sparse.activity = new Array(2);
    expect(() => createHistoricalGoalLedger(sparse, episode(), mark())).toThrow();
    for (const reserve of ['0', '-1', '01', '1e3', '1.5', String(1n << 128n)])
      expect(() => createHistoricalGoalLedger(bot(), episode(), mark(0, reserve))).toThrow();
    expect(() => assessHistoricalGoalFill(ledger(), fill({ feeCodec: '0' }), mark(1))).toThrow();
    expect(() => applyHistoricalGoalFill(ledger(), fill(), mark(1), 'other' as 'minimum-output-success')).toThrow();
  });
});
