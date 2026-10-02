import { FPNumber } from '@/lib/substrate/math';
import { describe, expect, it } from 'vitest';
import {
  applyPaperFill,
  copyStrategyConfig,
  decimalRatio,
  evaluateStrategy,
  parseBotPrice,
  portfolioPerformance,
  requiredStrategyCandles,
  ruleCloseConsumed,
  runBacktest,
  validateStrategy,
  valuePortfolio,
} from '@/features/bot-trading/engine';
import type { BacktestTrade, BotCandle, BotDefinition } from '@/features/bot-trading/types';
import { illustrativeRuleCandles } from '@/features/bot-trading/rule-flow';
import { ruleRecipe } from '@/features/bot-trading/rule-recipes';

const base = { address: 'base', symbol: 'XOR', decimals: 6 };
const quote = { address: 'quote', symbol: 'VAL', decimals: 6 };
function createBot(): BotDefinition {
  return {
    version: 1,
    id: 'bot',
    name: 'test',
    mode: 'paper',
    status: 'idle',
    account: 'alice',
    network: 'sora',
    assetIn: { ...base },
    assetOut: { ...quote },
    strategy: {
      kind: 'dca',
      amount: '10',
      intervalMs: 1000,
      threshold: '2',
      direction: 'below',
      fastWindow: 1,
      slowWindow: 2,
      prompt: '',
    },
    policy: {
      maxTradeCodec: { base: '100000000', quote: '100000000' },
      slippagePercent: '1',
      maxPriceImpactPercent: '5',
      feeAsset: { ...base },
      feeBudgetCodec: '10000000',
      sessionDurationMs: 3600000,
    },
    portfolio: {
      initial: { base: '100000000', quote: '0' },
      holdings: { base: '100000000', quote: '0' },
      feesPaidCodec: '0',
      trades: 0,
    },
    state: { lastTradeAt: 0, lastEvaluatedAt: 0 },
    provider: 'openai',
    model: '',
    endpoint: '',
    createdAt: 0,
    sessionExpiresAt: 0,
    activity: [],
    equity: [],
    apiUsage: { requests: 0, inputTokens: 0, outputTokens: 0 },
  };
}
const candles = (prices: string[]): BotCandle[] => prices.map((close, i) => ({ close, timestamp: (i + 1) * 1000 }));
const fill = {
  inputAsset: 'base',
  inputCodec: '10000000',
  outputAsset: 'quote',
  outputCodec: '5000000',
  feeAsset: 'base',
  feeCodec: '1000000',
};

describe('bot strategy evaluation', () => {
  it.each([undefined, 'closed-hour', 'live-price'] as const)(
    'preserves explicit SMA signal timing %s',
    (signalTiming) => {
      const bot = createBot();
      bot.strategy.kind = 'sma';
      if (signalTiming !== undefined) bot.strategy.signalTiming = signalTiming;
      expect(() => validateStrategy(bot)).not.toThrow();
      expect(copyStrategyConfig(bot.strategy)).toEqual(bot.strategy);
      expect(Object.hasOwn(copyStrategyConfig(bot.strategy), 'signalTiming')).toBe(signalTiming !== undefined);
    }
  );

  it('rejects invalid signal timing and timing on other strategies at copying and evaluation boundaries', () => {
    for (const strategy of [
      { ...createBot().strategy, signalTiming: 'live-price' as const },
      { ...createBot().strategy, kind: 'sma' as const, signalTiming: 'each-second' as 'live-price' },
    ]) {
      expect(() => copyStrategyConfig(strategy)).toThrow('bots.errors.strategy');
      expect(() => evaluateStrategy({ ...createBot(), strategy }, candles(['2']), 1000)).toThrow(
        'bots.errors.strategy'
      );
    }
  });

  it('consumes a live SMA quote once even if a repeated payload changes price or arrives out of order', () => {
    const bot = createBot();
    bot.strategy.kind = 'sma';
    bot.strategy.signalTiming = 'live-price';
    const first = evaluateStrategy(bot, candles(['2', '1']), 2000);
    bot.state = first.state;
    expect(bot.state.lastLiveObservationAt).toBe(2000);
    expect(evaluateStrategy(bot, candles(['2', '3']), 3000).proposal.action).toBe('hold');
    expect(
      evaluateStrategy(
        bot,
        [
          { timestamp: 500, close: '2' },
          { timestamp: 1500, close: '3' },
        ],
        3000
      ).proposal.action
    ).toBe('hold');
    const crossed = evaluateStrategy(
      bot,
      [
        { timestamp: 1000, close: '2' },
        { timestamp: 3000, close: '3' },
      ],
      3000
    );
    expect(crossed.proposal.action).toBe('buy');
    expect(crossed.state.lastLiveObservationAt).toBe(3000);
    expect(() =>
      evaluateStrategy({ ...bot, state: { ...bot.state, lastLiveObservationAt: NaN } }, candles(['2', '3']), 3000)
    ).toThrow('bots.errors.strategy');
  });

  it('keeps historical backtests on their supplied hourly execution timestamps for live-price SMA', () => {
    const bot = createBot();
    bot.strategy.kind = 'sma';
    const hourly = candles(['3', '2', '1', '4', '5', '1', '2']).map((candle) => ({
      ...candle,
      timestamp: candle.timestamp * 3600,
    }));
    const options = { slippagePercent: '0', feeCodec: '0' };
    const history = { candles: hourly, missing: 0, denominationVerified: true };
    const closed = runBacktest(bot, history, options);
    bot.strategy.signalTiming = 'live-price';
    expect(runBacktest(bot, history, options)).toEqual(closed);
  });

  const rulesBot = () => {
    const bot = createBot();
    bot.strategy.kind = 'rules';
    bot.strategy.rules = {
      version: 1,
      entry: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] },
      exit: null,
    };
    return bot;
  };

  it('consumes each ready rule observation once, while incomplete windows remain eligible', () => {
    const bot = rulesBot();
    const warmup = evaluateStrategy(bot, candles(['1']), 1000);
    expect(warmup.proposal.reason).toBe('bots.events.warmup');
    expect(warmup.state.lastRuleObservationAt).toBeUndefined();
    const first = evaluateStrategy({ ...bot, state: warmup.state }, candles(['1', '2', '3', '1']), 3000);
    expect(first.proposal.action).toBe('buy');
    expect(first.state.lastRuleObservationAt).toBe(3000);
    const duplicate = evaluateStrategy({ ...bot, state: first.state }, candles(['1', '2', '3']), 3500);
    expect(duplicate.proposal.action).toBe('hold');
    const next = evaluateStrategy({ ...bot, state: duplicate.state }, candles(['1', '2', '3', '4']), 4000);
    expect(next.proposal.action).toBe('buy');
    expect(next.state.lastRuleObservationAt).toBe(4000);
  });

  it('reports a consumed rule close exactly when an evaluation could only hold', () => {
    const bot = rulesBot();
    expect(ruleCloseConsumed(bot, candles(['1', '2', '3']), 3000)).toBe(false);
    const consumed = { ...bot, state: evaluateStrategy(bot, candles(['1', '2', '3']), 3000).state };
    expect(ruleCloseConsumed(consumed, candles(['1', '2', '3']), 3500)).toBe(true);
    expect(evaluateStrategy(consumed, candles(['1', '2', '3']), 3500).proposal.reason).toBe('bots.events.noSignal');
    // A newer close counts only once it has completed at `now`.
    expect(ruleCloseConsumed(consumed, candles(['1', '2', '3', '4']), 3999)).toBe(true);
    expect(ruleCloseConsumed(consumed, candles(['1', '2', '3', '4']), 4000)).toBe(false);
    const dca = { ...consumed, strategy: { ...consumed.strategy, kind: 'dca' as const } };
    expect(ruleCloseConsumed(dca, candles(['1', '2', '3']), 3500)).toBe(false);
  });

  it('consumes rule closes blocked by cooldown and never retries that close after the interval', () => {
    const bot = rulesBot();
    bot.state.lastTradeAt = 2500;
    const blocked = evaluateStrategy(bot, candles(['1', '2', '3']), 3000);
    expect(blocked.proposal.reason).toBe('bots.events.interval');
    expect(blocked.state.lastRuleObservationAt).toBe(3000);
    expect(evaluateStrategy({ ...bot, state: blocked.state }, candles(['1', '2', '3']), 4000).proposal.action).toBe(
      'hold'
    );
  });

  it('gives matching exits precedence and caps sells at actual holdings without shorting', () => {
    const bot = rulesBot();
    bot.strategy.rules!.exit = { operator: 'any', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] };
    expect(evaluateStrategy(bot, candles(['1', '2', '3']), 3000).proposal.reason).toBe('bots.events.noAllocation');
    bot.portfolio.holdings.quote = '1234567';
    expect(evaluateStrategy(bot, candles(['1', '2', '3']), 3000).proposal).toEqual({
      action: 'sell',
      amount: '1.234567',
      reason: 'bots.rules.exitMatch',
    });
  });

  it('copies canonical rule trees and rejects missing or misplaced conditions', () => {
    const bot = rulesBot();
    const detached = copyStrategyConfig(bot.strategy);
    expect(detached.rules).toEqual(bot.strategy.rules);
    expect(detached.rules).not.toBe(bot.strategy.rules);
    expect(detached.rules!.entry.conditions[0]).not.toBe(bot.strategy.rules!.entry.conditions[0]);
    expect(requiredStrategyCandles(bot.strategy)).toBe(2);
    expect(() => copyStrategyConfig({ ...bot.strategy, rules: undefined })).toThrow();
    expect(() => copyStrategyConfig({ ...bot.strategy, kind: 'dca' })).toThrow('bots.errors.strategy');
  });

  it('preserves the maximum restoring warmup and filters future observations before regression', () => {
    const bot = rulesBot();
    bot.strategy.rules!.entry.conditions = [{ kind: 'restoring', window: 200, direction: 'above', threshold: '0' }];
    const history = illustrativeRuleCandles(203, 'restoring');
    expect(requiredStrategyCandles(bot.strategy)).toBe(202);
    const incomplete = evaluateStrategy(bot, history, history[200].timestamp);
    expect(incomplete.proposal.reason).toBe('bots.events.warmup');
    expect(incomplete.state.lastRuleObservationAt).toBeUndefined();
    const ready = evaluateStrategy({ ...bot, state: incomplete.state }, history, history[201].timestamp);
    expect(ready.proposal.action).toBe('buy');
    expect(ready.state.lastRuleObservationAt).toBe(history[201].timestamp);
    expect(ready).toEqual(
      evaluateStrategy({ ...bot, state: incomplete.state }, history.slice(0, 202), history[201].timestamp)
    );
  });

  it('holds unavailable restoring estimates without consuming the observation and recovers after a cadence gap', () => {
    const bot = rulesBot();
    bot.strategy.rules!.entry.conditions = [{ kind: 'restoring', window: 3, direction: 'above', threshold: '0' }];
    const history = candles(['140', '120', '110', '105', '100', '105', '107.5', '108.75', '109.375']).map(
      (candle, index) => ({
        ...candle,
        timestamp: candle.timestamp + (index >= 4 ? 1 : 0),
      })
    );
    for (const index of [4, 5, 6, 7]) {
      const unavailable = evaluateStrategy(bot, history, history[index].timestamp);
      expect(unavailable.proposal.reason).toBe('bots.events.warmup');
      expect(unavailable.state.lastRuleObservationAt).toBeUndefined();
      bot.state = unavailable.state;
    }
    const recovered = evaluateStrategy(bot, history, history[8].timestamp);
    expect(recovered.proposal.action).toBe('buy');
    expect(recovered.state.lastRuleObservationAt).toBe(history[8].timestamp);
  });

  it('fills both spring buys and sells on the following authored close without conflicting guard deadlocks', () => {
    const bot = rulesBot();
    bot.strategy.rules = ruleRecipe('spring');
    const history = illustrativeRuleCandles(97, 'restoring');
    const trades: BacktestTrade[] = [];
    const result = runBacktest(
      bot,
      { candles: history, missing: 0, denominationVerified: true },
      {
        slippagePercent: '0',
        feeCodec: '0',
        onTrade: (trade) => trades.push({ ...trade }),
      }
    );
    expect(trades[0].action).toBe('buy');
    expect(trades.some(({ action }) => action === 'sell')).toBe(true);
    expect(trades[0].timestamp).toBe(history[63].timestamp);
    expect(trades[0].price).toBe('98');
    expect(result.trades).toBe(trades.length);
    expect(bot.portfolio.holdings.quote).toBe('0');
    expect(bot.state.lastRuleObservationAt).toBeUndefined();
  });

  it('keeps a price ratio below twenty decimal places representable', () => {
    expect(
      decimalRatio(new FPNumber('0.000000000000000000000000000000000002', 36), new FPNumber('2', 36)).toString()
    ).toBe('0.000000000000000000000000000000000001');
    expect(() => decimalRatio(new FPNumber('1'), new FPNumber('0'))).toThrow();
  });
  it('schedules a buy without recording an unexecuted trade', () => {
    const bot = createBot();
    const result = evaluateStrategy(bot, candles(['2']), 1000);
    expect(result.proposal).toMatchObject({ action: 'buy', amount: '10' });
    expect(result.state).toEqual({ lastEvaluatedAt: 1000, lastTradeAt: 0 });
    expect(bot.state.lastEvaluatedAt).toBe(0);
  });
  it('does not trade before the interval or without observable data', () => {
    const bot = createBot();
    bot.state.lastTradeAt = 1000;
    expect(evaluateStrategy(bot, candles(['2']), 1500).proposal.action).toBe('hold');
    expect(evaluateStrategy(bot, candles(['2']), 2000).proposal.action).toBe('buy');
    expect(evaluateStrategy(bot, [], 2000).proposal.action).toBe('hold');
  });
  it('ignores future candles in a threshold signal', () => {
    const bot = createBot();
    bot.strategy.kind = 'threshold';
    expect(evaluateStrategy(bot, candles(['3', '1']), 1000).proposal.action).toBe('hold');
    expect(evaluateStrategy(bot, candles(['3', '1']), 2000).proposal.action).toBe('buy');
  });
  it('sells only allocated quote tokens when an upper price trigger is reached', () => {
    const bot = createBot();
    bot.strategy.kind = 'threshold';
    bot.strategy.direction = 'above';
    bot.portfolio.holdings.quote = '1250000';
    expect(evaluateStrategy(bot, candles(['3']), 1000).proposal).toMatchObject({ action: 'sell', amount: '1.25' });
    bot.portfolio.holdings.quote = '0';
    expect(evaluateStrategy(bot, candles(['3']), 1000).proposal.action).toBe('hold');
  });
  it('never sells an output-token fee reserve and sizes earned output above its unspent floor', () => {
    const bot = createBot();
    bot.strategy.kind = 'threshold';
    bot.strategy.direction = 'above';
    bot.policy.feeAsset = bot.assetOut;
    bot.portfolio.holdings.quote = bot.policy.feeBudgetCodec;
    expect(evaluateStrategy(bot, candles(['3']), 1000).proposal.reason).toBe('bots.events.noAllocation');
    bot.portfolio.feesPaidCodec = '1000000';
    bot.portfolio.holdings.quote = '10000001';
    expect(evaluateStrategy(bot, candles(['3']), 1000).proposal).toMatchObject({
      action: 'sell',
      amount: '1.000001',
    });
  });
  it('holds an exact requested buy when it would consume the input-token reserve', () => {
    const bot = createBot();
    bot.portfolio.holdings.base = '19999999';
    expect(evaluateStrategy(bot, candles(['3']), 1000).proposal.reason).toBe('bots.events.noAllocation');
    bot.portfolio.holdings.base = '20000000';
    expect(evaluateStrategy(bot, candles(['3']), 1000).proposal).toMatchObject({ action: 'buy', amount: '10' });
    expect(bot.strategy.amount).toBe('10');
  });
  it('rounds quote-token sell sizes down instead of overspending fractional base units', () => {
    const bot = createBot();
    bot.strategy.kind = 'threshold';
    bot.strategy.direction = 'above';
    bot.portfolio.holdings.quote = '100000000';
    expect(evaluateStrategy(bot, candles(['3']), 1000).proposal.amount).toBe('3.333333');
  });
  it('waits for an actual SMA crossover and emits once', () => {
    const bot = createBot();
    bot.strategy.kind = 'sma';
    expect(evaluateStrategy(bot, candles(['2']), 1000).proposal.action).toBe('hold');
    const initial = evaluateStrategy(bot, candles(['2', '1']), 2000);
    expect(initial.proposal.action).toBe('hold');
    bot.state = initial.state;
    const crossed = evaluateStrategy(bot, candles(['2', '1', '3']), 3000);
    expect(crossed.proposal.action).toBe('buy');
    bot.state = crossed.state;
    expect(evaluateStrategy(bot, candles(['2', '1', '3']), 3000).proposal.action).toBe('hold');
  });
  it('preserves the prior nonzero SMA side at equality and sells on a bearish cross', () => {
    const bot = createBot();
    bot.strategy.kind = 'sma';
    bot.state.previousSignal = 1;
    bot.portfolio.holdings.quote = '10000000';
    bot.state = evaluateStrategy(bot, candles(['2', '2']), 2000).state;
    expect(bot.state.previousSignal).toBe(1);
    expect(evaluateStrategy(bot, candles(['2', '2', '1']), 3000).proposal.action).toBe('sell');
  });
  it('requires external proposals for AI instead of fabricating signals', () => {
    const bot = createBot();
    bot.strategy.kind = 'ai';
    expect(evaluateStrategy(bot, candles(['2']), 1000).proposal.action).toBe('hold');
  });
  it('rejects duplicate times, malformed prices, invalid windows and sub-base-unit sizes', () => {
    const bot = createBot();
    expect(() =>
      evaluateStrategy(
        bot,
        [
          { timestamp: 1, close: '2' },
          { timestamp: 1, close: '3' },
        ],
        1
      )
    ).toThrow('bots.errors.history');
    for (const price of ['NaN', 'Infinity', '-1', '0', '1e-5', ' 2', 2])
      expect(() => parseBotPrice(price as string)).toThrow();
    bot.strategy.kind = 'sma';
    bot.strategy.fastWindow = bot.strategy.slowWindow;
    expect(() => evaluateStrategy(bot, candles(['2']), 1000)).toThrow('bots.errors.strategy');
    bot.strategy.kind = 'dca';
    bot.strategy.amount = '0.0000001';
    expect(() => evaluateStrategy(bot, candles(['2']), 1000)).toThrow('bots.errors.amount');
  });
});

describe('isolated paper holdings', () => {
  it('protects output fee capital across a buy and sell without stranding earned XOR or double-charging fees', () => {
    const bot = createBot();
    bot.policy.feeAsset = bot.assetOut;
    bot.portfolio.initial.quote = bot.policy.feeBudgetCodec;
    bot.portfolio.holdings.quote = bot.policy.feeBudgetCodec;
    const buy = { ...fill, feeAsset: 'quote' };
    const sell = {
      ...buy,
      inputAsset: 'quote',
      inputCodec: '5000000',
      outputAsset: 'base',
      outputCodec: '15000000',
    };
    expect(() => applyPaperFill(bot, sell)).toThrow('bots.errors.balance');
    bot.portfolio = applyPaperFill(bot, buy);
    expect(bot.portfolio.holdings).toEqual({ base: '90000000', quote: '14000000' });
    expect(() => applyPaperFill(bot, { ...sell, inputCodec: '5000001' })).toThrow('bots.errors.balance');
    bot.portfolio = applyPaperFill(bot, sell);
    expect(bot.portfolio.holdings).toEqual({ base: '105000000', quote: '8000000' });
    expect(bot.portfolio.feesPaidCodec).toBe('2000000');
    expect(() => applyPaperFill(bot, { ...sell, inputCodec: '1' })).toThrow('bots.errors.balance');
  });
  it('debits input plus fee exactly without mutating source and reuses sale proceeds', () => {
    const bot = createBot();
    const first = applyPaperFill(bot, fill);
    expect(first.holdings).toEqual({ base: '89000000', quote: '5000000' });
    expect(bot.portfolio.holdings.base).toBe('100000000');
    bot.portfolio = first;
    bot.portfolio = applyPaperFill(bot, {
      ...fill,
      inputAsset: 'quote',
      inputCodec: '5000000',
      outputAsset: 'base',
      outputCodec: '15000000',
    });
    expect(bot.portfolio.holdings).toEqual({ base: '103000000', quote: '0' });
    expect(bot.portfolio.feesPaidCodec).toBe('2000000');
    expect(applyPaperFill(bot, fill).trades).toBe(3);
  });
  it('cannot spend unallocated balances or credit output before paying a fee', () => {
    const bot = createBot();
    bot.portfolio.holdings.base = '10000000';
    expect(() => applyPaperFill(bot, fill)).toThrow('bots.errors.balance');
    bot.portfolio.holdings = { base: '0', quote: '5000000' };
    expect(() =>
      applyPaperFill(bot, {
        ...fill,
        inputAsset: 'quote',
        inputCodec: '5000000',
        outputAsset: 'base',
        outputCodec: '15000000',
      })
    ).toThrow('bots.errors.balance');
  });
  it('enforces pairs, individual caps, fee identity and lifetime fee budget', () => {
    const bot = createBot();
    expect(() => applyPaperFill(bot, { ...fill, outputAsset: 'attacker' })).toThrow('bots.errors.proposal');
    expect(() => applyPaperFill(bot, { ...fill, feeAsset: 'quote' })).toThrow('bots.errors.proposal');
    expect(() => applyPaperFill(bot, { ...fill, inputCodec: '100000001' })).toThrow('bots.errors.policy');
    bot.portfolio.feesPaidCodec = '10000000';
    expect(() => applyPaperFill(bot, fill)).toThrow('bots.errors.feeBudget');
  });
  it('preserves huge integer holdings and assets with different decimals', () => {
    const bot = createBot();
    bot.portfolio.holdings.base = '999999999999999999999999999999';
    bot.assetOut.decimals = 2;
    const result = applyPaperFill(bot, { ...fill, inputCodec: '1', outputCodec: '1', feeCodec: '0' });
    expect(result.holdings.base).toBe('999999999999999999999999999998');
    bot.portfolio = result;
    expect(valuePortfolio(bot, { timestamp: 1, close: '2' })).toBe('1000000000000000000000000.019998');
  });
});

describe('historical simulation and performance', () => {
  it('requires historical provenance and denomination proof without a demo or import bypass', () => {
    const bot = createBot();
    const history = { candles: candles(['2', '2']), missing: 0, denominationVerified: false };
    expect(() => runBacktest(bot, history, { slippagePercent: '0', feeCodec: '0' })).toThrow(
      'bots.errors.denomination'
    );
    for (const label of ['demo', 'imported']) {
      for (const denominationVerified of [false, true]) {
        expect(() =>
          runBacktest(
            bot,
            { ...history, denominationVerified },
            { slippagePercent: '0', feeCodec: '0', dataSource: label as 'historical' }
          )
        ).toThrow('bots.errors.history');
      }
    }
    expect(history.denominationVerified).toBe(false);
    expect(
      runBacktest(bot, { ...history, denominationVerified: true }, { slippagePercent: '0', feeCodec: '0' }).dataSource
    ).toBe('historical');
  });
  it('emits exact buy markers only for accepted next-candle fills', () => {
    const bot = createBot();
    bot.portfolio.initial.base = '11000000';
    bot.policy.feeBudgetCodec = '1000000';
    const markers: Readonly<BacktestTrade>[] = [];
    const result = runBacktest(
      bot,
      { candles: candles(['2', '4', '4']), missing: 0, denominationVerified: true },
      {
        slippagePercent: '0',
        feeCodec: '1000000',
        onTrade: (trade) => markers.push(trade),
      }
    );
    expect(result.trades).toBe(1);
    expect(markers).toEqual([
      {
        timestamp: 2000,
        action: 'buy',
        price: '4',
        amount: '10',
        reason: 'bots.events.scheduled',
        inputAsset: 'base',
        inputCodec: '10000000',
        outputAsset: 'quote',
        outputCodec: '2500000',
        feeAsset: 'base',
        feeCodec: '1000000',
      },
    ]);
  });
  it('emits sell input units and exact fee debits without counting an unfunded sale', () => {
    const bot = createBot();
    bot.strategy.kind = 'threshold';
    bot.strategy.direction = 'above';
    bot.portfolio.initial.quote = '5000000';
    const markers: Readonly<BacktestTrade>[] = [];
    const result = runBacktest(
      bot,
      { candles: candles(['2', '3', '4']), missing: 0, denominationVerified: true },
      {
        slippagePercent: '0',
        feeCodec: '1000000',
        onTrade: (trade) => markers.push(trade),
      }
    );
    expect(result.trades).toBe(1);
    expect(markers[0]).toMatchObject({
      timestamp: 2000,
      action: 'sell',
      price: '3',
      amount: '5',
      inputAsset: 'quote',
      inputCodec: '5000000',
      outputAsset: 'base',
      outputCodec: '15000000',
      feeCodec: '1000000',
    });
    expect(result.portfolio.holdings.base).toBe('114000000');
  });
  it('charges the observed reverse-route fee and network amount for sells independently of buy fees', () => {
    const bot = createBot();
    bot.strategy.kind = 'threshold';
    bot.strategy.direction = 'above';
    bot.portfolio.initial.quote = '5000000';
    const trades: Readonly<BacktestTrade>[] = [];
    const result = runBacktest(
      bot,
      { candles: candles(['2', '3']), missing: 0, denominationVerified: true },
      {
        slippagePercent: '0',
        feeCodec: '1000000',
        swapFeePercent: '1',
        sellFeeCodec: '2000000',
        sellSwapFeePercent: '10',
        onTrade: (trade) => trades.push(trade),
      }
    );
    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({
      action: 'sell',
      inputCodec: '5000000',
      outputCodec: '13500000',
      feeCodec: '2000000',
    });
    expect(result.portfolio.holdings.base).toBe('111500000');
    expect(result.portfolio.feesPaidCodec).toBe('2000000');
    const buy = runBacktest(
      createBot(),
      { candles: candles(['2', '2']), missing: 0, denominationVerified: true },
      {
        slippagePercent: '0',
        feeCodec: '1000000',
        swapFeePercent: '1',
        sellFeeCodec: '2000000',
        sellSwapFeePercent: '10',
      }
    );
    expect(buy.portfolio.holdings).toEqual({ base: '89000000', quote: '4950000' });
    expect(buy.portfolio.feesPaidCodec).toBe('1000000');
  });

  it.each([{ sellFeeCodec: '-1' }, { sellSwapFeePercent: '100' }, { sellSwapFeePercent: '' }])(
    'rejects invalid reverse-route fee observations %j',
    (patch) => {
      expect(() =>
        runBacktest(
          createBot(),
          { candles: candles(['2', '2']), missing: 0, denominationVerified: true },
          {
            slippagePercent: '0',
            feeCodec: '1000000',
            ...patch,
          }
        )
      ).toThrow();
    }
  );

  it.each([
    [1000, 5],
    [2000, 3],
    [3000, 2],
  ])('respects a %i ms fill interval without adding an extra candle', (intervalMs, trades) => {
    const bot = createBot();
    bot.strategy.intervalMs = intervalMs;
    const result = runBacktest(
      bot,
      { candles: candles(['2', '2', '2', '2', '2', '2']), missing: 0, denominationVerified: true },
      { slippagePercent: '0', feeCodec: '0' }
    );
    expect(result.trades).toBe(trades);
    expect(result.portfolio.holdings.base).toBe(String(100_000_000 - trades * 10_000_000));
  });
  it('values quote holdings precisely and requires an external fee asset price', () => {
    const bot = createBot();
    bot.portfolio.holdings.quote = '1000000';
    expect(valuePortfolio(bot, { timestamp: 1, close: '2.000000000000000001' })).toBe('102.000000000000000001');
    bot.policy.feeAsset = { address: 'fee', symbol: 'FEE', decimals: 3 };
    bot.portfolio.holdings.fee = '1000';
    expect(() => valuePortfolio(bot, { timestamp: 1, close: '2' })).toThrow('bots.errors.history');
    expect(valuePortfolio(bot, { timestamp: 1, close: '2', feeClose: '3' })).toBe('105');
  });
  it('reports loss, peak drawdown, and zero capital without NaN', () => {
    expect(
      portfolioPerformance([
        { timestamp: 1, value: '100', benchmark: '100' },
        { timestamp: 2, value: '125', benchmark: '100' },
        { timestamp: 3, value: '75', benchmark: '100' },
      ])
    ).toEqual({ drawdownPercent: '40', returnPercent: '-25' });
    expect(portfolioPerformance([])).toEqual({ drawdownPercent: '0', returnPercent: '0' });
    expect(portfolioPerformance([{ timestamp: 1, value: '0', benchmark: '0' }]).returnPercent).toBe('0');
  });
  it('includes first-trade slippage and fees in net return and restarts from initial capital', () => {
    const bot = createBot();
    bot.portfolio.holdings.base = '1';
    bot.state.lastTradeAt = 999999;
    const result = runBacktest(
      bot,
      { candles: candles(['2', '2']), missing: 2, denominationVerified: true },
      { slippagePercent: '10', feeCodec: '1000000' }
    );
    expect(result.portfolio.holdings).toEqual({ base: '89000000', quote: '4500000' });
    expect(result.returnPercent).toBe('-2');
    expect(result.drawdownPercent).toBe('2');
    expect(result.coverage).toBe(0.5);
    expect(bot.portfolio.holdings.base).toBe('1');
  });
  it('does not look ahead in threshold execution or borrow simulated funds', () => {
    const bot = createBot();
    bot.strategy.kind = 'threshold';
    const result = runBacktest(
      bot,
      { candles: candles(['3', '1', '2']), missing: 0, denominationVerified: true },
      { slippagePercent: '0', feeCodec: '0' }
    );
    expect(result.trades).toBe(1);
    expect(result.equity[1].value).toBe('100');
    expect(result.portfolio.holdings.quote).toBe('5000000');
    bot.portfolio.initial.base = '10000000';
    expect(
      runBacktest(
        bot,
        { candles: candles(['1', '1']), missing: 0, denominationVerified: true },
        { slippagePercent: '0', feeCodec: '1000000' }
      ).trades
    ).toBe(0);
  });
  it('cannot fill a final-candle signal or use its signal price as a fill', () => {
    const bot = createBot();
    expect(
      runBacktest(
        bot,
        { candles: candles(['1']), missing: 0, denominationVerified: true },
        { slippagePercent: '0', feeCodec: '0' }
      ).trades
    ).toBe(0);
    const result = runBacktest(
      bot,
      { candles: candles(['1', '10']), missing: 0, denominationVerified: true },
      { slippagePercent: '0', feeCodec: '0' }
    );
    expect(result.trades).toBe(1);
    expect(result.portfolio.holdings.quote).toBe('1000000');
  });
  it('rejects uncertain denomination, AI replay, empty history and invalid slippage', () => {
    const bot = createBot();
    const history = { candles: candles(['2']), missing: 0, denominationVerified: false };
    expect(() => runBacktest(bot, history, { slippagePercent: '0', feeCodec: '0' })).toThrow(
      'bots.errors.denomination'
    );
    history.denominationVerified = true;
    expect(() => runBacktest(bot, history, { slippagePercent: '100', feeCodec: '0' })).toThrow('bots.errors.policy');
    bot.strategy.kind = 'ai';
    expect(() => runBacktest(bot, history, { slippagePercent: '0', feeCodec: '0' })).toThrow('bots.errors.backtestAi');
  });
});
