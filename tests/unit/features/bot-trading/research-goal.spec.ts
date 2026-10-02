import { describe, expect, it, vi } from 'vitest';
import { KUSD, XOR } from '@/lib/substrate/sdk/assets/consts';
import { toCodec } from '@/features/bot-trading/amounts';
import { requiredStrategyCandles } from '@/features/bot-trading/engine';
import { evaluateBotGoal } from '@/features/bot-trading/goals';
import {
  RESEARCH_DEFAULT_SETTINGS,
  createResearchBot,
  researchExecutionRejection,
  runResearch,
  runResearchAsync,
  type ResearchProgress,
  type ResearchCheck,
  type ResearchSettings,
  type ResearchSource,
} from '@/features/bot-trading/research';
import type { BotAsset, BotGoal } from '@/features/bot-trading/types';

const HOUR = 3_600_000;
const START = Date.UTC(2026, 8, 14);
const NOW = START + 48 * HOUR;
const assets: BotAsset[] = [KUSD, XOR].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));

/** Synthetic provider fixtures are isolated unit-test inputs, never market evidence. */
function source(prices: string[]): ResearchSource {
  return {
    kind: 'historical',
    history: {
      candles: prices.map((close, index) => ({ timestamp: START + index * HOUR, close })),
      missing: 0,
      denominationVerified: true,
    },
  };
}

/** Small exact allocations expose reserve and goal accounting in both denominations. */
function settings(patch: Partial<ResearchSettings> = {}): ResearchSettings {
  return {
    ...RESEARCH_DEFAULT_SETTINGS,
    assetInAddress: KUSD.address,
    assetOutAddress: XOR.address,
    capital: '10',
    feeBudgetXor: '1',
    tradePercent: 50,
    intervalHours: 1,
    intervalBlocks: undefined,
    historyStartAt: undefined,
    validation: 'none',
    optimize: false,
    networkFeeXor: '0.001',
    swapFeePercent: '0',
    sellNetworkFeeXor: undefined,
    sellSwapFeePercent: undefined,
    slippagePercent: '0.01',
    ...patch,
  };
}

/** Preserve the same whole-allocation target and durable peak-loss semantics as live trading. */
function goal(hours = 24): BotGoal {
  return {
    title: 'Grow XOR',
    durationMs: hours * HOUR,
    valuationAsset: 'output',
    lossMetric: 'drawdown',
    targetReturnPercent: '5',
    maxLossPercent: '5',
  };
}

describe('goal-aware research episodes', () => {
  it('funds at the first observation and refuses a pending fill exactly at expiry', () => {
    const history = source(['10', '10']);
    const run = runResearch(settings(), assets, history, NOW, { goal: goal(1) });
    expect(run.result.trades).toBe(0);
    expect(run.goalEvaluation).toEqual({
      goal: goal(1),
      fundingTimestamp: START,
      endingTimestamp: START + HOUR,
      state: {
        startedAt: START,
        baselineValue: '2',
        lastValue: '2',
        peakValue: '2',
        returnPercent: '0',
        outcome: 'expired',
        completedAt: START + HOUR,
      },
    });
    expect(run.candidates[0].checks.at(-1)).toEqual({
      key: 'goal',
      passed: false,
      reason: 'bots.errors.goalComplete',
    });
    expect(researchExecutionRejection(run.candidates[0])).toBeUndefined();
    expect(runResearch(settings(), assets, history, NOW).result.trades).toBe(1);
  });

  it.each([
    { prices: ['10', '10', '5', '20'], outcome: 'target', stoppedValue: '2.49895', endingInputValue: '34.979' },
    { prices: ['10', '10', '20', '5'], outcome: 'loss', stoppedValue: '1.74895', endingInputValue: '12.49475' },
  ])(
    'latches $outcome while valuing the actual exposed portfolio through the original endpoint',
    ({ prices, outcome, stoppedValue, endingInputValue }) => {
      const history = source(prices);
      const run = runResearch(settings(), assets, history, NOW, { goal: goal(3) });
      expect(run.result.trades).toBe(1);
      expect(run.result.portfolio.holdings[KUSD.address]).toBe(toCodec('5', KUSD.decimals));
      expect(run.result.portfolio.holdings[XOR.address]).toBe(toCodec('1.49895', XOR.decimals));
      expect(run.goalEvaluation!.state).toMatchObject({
        outcome,
        lastValue: stoppedValue,
        completedAt: START + 2 * HOUR,
      });
      expect(run.result.equity.at(-1)).toMatchObject({ timestamp: START + 3 * HOUR, value: endingInputValue });
      expect(run.result.equity.at(-1)!.value).not.toBe(run.result.equity.at(-2)!.value);
      expect(run.candidates.slice(1).every((candidate) => !candidate.selected)).toBe(true);
      expect(run.candidates.slice(1).map(researchExecutionRejection)).toEqual([undefined, undefined]);
      expect(run.goalEvaluation!.state).toEqual(
        evaluateBotGoal(
          {
            ...run.bot,
            portfolio: run.result.portfolio,
            goalState: run.goalEvaluation!.state,
          },
          START + 3 * HOUR,
          history.history.candles.at(-1)
        )
      );
    }
  );

  it.each([
    { networkFeeXor: '0.11', slippagePercent: '0.01' },
    { networkFeeXor: '0.09', slippagePercent: '3' },
  ])(
    'rejects fee-only or minimum-success loss breaches without persisting hypothetical loss ($networkFeeXor)',
    (costs) => {
      const run = runResearch(settings(costs), assets, source(['10', '10', '10']), NOW, { goal: goal(2) });
      expect(run.result.trades).toBe(0);
      expect(run.result.portfolio.holdings).toEqual(run.result.portfolio.initial);
      expect(run.result.portfolio.feesPaidCodec).toBe('0');
      expect(run.candidates[0].checks.filter((check) => check.key !== 'goal').every((check) => check.passed)).toBe(
        true
      );
      expect(run.candidates[0].checks.at(-1)).toEqual({
        key: 'goal',
        passed: false,
        reason: 'bots.errors.goalTradeCost',
      });
      expect(researchExecutionRejection(run.candidates[0])).toBe('goalTradeCost');
      expect(researchExecutionRejection(run.candidates[1])).toBeUndefined();
      expect(run.goalEvaluation!.state).toMatchObject({ outcome: 'expired', lastValue: '2', peakValue: '2' });
      expect(run.costs.networkFeeXor).toBe('0');
    }
  );

  it('preserves existing reserve gates without applying an invalid hypothetical fill', () => {
    const run = runResearch(
      settings({ networkFeeXor: '0.11', feeBudgetXor: '0.05' }),
      assets,
      source(['10', '10', '10']),
      NOW,
      { goal: goal(2) }
    );
    expect(run.result.trades).toBe(0);
    expect(run.candidates[0].checks.find((check) => check.key === 'feeBudget')!.passed).toBe(false);
    expect(run.candidates.map(researchExecutionRejection)).toEqual(['feeBudget', undefined]);
    expect(run.goalEvaluation!.state.outcome).toBe('expired');
  });

  it.each([
    { impact: '1.000000000000000001', passed: false, trades: 0 },
    { impact: '1', passed: true, trades: 1 },
  ])('enforces the live impact ceiling before a small partial fill ($impact%)', ({ impact, passed, trades }) => {
    const progress: ResearchProgress[] = [];
    const input = settings({ tradePercent: 10, priceImpactPercent: impact });
    const history = source(['10', '10', '10']);
    const run = runResearch(input, assets, history, NOW, {
      goal: goal(2),
      onProgress: (value) => progress.push(value),
    });
    expect(run.candidates[0].checks.find((check) => check.key === 'priceImpact')).toEqual({
      key: 'priceImpact',
      passed,
      actual: impact,
      limit: '1',
    });
    expect(run.candidates[0].checks.filter((check) => check.key !== 'priceImpact').every((check) => check.passed)).toBe(
      true
    );
    expect(run.result.trades).toBe(trades);
    expect(run.candidates.map(researchExecutionRejection)).toEqual([passed ? undefined : 'priceImpact', undefined]);
    expect(run.result.portfolio.feesPaidCodec).toBe(toCodec(trades ? '0.001' : '0', XOR.decimals));
    expect(progress.at(-1)!.gateTotals.priceImpact).toEqual(
      passed ? { passed: 2, rejected: 0 } : { passed: 0, rejected: 2 }
    );
    // The opt-in gate leaves the pre-existing research path and its progress shape unchanged.
    expect(runResearch(input, assets, history, NOW).result.trades).toBe(2);
  });

  it('requires exact contiguous hourly coverage and rejects truncated or extended episodes', () => {
    const input = settings();
    const history = source(Array(25).fill('10'));
    expect(runResearch(input, assets, history, NOW, { goal: goal() }).goalEvaluation!.endingTimestamp).toBe(
      START + 24 * HOUR
    );
    const invalid = [
      source(Array(24).fill('10')),
      source(Array(26).fill('10')),
      { ...history, history: { ...history.history, missing: 1 } },
      {
        ...history,
        history: { ...history.history, candles: history.history.candles.filter((_, index) => index !== 12) },
      },
      {
        ...history,
        history: {
          ...history.history,
          candles: history.history.candles.map((candle) => ({ ...candle, timestamp: candle.timestamp + 1 })),
        },
      },
    ];
    for (const observation of invalid)
      expect(() => runResearch(input, assets, observation, NOW, { goal: goal() })).toThrow('bots.errors.history');
    expect(() => runResearch(input, assets, history, NOW, { goal: { ...goal(), durationMs: 24 * HOUR + 1 } })).toThrow(
      'bots.errors.config'
    );
    expect(() => runResearch(settings({ optimize: true }), assets, history, NOW, { goal: goal() })).toThrow(
      'bots.errors.config'
    );
    expect(() => runResearch(settings({ validation: 'holdout' }), assets, history, NOW, { goal: goal() })).toThrow(
      'bots.errors.config'
    );
    expect(() => runResearch(input, assets, history, NOW, { goal: { ...goal(), maxLossPercent: '0' } })).toThrow(
      'bots.errors.goal'
    );
  });

  it('copies goals and keeps legacy result/progress shapes unchanged', () => {
    const requestedGoal = goal(2);
    const progress: ResearchProgress[] = [];
    const run = runResearch(settings(), assets, source(['10', '10', '10']), NOW, {
      goal: requestedGoal,
      onProgress: (value) => progress.push(value),
    });
    expect(run.bot.goal).toEqual(requestedGoal);
    expect(run.bot.goal).not.toBe(requestedGoal);
    expect(run.bot.goalState).toBeUndefined();
    expect(run.goalEvaluation!.goal).not.toBe(run.bot.goal);
    expect(progress.at(-1)!.gateTotals.goal).toEqual({ passed: 1, rejected: 1 });
    const legacyProgress: ResearchProgress[] = [];
    const legacy = runResearch(settings(), assets, source(['10', '10', '10']), NOW, {
      onProgress: (value) => legacyProgress.push(value),
    });
    expect(legacy).not.toHaveProperty('goalEvaluation');
    expect(legacy.bot).not.toHaveProperty('goal');
    expect(legacyProgress.at(-1)!.gateTotals).not.toHaveProperty('goal');
    expect(legacyProgress.at(-1)!.gateTotals).not.toHaveProperty('priceImpact');
    expect(legacy.candidates.every((candidate) => candidate.checks.length === 5)).toBe(true);
    expect(legacy.candidates.map(researchExecutionRejection)).toEqual([undefined, undefined]);
  });

  it('retains GO execution evidence without a progress consumer in the asynchronous fallback', async () => {
    const run = await runResearchAsync(settings({ priceImpactPercent: '2' }), assets, source(['10', '10', '10']), NOW, {
      goal: goal(2),
      awaitProgress: async () => undefined,
    });
    expect(run.candidates).toHaveLength(2);
    expect(run.candidates.map(researchExecutionRejection)).toEqual(['priceImpact', undefined]);
    expect(run.result.trades).toBe(0);
  });

  it('produces identical synchronous and asynchronous goal decisions and final accounting', async () => {
    const input = settings();
    const history = source(['10', '10', '5', '20']);
    const synchronous: ResearchProgress[] = [];
    const asynchronous: ResearchProgress[] = [];
    const expected = runResearch(input, assets, history, NOW, {
      goal: goal(3),
      onProgress: (value) => synchronous.push(value),
    });
    const actual = await runResearchAsync(input, assets, history, NOW, {
      goal: goal(3),
      onProgress: (value) => asynchronous.push(value),
      awaitProgress: async () => undefined,
    });
    expect(actual).toEqual(expected);
    expect(asynchronous).toEqual(synchronous);
  });

  it('uses only earlier warmup to initialize rules and preserves an externally frozen output ceiling', () => {
    const input = settings();
    const history = source(['10', '10', '10']);
    const strategy = createResearchBot(input, assets, NOW).strategy;
    strategy.kind = 'rules';
    strategy.rules = {
      version: 1,
      entry: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] },
      exit: null,
    };
    const warmup = [{ timestamp: START - HOUR, close: '5' }];
    const run = runResearch(input, assets, history, NOW, {
      strategy,
      goal: goal(2),
      warmupCandles: warmup,
      outputTradeLimitCodec: toCodec('0.3', XOR.decimals),
    });
    expect(run.tradeMarkers).toHaveLength(1);
    expect(run.tradeMarkers[0].timestamp).toBe(START + HOUR);
    expect(run.goalEvaluation!.state.startedAt).toBe(START);
    expect(run.goalEvaluation!.state.baselineValue).toBe('2');
    expect(run.bot.policy.maxTradeCodec[XOR.address]).toBe(toCodec('0.3', XOR.decimals));
    expect(run.goalEvaluation!.outputTradeLimitCodec).toBe(toCodec('0.3', XOR.decimals));
    expect(run.goalEvaluation!.warmupCandles).toEqual(warmup);
    expect(run.goalEvaluation!.warmupCandles).not.toBe(warmup);
    expect(run.goalEvaluation!.warmupCandles![0]).not.toBe(warmup[0]);
    run.goalEvaluation!.warmupCandles![0].close = '99';
    expect(runResearch(input, assets, history, NOW, { strategy, goal: goal(2) }).result.trades).toBe(0);
    expect(warmup).toEqual([{ timestamp: START - HOUR, close: '5' }]);
    for (const candles of [
      [{ timestamp: START, close: '5' }],
      [{ timestamp: START - 2 * HOUR, close: '5' }],
      Array.from({ length: 202 }, (_, index) => ({ timestamp: START - (202 - index) * HOUR, close: '5' })),
    ])
      expect(() => runResearch(input, assets, history, NOW, { goal: goal(2), warmupCandles: candles })).toThrow(
        'bots.errors.history'
      );
    const holdout = runResearch(input, assets, history, NOW, { strategy, warmupCandles: warmup });
    expect(holdout.tradeMarkers).toHaveLength(1);
    expect(holdout.tradeMarkers[0].timestamp).toBe(START + HOUR);
    expect(holdout.goalEvaluation).toBeUndefined();
    expect(() => runResearch(input, assets, history, NOW, { outputTradeLimitCodec: '1' })).toThrow(
      'bots.errors.config'
    );
    for (const amount of ['0', '-1', '1.1'])
      expect(() => runResearch(input, assets, history, NOW, { goal: goal(2), outputTradeLimitCodec: amount })).toThrow(
        'bots.errors.amount'
      );
  });

  it.each(['mad', 'return-quantile', 'restoring'] as const)(
    'starts a maximum-window %s rule at funding with 201 preceding closes and unchanged capital',
    (kind) => {
      const input = settings();
      const history = source(['10', '10', '10']);
      const strategy = createResearchBot(input, assets, NOW).strategy;
      strategy.kind = 'rules';
      strategy.rules = {
        version: 1,
        entry: {
          operator: 'all',
          conditions: [
            kind === 'return-quantile'
              ? { kind, window: 200, direction: 'above', percentile: 50 }
              : { kind, window: 200, direction: 'above', threshold: '0' },
          ],
        },
        exit: null,
      };
      const warmupCandles = Array.from({ length: 201 }, (_, index) => ({
        timestamp: START - (201 - index) * HOUR,
        close: index % 2 === 0 ? '5' : '10',
      }));
      const options = { strategy, goal: goal(2), warmupCandles, outputTradeLimitCodec: toCodec('0.3', 18) };
      expect(requiredStrategyCandles(strategy)).toBe(202);

      const run = runResearch(input, assets, history, NOW, options);
      expect(run.candidates[0]).toMatchObject({ signalTimestamp: START, selected: true });
      expect(run.tradeMarkers).toHaveLength(1);
      expect(run.tradeMarkers[0]).toMatchObject({ timestamp: START + HOUR, amount: '5' });
      expect(run.goalEvaluation).toMatchObject({
        goal: goal(2),
        fundingTimestamp: START,
        endingTimestamp: START + 2 * HOUR,
        state: { startedAt: START, baselineValue: '2' },
        outputTradeLimitCodec: toCodec('0.3', 18),
        warmupCandles,
      });
      expect(run.result.equity.slice(0, 2).map(({ value }) => value)).toEqual(['20', '20']);
      expect(run.result.portfolio.initial).toEqual({
        [KUSD.address]: toCodec('10', KUSD.decimals),
        [XOR.address]: toCodec('1', XOR.decimals),
      });
      expect(run.result.portfolio.holdings).toEqual({
        [KUSD.address]: toCodec('5', KUSD.decimals),
        [XOR.address]: toCodec('1.49895', XOR.decimals),
      });
      expect(run.result.portfolio.feesPaidCodec).toBe(toCodec('0.001', XOR.decimals));

      const short = runResearch(input, assets, history, NOW, {
        ...options,
        warmupCandles: warmupCandles.slice(1),
      });
      expect(short.candidates[0]).toMatchObject({ reason: 'bots.events.warmup', selected: false });
      expect(short.result.trades).toBe(0);
      expect(short.result.portfolio.holdings).toEqual(short.result.portfolio.initial);
      expect(short.goalEvaluation!.state.baselineValue).toBe('2');

      strategy.rules.entry.conditions[0].window = 201;
      expect(() => runResearch(input, assets, history, NOW, options)).toThrow('bots.errors.config');
    }
  );

  it.each(['10', '12'])(
    'starts SMA with live-equivalent empty signal state despite prior warmup at funding %s',
    (fundingPrice) => {
      const input = settings({ preset: 'sma', fastWindow: 2, slowWindow: 3 });
      const history = source([fundingPrice, '12', '12', '12']);
      const episodeGoal = { ...goal(3), maxLossPercent: '99', targetReturnPercent: '10000' };
      const warmupCandles = ['9', '9', '8'].map((close, index) => ({ timestamp: START - (3 - index) * HOUR, close }));
      const run = runResearch(input, assets, history, NOW, { goal: episodeGoal, warmupCandles });
      expect(run.tradeMarkers).toHaveLength(0);
      expect(
        run.candidates
          .slice(0, 2)
          .every((candidate) => candidate.reason === 'bots.events.noSignal' && !candidate.selected)
      ).toBe(true);
      expect(run.result.portfolio.holdings).toEqual(run.result.portfolio.initial);
      expect(run.result.portfolio.feesPaidCodec).toBe('0');
      expect(run.goalEvaluation!.state.startedAt).toBe(START);
      expect(run.result.equity[0].value).toBe(fundingPrice === '10' ? '20' : '22');
      expect(run.goalEvaluation!.warmupCandles).toEqual(warmupCandles);
      expect(run.bot.state.previousSignal).toBeUndefined();
      expect(runResearch(input, assets, history, NOW, { goal: episodeGoal }).result.trades).toBe(0);
    }
  );

  it('enforces the same supplied output ceiling on an actual sell candidate after a partial entry', () => {
    const input = settings();
    const history = source(['10', '8', '8', '8']);
    const strategy = createResearchBot(input, assets, NOW).strategy;
    strategy.kind = 'rules';
    strategy.rules = {
      version: 1,
      entry: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] },
      exit: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'below' }] },
    };
    const options = {
      strategy,
      goal: { ...goal(3), maxLossPercent: '99', targetReturnPercent: '10000' },
      warmupCandles: [{ timestamp: START - HOUR, close: '5' }],
    };
    const run = runResearch(input, assets, history, NOW, {
      ...options,
      outputTradeLimitCodec: toCodec('0.3', XOR.decimals),
    });
    expect(run.tradeMarkers.map((trade) => trade.action)).toEqual(['buy']);
    expect(run.candidates[1]).toMatchObject({ action: 'sell', selected: false });
    expect(run.candidates[1].checks.find((check) => check.key === 'tradeLimit')).toMatchObject({
      passed: false,
      limit: toCodec('0.3', XOR.decimals),
    });
    expect(runResearch(input, assets, history, NOW, options).tradeMarkers.map((trade) => trade.action)).toEqual([
      'buy',
      'sell',
    ]);
    const highSellImpact = runResearch(
      { ...input, priceImpactPercent: '0', sellPriceImpactPercent: '4' },
      assets,
      history,
      NOW,
      options
    );
    expect(highSellImpact.tradeMarkers.map((trade) => trade.action)).toEqual(['buy']);
    expect(highSellImpact.candidates[1]).toMatchObject({ action: 'sell', selected: false });
    expect(highSellImpact.candidates[1].checks.find((check) => check.key === 'priceImpact')).toEqual({
      key: 'priceImpact',
      passed: false,
      actual: '4',
      limit: '1',
    });
    expect(researchExecutionRejection(highSellImpact.candidates[0])).toBeUndefined();
    expect(researchExecutionRejection(highSellImpact.candidates[1])).toBe('priceImpact');
    expect(researchExecutionRejection(run.candidates[1])).toBeUndefined();
  });
});

describe('causal execution explanations', () => {
  /** Complete synthetic gate evidence isolates causal classification from replay arithmetic. */
  const candidate = () => ({
    selected: false,
    checks: (['signal', 'cooldown', 'balance', 'tradeLimit', 'feeBudget', 'priceImpact', 'goal'] as const).map(
      (key): ResearchCheck => ({ key, passed: key !== 'priceImpact' })
    ),
  });

  it('explains an isolated exhausted fee allowance without attributing other missing prerequisites to fees', () => {
    const evidence = candidate();
    for (const check of evidence.checks) check.passed = check.key !== 'feeBudget';
    expect(researchExecutionRejection(evidence)).toBe('feeBudget');
    for (const blocked of ['signal', 'cooldown', 'balance', 'tradeLimit', 'priceImpact', 'goal'] as const) {
      const checks = evidence.checks.map((check) => ({
        ...check,
        ...(check.key === blocked ? { passed: false } : {}),
      }));
      expect(researchExecutionRejection({ ...evidence, checks })).toBeUndefined();
    }
    expect(researchExecutionRejection({ ...evidence, selected: true })).toBeUndefined();
  });

  it.each(['signal', 'cooldown', 'balance', 'tradeLimit', 'feeBudget', 'goal'] as const)(
    'does not attribute impact to a proposal that also fails %s',
    (blocked) => {
      const evidence = candidate();
      evidence.checks.find((check) => check.key === blocked)!.passed = false;
      if (blocked === 'goal') evidence.checks.at(-1)!.reason = 'bots.errors.goalComplete';
      expect(researchExecutionRejection(evidence)).toBeUndefined();
    }
  );

  it('omits absent, inconsistent or duplicate checks instead of inferring causes from a rejected proposal', () => {
    const complete = candidate();
    expect(researchExecutionRejection(complete)).toBe('priceImpact');
    for (const evidence of [
      {},
      { ...complete, selected: true },
      { ...complete, checks: complete.checks.slice(1) },
      { ...complete, checks: [...complete.checks.slice(1), complete.checks[1]] },
      {
        ...complete,
        checks: complete.checks.map((check) => ({
          ...check,
          ...(check.key === 'goal' ? { reason: 'bots.errors.goalComplete' } : {}),
        })),
      },
      { ...complete, checks: Array(7) },
    ])
      expect(researchExecutionRejection(evidence)).toBeUndefined();
  });

  it.each(['selected', 'checks', 'check', 'key', 'passed', 'reason'] as const)(
    'does not invoke a %s accessor',
    (location) => {
      const evidence = candidate();
      const getter = vi.fn(() => false);
      if (location === 'selected' || location === 'checks') Object.defineProperty(evidence, location, { get: getter });
      else if (location === 'check') Object.defineProperty(evidence.checks, '0', { get: getter });
      else Object.defineProperty(evidence.checks[0], location, { get: getter });
      expect(researchExecutionRejection(evidence)).toBeUndefined();
      expect(getter).not.toHaveBeenCalled();
    }
  );
});
