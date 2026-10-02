import { describe, expect, it } from 'vitest';
import { FPNumber } from '@/lib/substrate/math';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { toCodec } from '@/features/bot-trading/amounts';
import {
  describeNetworkFeeLossPressure,
  describeOpeningResearchFee,
  openingResearchDrawdown,
} from '@/features/bot-trading/autopilot-feasibility';
import { decimalRatio, portfolioPerformance } from '@/features/bot-trading/engine';
import { assessGoalTradeAdmission } from '@/features/bot-trading/goalAdmission';
import { evaluateBotGoal } from '@/features/bot-trading/goals';
import { createResearchBot, RESEARCH_DEFAULT_SETTINGS, runResearch } from '@/features/bot-trading/research';
import type { BotCandle, BotDefinition } from '@/features/bot-trading/types';
import { botFixture } from './fixtures';

const HOUR = 3_600_000;
const goal = { valuationAsset: 'output' as const, maxLossPercent: '5' };
const pair = (first: string, second: string): [BotCandle, BotCandle] => [
  { timestamp: HOUR, close: first },
  { timestamp: 2 * HOUR, close: second },
];

/** Reproduce the disclosed allocation with exact codec balances, without importing a wallet. */
function kusdXor(): BotDefinition {
  const bot = botFixture();
  bot.assetIn = { address: 'kusd', symbol: 'KUSD', decimals: 18 };
  bot.assetOut = { address: 'xor', symbol: 'XOR', decimals: 18 };
  bot.policy.feeAsset = { ...bot.assetOut };
  bot.policy.feeBudgetCodec = toCodec('1', 18);
  const initial = { kusd: toCodec('10', 18), xor: toCodec('1', 18) };
  bot.portfolio = { initial, holdings: { ...initial }, feesPaidCodec: '0', trades: 0 };
  return bot;
}

describe('fresh research opening feasibility', () => {
  it('shows a dated high-fee scenario only while both finalized fee and completed mark are fresh', () => {
    const bot = kusdXor();
    const candle = { timestamp: 2 * HOUR, close: '10' };
    const feeObservation = { finalizedAt: 2 * HOUR + 1000, expiresAt: 2 * HOUR + 300_000 };
    const at = 2 * HOUR + 2000;
    // Ten KUSD at ten per XOR plus the protected one XOR reserve is two XOR;
    // a nine-hundredths XOR fee consumes 90% of the five-percent loss allowance.
    expect(describeNetworkFeeLossPressure(bot, candle, goal, toCodec('0.09', 18), feeObservation, at)).toEqual({
      sharePercent: '90.0',
      maxLossPercent: '5',
      observedAt: feeObservation.finalizedAt,
      markAt: candle.timestamp,
    });
    expect(describeNetworkFeeLossPressure(bot, candle, goal, toCodec('0.04', 18), feeObservation, at)).toEqual({
      sharePercent: '40.0',
      maxLossPercent: '5',
      observedAt: feeObservation.finalizedAt,
      markAt: candle.timestamp,
    });
    expect(describeNetworkFeeLossPressure(bot, candle, goal, toCodec('0.02', 18), feeObservation, at)).toBeNull();
    expect(
      describeNetworkFeeLossPressure(
        bot,
        candle,
        { ...goal, maxLossPercent: '10' },
        toCodec('0.08', 18),
        feeObservation,
        at
      )
    ).toEqual({
      sharePercent: '40.0',
      maxLossPercent: '10',
      observedAt: feeObservation.finalizedAt,
      markAt: candle.timestamp,
    });
    expect(
      describeNetworkFeeLossPressure(bot, candle, goal, toCodec('0.09', 18), feeObservation, feeObservation.expiresAt)
    ).toBeNull();
    expect(
      describeNetworkFeeLossPressure(
        bot,
        candle,
        { ...goal, valuationAsset: 'input' },
        toCodec('0.09', 18),
        feeObservation,
        at
      )
    ).toBeNull();
  });

  it.each(['dca', 'threshold', 'sma', 'rules'] as const)(
    'bounds the real next-close replay for %s, with both zero and positive network fees',
    (kind) => {
      const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
      const assets = [kusd, { address: XOR.address, symbol: XOR.symbol, decimals: XOR.decimals }];
      const candles = pair('4.627275257177647266', '5.485617430406035512');
      for (const networkFeeXor of ['0', '0.1']) {
        const settings = {
          ...RESEARCH_DEFAULT_SETTINGS,
          assetInAddress: kusd.address,
          assetOutAddress: XOR.address,
          capital: '10',
          feeBudgetXor: '1',
          tradePercent: 50,
          historyStartAt: undefined,
          validation: 'none' as const,
          optimize: false,
          preset: kind === 'rules' ? ('sma' as const) : kind,
          intervalHours: 1,
          intervalBlocks: undefined,
          networkFeeXor,
          sellNetworkFeeXor: networkFeeXor,
          swapFeePercent: networkFeeXor === '0' ? '0' : '0.6',
          sellSwapFeePercent: networkFeeXor === '0' ? '0' : '0.6',
          slippagePercent: networkFeeXor === '0' ? '0.01' : '0.5',
          priceImpactPercent: networkFeeXor === '0' ? '0' : '1.3',
          sellPriceImpactPercent: networkFeeXor === '0' ? '0' : '1.3',
        };
        const bot = createResearchBot(settings, assets, 3 * HOUR);
        const bound = openingResearchDrawdown(bot, candles, goal)!;
        const strategy = {
          ...bot.strategy,
          kind,
          threshold: '100',
          fastWindow: 2,
          slowWindow: 3,
          ...(kind === 'rules'
            ? {
                rules: {
                  version: 1 as const,
                  entry: {
                    operator: 'all' as const,
                    conditions: [{ kind: 'trend' as const, window: 2, direction: 'above' as const }],
                  },
                  exit: null,
                },
              }
            : {}),
        };
        const replay = runResearch(
          settings,
          assets,
          {
            kind: 'historical',
            history: { candles, missing: 0, denominationVerified: true },
          },
          3 * HOUR,
          { strategy }
        );
        const equity = replay.result.equity.map((point) => {
          const close = point.timestamp <= candles[0].timestamp ? candles[0].close : candles[1].close;
          const value = decimalRatio(new FPNumber(point.value, 36), new FPNumber(close, 36)).toString();
          return { ...point, value, benchmark: value };
        });
        const observed = portfolioPerformance(equity).drawdownPercent;
        expect(new FPNumber(observed, 36).gte(new FPNumber(bound.lossPercent, 36))).toBe(true);
        expect(replay.tradeMarkers.every((trade) => trade.timestamp === candles[1].timestamp)).toBe(true);
        expect(replay.result.trades).toBe(kind === 'dca' || kind === 'threshold' ? 1 : 0);
      }
    }
  );

  it('proves the disclosed first-close loss before choosing a strategy, without changing either input', () => {
    const bot = kusdXor();
    const candles = pair('4.627275257177647266', '5.485617430406035512');
    const before = structuredClone({ bot, candles, goal });
    expect(openingResearchDrawdown(bot, candles, goal)).toEqual({
      lossPercent: '10.6972341206832258130349913977100777',
      maxLossPercent: '5',
      valuationSymbol: 'XOR',
      openedAt: HOUR,
      firstTradeAt: 2 * HOUR,
    });
    expect({ bot, candles, goal }).toEqual(before);
  });

  it('includes an input-token fee reserve once and retains exact boundary semantics', () => {
    const bot = botFixture();
    bot.portfolio.initial.in = bot.portfolio.holdings.in = '19000';
    // 190 / 19 = 10 output units; 190 / 20 = 9.5, exactly a 5% decline.
    expect(openingResearchDrawdown(bot, pair('19', '20'), goal)).toBeNull();
    expect(openingResearchDrawdown(bot, pair('19', '19.99'), goal)).toBeNull();
    expect(openingResearchDrawdown(bot, pair('19', '20.01'), goal)?.lossPercent).toBe(
      '5.0474762618690654672663668165917041'
    );
    // The real qualification calculation truncates this mathematical excess to equality.
    expect(openingResearchDrawdown(bot, pair('19', '20.' + '0'.repeat(35) + '1'), goal)).toBeNull();
  });

  it.each(['4', '3'])('does not call unchanged or improved buying power (%s) qualified', (next) => {
    expect(openingResearchDrawdown(kusdXor(), pair('4', next), goal)).toBeNull();
  });

  it('uses the goal valuation and protects the output-token reserve instead of selling it', () => {
    const bot = kusdXor();
    expect(openingResearchDrawdown(bot, pair('4', '8'), { maxLossPercent: '5' })).toBeNull();
    expect(openingResearchDrawdown(bot, pair('10', '8'), { valuationAsset: 'input', maxLossPercent: '5' })).toEqual({
      lossPercent: '10',
      maxLossPercent: '5',
      valuationSymbol: 'KUSD',
      openedAt: HOUR,
      firstTradeAt: 2 * HOUR,
    });
  });

  it('values a separate third-token reserve with its own close in either goal denomination', () => {
    const bot = botFixture();
    bot.policy.feeAsset = { address: 'xor', symbol: 'XOR', decimals: 18 };
    bot.policy.feeBudgetCodec = toCodec('10', 18);
    bot.portfolio.initial.xor = bot.portfolio.holdings.xor = toCodec('10', 18);
    const candles = pair('2', '2');
    candles[0].feeClose = '10';
    candles[1].feeClose = '8';
    // Input equity 200 -> 180; output equity 100 -> 90. The reserve is never valued as OUT.
    for (const valuationAsset of ['input', 'output'] as const)
      expect(openingResearchDrawdown(bot, candles, { ...goal, valuationAsset })?.lossPercent).toBe('10');
    delete candles[1].feeClose;
    expect(() => openingResearchDrawdown(bot, candles, goal)).toThrow('bots.errors.history');
  });

  it('ignores strategy warmup, cadence and signals when bounding the first possible fill', () => {
    const bot = kusdXor();
    bot.strategy = { ...bot.strategy, kind: 'sma', slowWindow: 200, fastWindow: 199, intervalMs: 12 * HOUR };
    bot.state.previousSignal = -1;
    const candles = pair('4', '8');
    const initial = openingResearchDrawdown(bot, candles, goal);
    bot.strategy = { ...bot.strategy, kind: 'threshold', threshold: '10000', direction: 'above' };
    expect(openingResearchDrawdown(bot, candles, goal)).toEqual(initial);
  });

  it.each(['holdings', 'trades', 'fees', 'spendableOutput'] as const)(
    'refuses an ongoing or funded-output state: %s',
    (change) => {
      const bot = kusdXor();
      if (change === 'holdings') bot.portfolio.holdings.kusd = toCodec('9', 18);
      if (change === 'trades') bot.portfolio.trades = 1;
      if (change === 'fees') bot.portfolio.feesPaidCodec = '1';
      if (change === 'spendableOutput') bot.portfolio.initial.xor = bot.portfolio.holdings.xor = toCodec('2', 18);
      expect(() => openingResearchDrawdown(bot, pair('4', '8'), goal)).toThrow('bots.errors.config');
    }
  );

  it.each(['0', '-1', 'NaN', '1e2'])('rejects invalid observed prices without a feasibility diagnosis: %s', (price) => {
    expect(() => openingResearchDrawdown(kusdXor(), pair(price, '8'), goal)).toThrow('bots.errors.history');
  });

  it('requires a chronological pair and positive representable opening value', () => {
    const bot = botFixture();
    const candles = pair('1', '2');
    candles[1].timestamp = candles[0].timestamp;
    expect(() => openingResearchDrawdown(bot, candles, goal)).toThrow('bots.errors.history');
    bot.portfolio.initial.in = bot.portfolio.holdings.in = '0';
    expect(() => openingResearchDrawdown(bot, pair('1', '2'), goal)).toThrow('bots.errors.history');
  });
});

describe('observed opening fee scenarios', () => {
  const drawdownGoal = { ...goal, lossMetric: 'drawdown' as const };
  const describeFee = (bot: BotDefinition, candles: [BotCandle, BotCandle], fee = '0.21') =>
    describeOpeningResearchFee(bot, candles, drawdownGoal, toCodec(fee, bot.policy.feeAsset.decimals));

  it('includes the protected reserve once and keeps the two fee scenarios independent', () => {
    const bot = kusdXor();
    const candles = pair('10', '10');
    const before = structuredClone({ bot, candles });
    // 10 KUSD / 10 + 1 protected XOR = 2 XOR; a 0.1 XOR fee is exactly 5%.
    expect(describeFee(bot, candles, '0.1')).toEqual({
      protocol: 'opening-fee-scenario-v1',
      valuationAsset: 'output',
      lossMetric: 'drawdown',
      maxLossPercent: '5',
      opening: { timestamp: HOUR, feeOnlyLossPercent: '5', feeOnlyReachesLossLimit: true },
      firstPossibleTrade: { timestamp: 2 * HOUR, feeOnlyLossPercent: '5', feeOnlyReachesLossLimit: true },
      laterOpportunity: 'not-assessed',
    });
    expect({ bot, candles }).toEqual(before);
  });

  it('does not add the fee reserve again when it is already included in input capital', () => {
    const bot = botFixture();
    // The 100 input units already contain the 1-unit fee reserve: a 1-unit fee costs 1%, not 1/101.
    expect(describeFee(bot, pair('2', '2'), '1')?.opening.feeOnlyLossPercent).toBe('1');
  });

  it('never reads a third candle or validation observation', () => {
    const candles = pair('10', '10');
    Object.defineProperty(candles, '2', {
      get: () => {
        throw new Error('A later observation must not be read');
      },
    });
    expect(describeFee(kusdXor(), candles)?.laterOpportunity).toBe('not-assessed');
  });

  it('uses the chosen valuation and includes passive movement before the first possible trade', () => {
    const bot = kusdXor();
    const candles = pair('10', '20');
    // In XOR: 2 -> 1.5 before the fee, then 1.4 after it. In KUSD: 20 -> 30 -> 28.
    expect(describeFee(bot, candles, '0.1')?.firstPossibleTrade).toEqual({
      timestamp: 2 * HOUR,
      feeOnlyLossPercent: '30',
      feeOnlyReachesLossLimit: true,
    });
    const input = describeOpeningResearchFee(
      bot,
      candles,
      { ...drawdownGoal, valuationAsset: 'input' },
      toCodec('0.1', 18)
    )!;
    expect(input.firstPossibleTrade.feeOnlyLossPercent).toBe('6.6666666666666666666666666666666666');
    expect(input.firstPossibleTrade.feeOnlyReachesLossLimit).toBe(true);
  });

  it('values a third-token reserve at its own price without treating it as the output token', () => {
    const bot = botFixture();
    bot.policy.feeAsset = { address: 'xor', symbol: 'XOR', decimals: 18 };
    bot.policy.feeBudgetCodec = toCodec('1', 18);
    bot.portfolio.initial.xor = bot.portfolio.holdings.xor = toCodec('1', 18);
    const candles = pair('2', '2');
    candles[0].feeClose = '100';
    candles[1].feeClose = '100';
    // 100 input + 1 XOR * 100 input/XOR = 200 input; 0.1 XOR costs 10 input.
    expect(describeFee(bot, candles, '0.1')?.opening.feeOnlyLossPercent).toBe('5');
    delete candles[1].feeClose;
    expect(() => describeFee(bot, candles)).toThrow('bots.errors.history');
  });

  it.each([
    ['0.099999999999999999', false],
    ['0.1', true],
    ['0.100000000000000001', true],
  ] as const)('keeps exact admission equality at the fee boundary: %s', (fee, reaches) => {
    const bot = kusdXor();
    const candles = pair('10', '10');
    const scenario = describeFee(bot, candles, fee)!;
    bot.goal = { ...drawdownGoal, title: 'test', targetReturnPercent: '5', durationMs: 24 * HOUR };
    bot.goalState = evaluateBotGoal(bot, HOUR, candles[0]);
    bot.policy.maxTradeCodec.kusd = toCodec('1', 18);
    const admission = assessGoalTradeAdmission(
      bot,
      {
        inputAsset: 'kusd',
        inputCodec: toCodec('1', 18),
        outputAsset: 'xor',
        outputCodec: toCodec('0.1', 18),
        feeAsset: 'xor',
        feeCodec: toCodec(fee, 18),
      },
      candles[1],
      candles[1].timestamp
    );
    expect(scenario.firstPossibleTrade.feeOnlyReachesLossLimit).toBe(reaches);
    expect(admission.rejection === 'bots.errors.goalTradeCost').toBe(reaches);
    expect(scenario.opening.feeOnlyLossPercent.split('.')[1]?.length ?? 0).toBeLessThanOrEqual(36);
  });

  it('does not turn an opening failure into a claim that later opportunities are impossible', () => {
    const scenario = describeFee(kusdXor(), pair('10', '1'))!;
    expect(scenario.opening.feeOnlyReachesLossLimit).toBe(true);
    expect(scenario.firstPossibleTrade.feeOnlyReachesLossLimit).toBe(false);
    expect(scenario.laterOpportunity).toBe('not-assessed');
    expect(Object.keys(scenario)).not.toContain('qualified');
  });

  it('uses an unchanged baseline for legacy goals and clamps gains to zero displayed loss', () => {
    const bot = kusdXor();
    const candles = pair('10', '1');
    const fee = toCodec('0.6', 18);
    const baseline = describeOpeningResearchFee(bot, candles, { ...goal, lossMetric: 'baseline' }, fee)!;
    const drawdown = describeOpeningResearchFee(bot, candles, drawdownGoal, fee)!;
    expect(baseline.firstPossibleTrade).toEqual({
      timestamp: 2 * HOUR,
      feeOnlyLossPercent: '0',
      feeOnlyReachesLossLimit: false,
    });
    expect(drawdown.firstPossibleTrade.feeOnlyReachesLossLimit).toBe(true);
    expect(describeOpeningResearchFee(bot, candles, goal, fee)?.lossMetric).toBe('baseline');
  });

  it('omits an unfundable fee without inventing negative holdings or rejecting the study', () => {
    expect(describeFee(kusdXor(), pair('10', '10'), '1.1')).toBeNull();
  });

  it.each(['holdings', 'trades', 'fees', 'spendableOutput', 'underfundedReserve', 'goalState', 'malformedAmount'])(
    'refuses a malformed or changed opening allocation: %s',
    (change) => {
      const bot = kusdXor();
      if (change === 'holdings') bot.portfolio.holdings.kusd = toCodec('9', 18);
      if (change === 'trades') bot.portfolio.trades = 1;
      if (change === 'fees') bot.portfolio.feesPaidCodec = '1';
      if (change === 'spendableOutput') bot.portfolio.initial.xor = bot.portfolio.holdings.xor = toCodec('2', 18);
      if (change === 'underfundedReserve') bot.portfolio.initial.xor = bot.portfolio.holdings.xor = toCodec('0.5', 18);
      if (change === 'goalState')
        bot.goalState = { startedAt: HOUR, baselineValue: '2', lastValue: '2', returnPercent: '0', outcome: 'active' };
      if (change === 'malformedAmount') bot.portfolio.initial.kusd = bot.portfolio.holdings.kusd = '1.1';
      expect(() => describeFee(bot, pair('10', '10'))).toThrow();
    }
  );

  it.each(['0', '-1', '1.1', '01', 'NaN'])('refuses a malformed or nonpositive observed fee: %s', (fee) => {
    expect(() => describeOpeningResearchFee(kusdXor(), pair('10', '10'), drawdownGoal, fee)).toThrow(
      'bots.errors.amount'
    );
  });
});
