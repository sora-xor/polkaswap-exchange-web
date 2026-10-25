import { describe, expect, it } from 'vitest';
import { FPNumber } from '@/lib/substrate/math';
import { copyBotGoal, evaluateBotGoal, validateBotGoalState } from '@/features/bot-trading/goals';
import { valuePortfolio } from '@/features/bot-trading/engine';
import { consentIdentity, assertSession } from '@/features/bot-trading/policy';
import { botFixture } from './fixtures';
import { executionBot, executionStatus } from './execution-fixtures';

const goal = { title: 'Grow my capital', targetReturnPercent: '5', maxLossPercent: '3', durationMs: 3_600_000 };

describe('durable bot goals', () => {
  it('validates goal thresholds and horizon while stripping unrelated properties', () => {
    expect(copyBotGoal({ ...goal, title: ' Goal ', secret: 'excluded' } as typeof goal)).toEqual({
      ...goal,
      title: 'Goal',
    });
    for (const patch of [
      { targetReturnPercent: '0' },
      { targetReturnPercent: '10001' },
      { maxLossPercent: '100.1' },
      { maxLossPercent: '-1' },
      { targetReturnPercent: '1e2' },
      { durationMs: 3_599_999 },
      { durationMs: 30 * 24 * 3_600_000 + 1 },
      { title: '' },
      { valuationAsset: 'unknown' as 'output' },
      { lossMetric: 'unknown' as 'drawdown' },
      { targetRequiresIdleOutperformance: false as true },
    ])
      expect(() => copyBotGoal({ ...goal, ...patch })).toThrow('bots.errors.goal');
    expect(copyBotGoal({ ...goal, lossMetric: 'baseline' }).lossMetric).toBe('baseline');
    expect(copyBotGoal({ ...goal, lossMetric: 'drawdown' }).lossMetric).toBe('drawdown');
    expect(copyBotGoal({ ...goal, targetRequiresIdleOutperformance: true }).targetRequiresIdleOutperformance).toBe(
      true
    );
  });

  it('pauses opted-in drawdown goals below their durable peak while return keeps its opening baseline', () => {
    const bot = botFixture();
    bot.goal = { ...goal, targetReturnPercent: '20', maxLossPercent: '5', lossMetric: 'drawdown' };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    expect(bot.goalState).toMatchObject({ baselineValue: '100', peakValue: '100', returnPercent: '0' });
    bot.portfolio.holdings.in = '11000';
    bot.goalState = evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '2' });
    expect(bot.goalState).toMatchObject({
      baselineValue: '100',
      peakValue: '110',
      returnPercent: '10',
      outcome: 'active',
    });
    const restored = JSON.parse(JSON.stringify(bot));
    restored.equity = [{ timestamp: 2500, value: '900', benchmark: '900' }];
    restored.portfolio.holdings.in = '10340';
    const holdings = { ...restored.portfolio.holdings };
    restored.goalState = evaluateBotGoal(restored, 3000, { timestamp: 3000, close: '2' });
    expect(restored.goalState).toMatchObject({
      baselineValue: '100',
      peakValue: '110',
      lastValue: '103.4',
      returnPercent: '3.4',
      outcome: 'loss',
      completedAt: 3000,
    });
    expect(restored.portfolio.holdings).toEqual(holdings);
    expect(() => validateBotGoalState(restored)).not.toThrow();
    restored.portfolio.holdings.in = '12000';
    expect(evaluateBotGoal(restored, 4000, { timestamp: 4000, close: '2' })).toEqual(restored.goalState);
  });

  it.each([undefined, 'baseline'] as const)('preserves opening-loss semantics for lossMetric %s', (lossMetric) => {
    const bot = botFixture();
    bot.goal = { ...goal, targetReturnPercent: '20', maxLossPercent: '5', ...(lossMetric ? { lossMetric } : {}) };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    bot.portfolio.holdings.in = '11000';
    bot.goalState = evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '2' });
    bot.portfolio.holdings.in = '10340';
    bot.goalState = evaluateBotGoal(bot, 3000, { timestamp: 3000, close: '2' });
    expect(bot.goalState).toMatchObject({ baselineValue: '100', returnPercent: '3.4', outcome: 'active' });
    expect(bot.goalState?.peakValue).toBeUndefined();
    bot.portfolio.holdings.in = '9500';
    expect(evaluateBotGoal(bot, 4000, { timestamp: 4000, close: '2' })?.outcome).toBe('loss');
  });

  it('compares drawdown to the exact peak without rounding a sub-threshold loss into a trigger', () => {
    const bot = botFixture();
    bot.assetIn.decimals = 18;
    bot.policy.feeAsset.decimals = 18;
    bot.portfolio.holdings.in = '100000000000000000000';
    bot.goal = { ...goal, lossMetric: 'drawdown', maxLossPercent: '0.000000000000000001' };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    bot.portfolio.holdings.in = '100000000000000000001';
    bot.goalState = evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '2' });
    expect(bot.goalState?.peakValue).toBe('100.000000000000000001');
    bot.portfolio.holdings.in = '100000000000000000000';
    bot.goalState = evaluateBotGoal(bot, 3000, { timestamp: 3000, close: '2' });
    expect(bot.goalState?.outcome).toBe('active');
    bot.portfolio.holdings.in = '99999999999999999999';
    expect(evaluateBotGoal(bot, 4000, { timestamp: 4000, close: '2' })).toMatchObject({
      outcome: 'loss',
      peakValue: '100.000000000000000001',
      returnPercent: '-0.000000000000000001',
    });
  });

  it.each([undefined, null, '', '0', '-1', 'NaN', '1e2', '00100', '99', '100.' + '1'.repeat(37)])(
    'rejects a missing or malformed drawdown peak %s instead of reconstructing it',
    (peakValue) => {
      const bot = botFixture();
      bot.goal = { ...goal, lossMetric: 'drawdown' };
      bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
      bot.goalState!.peakValue = peakValue as string;
      expect(() => validateBotGoalState(bot)).toThrow('bots.errors.goal');
      expect(() => evaluateBotGoal(bot, 2000)).toThrow('bots.errors.goal');
    }
  );

  it('rejects a drawdown peak below latest value and an unsupported latched loss', () => {
    const bot = botFixture();
    bot.goal = { ...goal, targetReturnPercent: '20', maxLossPercent: '5', lossMetric: 'drawdown' };
    bot.goalState = {
      startedAt: 1000,
      baselineValue: '100',
      lastValue: '110',
      peakValue: '109',
      returnPercent: '10',
      outcome: 'active',
    };
    expect(() => validateBotGoalState(bot)).toThrow('bots.errors.goal');
    bot.goalState = {
      startedAt: 1000,
      baselineValue: '100',
      lastValue: '109',
      peakValue: '110',
      returnPercent: '9',
      outcome: 'loss',
      completedAt: 2000,
    };
    expect(() => validateBotGoalState(bot)).toThrow('bots.errors.goal');
  });

  it('rejects persisted active drawdown state that has already crossed its observed loss threshold', () => {
    const bot = botFixture();
    bot.goal = { ...goal, targetReturnPercent: '20', maxLossPercent: '5', lossMetric: 'drawdown' };
    bot.goalState = {
      startedAt: 1000,
      baselineValue: '100',
      lastValue: '103.4',
      peakValue: '110',
      returnPercent: '3.4',
      outcome: 'active',
    };
    expect(() => validateBotGoalState(bot)).toThrow('bots.errors.goal');
  });

  it('retains target and deadline behavior for opted-in drawdown goals', () => {
    const bot = botFixture();
    bot.goal = { ...goal, lossMetric: 'drawdown' };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    bot.portfolio.holdings.in = '10500';
    expect(evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '2' })).toMatchObject({
      outcome: 'target',
      peakValue: '105',
    });
    expect(evaluateBotGoal(bot, 3_601_000, { timestamp: 3_601_000, close: '2' })).toMatchObject({
      outcome: 'expired',
      peakValue: '105',
      returnPercent: '5',
    });
  });

  it('binds the chosen loss metric to consent without binding the mutable observed peak', () => {
    const bot = botFixture();
    bot.goal = { ...goal, targetReturnPercent: '20' };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    const baselineIdentity = consentIdentity(bot);
    bot.goal.lossMetric = 'drawdown';
    bot.goalState!.peakValue = '100';
    const drawdownIdentity = consentIdentity(bot);
    expect(drawdownIdentity).not.toBe(baselineIdentity);
    bot.portfolio.holdings.in = '11000';
    bot.goalState = evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '2' });
    expect(bot.goalState?.peakValue).toBe('110');
    expect(consentIdentity(bot)).toBe(drawdownIdentity);
  });

  it('measures an output-token goal without converting holdings and preserves its baseline after reload', () => {
    const bot = botFixture();
    bot.goal = { ...goal, valuationAsset: 'output' };
    bot.portfolio.holdings = { in: '5000', out: '2500' };
    const holdings = { ...bot.portfolio.holdings };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    expect(bot.goalState).toMatchObject({ baselineValue: '50', lastValue: '50', returnPercent: '0' });
    expect(bot.portfolio.holdings).toEqual(holdings);
    const restored = JSON.parse(JSON.stringify(bot));
    restored.portfolio.holdings.out = '3000';
    expect(evaluateBotGoal(restored, 2000, { timestamp: 2000, close: '1' })).toMatchObject({
      baselineValue: '50',
      lastValue: '80',
      returnPercent: '60',
      outcome: 'target',
      startedAt: 1000,
    });
    expect(() => evaluateBotGoal(restored, 2000, { timestamp: 2000, close: '0' })).toThrow('bots.errors.history');
    expect(copyBotGoal(bot.goal)).toEqual(bot.goal);
  });

  it('keeps a new GO goal active when a passive output mark reaches target or a fill loses to idle', () => {
    const bot = botFixture();
    bot.policy.feeAsset = bot.assetOut;
    bot.portfolio.holdings = { in: '10000', out: '100' };
    bot.goal = {
      ...goal,
      maxLossPercent: '10',
      valuationAsset: 'output',
      lossMetric: 'drawdown',
      targetRequiresIdleOutperformance: true,
    };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    expect(bot.goalState).toMatchObject({
      baselineValue: '51',
      idleLastValue: '51',
      idleHoldings: { in: '10000', out: '100' },
    });
    bot.goalState = evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '1.8' });
    expect(bot.goalState).toMatchObject({
      outcome: 'active',
      idleLastValue: '56.555555555555555555555555555555555555',
    });
    expect(new FPNumber(bot.goalState!.returnPercent).gt(new FPNumber('5'))).toBe(true);

    bot.portfolio.holdings = { in: '9900', out: '145' };
    bot.portfolio.trades = 1;
    bot.state.lastTradeAt = 3000;
    bot.goalState = evaluateBotGoal(bot, 3000, { timestamp: 3000, close: '1.8' });
    expect(bot.goalState).toMatchObject({ outcome: 'active', lastValue: '56.45' });
    expect(() => validateBotGoalState(JSON.parse(JSON.stringify(bot)))).not.toThrow();

    bot.portfolio.holdings = { in: '9900', out: '160' };
    bot.portfolio.trades = 2;
    bot.state.lastTradeAt = 4000;
    bot.goalState = evaluateBotGoal(bot, 4000, { timestamp: 4000, close: '1.8' });
    expect(bot.goalState).toMatchObject({ outcome: 'target', lastValue: '56.6', completedAt: 4000 });
    expect(() => validateBotGoalState(JSON.parse(JSON.stringify(bot)))).not.toThrow();
  });

  it('treats a simultaneous GO target and peak drawdown breach as a loss', () => {
    const bot = botFixture();
    bot.goal = {
      ...goal,
      targetReturnPercent: '5',
      maxLossPercent: '10',
      lossMetric: 'drawdown',
      targetRequiresIdleOutperformance: true,
    };
    bot.goalState = {
      startedAt: 1000,
      baselineValue: '100',
      lastValue: '130',
      peakValue: '130',
      idleHoldings: { in: '10000', out: '0' },
      idleLastValue: '100',
      returnPercent: '30',
      outcome: 'active',
    };
    bot.portfolio.holdings.in = '10500';
    bot.portfolio.trades = 1;
    bot.state.lastTradeAt = 1500;
    const observed = evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '2' });
    expect(observed).toMatchObject({ outcome: 'loss', lastValue: '105', peakValue: '130' });
    expect(() => validateBotGoalState({ ...bot, goalState: { ...observed!, outcome: 'target' } })).toThrow(
      'bots.errors.goal'
    );
  });

  it('starts the idle comparator from current holdings after an explicit goal reset', () => {
    const bot = botFixture();
    bot.policy.feeAsset = bot.assetOut;
    bot.portfolio.holdings = { in: '9900', out: '160' };
    bot.portfolio.trades = 1;
    bot.state.lastTradeAt = 2000;
    bot.goal = {
      ...goal,
      maxLossPercent: '10',
      valuationAsset: 'output',
      lossMetric: 'drawdown',
      targetRequiresIdleOutperformance: true,
    };
    bot.goalState = evaluateBotGoal(bot, 3000, { timestamp: 3000, close: '1.8' });
    expect(bot.goalState?.idleHoldings).toEqual({ in: '9900', out: '160' });
    bot.goalState = evaluateBotGoal(bot, 4000, { timestamp: 4000, close: '1.5' });
    expect(bot.goalState).toMatchObject({ outcome: 'active', lastValue: '67.6', idleLastValue: '67.6' });
    bot.portfolio.holdings = { in: '9800', out: '240' };
    bot.portfolio.trades = 2;
    bot.state.lastTradeAt = 5000;
    bot.goalState = evaluateBotGoal(bot, 5000, { timestamp: 5000, close: '1.5' });
    expect(bot.goalState?.outcome).toBe('target');
  });

  it('rejects a claimed GO target without a post-start fill or positive idle excess', () => {
    const bot = botFixture();
    bot.policy.feeAsset = bot.assetOut;
    bot.portfolio.holdings = { in: '10000', out: '100' };
    bot.goal = {
      ...goal,
      maxLossPercent: '10',
      valuationAsset: 'output',
      lossMetric: 'drawdown',
      targetRequiresIdleOutperformance: true,
    };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    bot.portfolio.holdings = { in: '9900', out: '160' };
    bot.portfolio.trades = 1;
    bot.state.lastTradeAt = 2000;
    bot.goalState = evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '1.8' });
    expect(bot.goalState?.outcome).toBe('target');
    const withoutExcess = structuredClone(bot);
    withoutExcess.goalState!.idleLastValue = withoutExcess.goalState!.lastValue;
    expect(() => validateBotGoalState(withoutExcess)).toThrow('bots.errors.goal');
    const withoutFill = structuredClone(bot);
    withoutFill.portfolio.trades = 0;
    expect(() => validateBotGoalState(withoutFill)).toThrow('bots.errors.goal');
    const beforeStart = structuredClone(bot);
    beforeStart.state.lastTradeAt = beforeStart.goalState!.startedAt - 1;
    expect(() => validateBotGoalState(beforeStart)).toThrow('bots.errors.goal');
  });

  it('still stops a GO goal at full-portfolio drawdown or expiry with zero trades', () => {
    const bot = botFixture();
    bot.policy.feeAsset = bot.assetOut;
    bot.portfolio.holdings = { in: '10000', out: '100' };
    bot.goal = {
      ...goal,
      maxLossPercent: '10',
      valuationAsset: 'output',
      lossMetric: 'drawdown',
      targetRequiresIdleOutperformance: true,
    };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    bot.goalState = evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '1.8' });
    expect(evaluateBotGoal(bot, 3000, { timestamp: 3000, close: '2.1' })?.outcome).toBe('loss');
    expect(evaluateBotGoal(bot, 3_601_000)?.outcome).toBe('expired');
  });

  it('keeps old output-goal target and consent semantics when the new option is omitted', () => {
    const bot = botFixture();
    bot.goal = { ...goal, valuationAsset: 'output' };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    const identity = consentIdentity(bot);
    expect(evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '1.8' })?.outcome).toBe('target');
    expect(copyBotGoal(bot.goal)).toEqual(bot.goal);
    expect(consentIdentity(bot)).toBe(identity);
    bot.goal.targetRequiresIdleOutperformance = true;
    expect(consentIdentity(bot)).not.toBe(identity);
  });

  it('includes separately allocated fee tokens in exact output-denominated value', () => {
    const bot = botFixture();
    bot.goal = { ...goal, valuationAsset: 'output' };
    bot.policy.feeAsset = { address: 'fee', symbol: 'FEE', decimals: 18 };
    bot.portfolio.holdings = { in: '5000', out: '2500', fee: '1000000000000000001' };
    expect(evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2', feeClose: '4' })).toMatchObject({
      baselineValue: '52.000000000000000002',
      lastValue: '52.000000000000000002',
      returnPercent: '0',
    });
    expect(() => evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' })).toThrow('bots.errors.history');
  });

  it('keeps a third-token fee reserve in the GO idle comparison', () => {
    const bot = botFixture();
    bot.policy.feeAsset = { address: 'fee', symbol: 'FEE', decimals: 18 };
    bot.portfolio.holdings = { in: '5000', out: '2500', fee: '1000000000000000001' };
    bot.goal = {
      ...goal,
      valuationAsset: 'output',
      maxLossPercent: '10',
      targetRequiresIdleOutperformance: true,
    };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2', feeClose: '4' });
    expect(bot.goalState?.idleHoldings).toEqual(bot.portfolio.holdings);
    bot.goalState = evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '1.8', feeClose: '4.2' });
    expect(bot.goalState?.idleLastValue).toBe(bot.goalState?.lastValue);
    expect(bot.goalState?.outcome).toBe('active');
  });

  it('starts from exact allocated holdings including fee capital and keeps its opening value outside chart history', () => {
    const bot = botFixture();
    bot.goal = goal;
    bot.portfolio.holdings = { in: '5000', out: '2500' };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    expect(bot.goalState).toMatchObject({
      baselineValue: '100',
      lastValue: '100',
      returnPercent: '0',
      startedAt: 1000,
    });
    bot.equity = Array.from({ length: 1000 }, (_, timestamp) => ({ timestamp, value: '200', benchmark: '200' }));
    bot.goalState = evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '2.2' });
    expect(bot.goalState).toMatchObject({
      baselineValue: '100',
      lastValue: '105',
      returnPercent: '5',
      outcome: 'target',
    });
    expect(evaluateBotGoal(bot, 3000, { timestamp: 3000, close: '1' })).toEqual(bot.goalState);
  });

  it('pauses at a loss threshold without selling any holdings', () => {
    const bot = botFixture();
    bot.goal = goal;
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    bot.portfolio.holdings.in = '9700';
    const holdings = { ...bot.portfolio.holdings };
    const result = evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '2' });
    expect(result).toMatchObject({ outcome: 'loss', returnPercent: '-3', completedAt: 2000 });
    expect(bot.portfolio.holdings).toEqual(holdings);
  });
  it('floors goal progress at zero while retaining a larger finalized XOR deficit', () => {
    const bot = executionBot();
    const candle = { timestamp: 2000, close: '2', feeClose: '3' };
    const openingValue = valuePortfolio(bot, candle, bot.portfolio.initial);
    bot.goal = { ...goal, maxLossPercent: '10', valuationAsset: 'output', lossMetric: 'drawdown' };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2', feeClose: '3' });
    bot.portfolio.holdings[bot.policy.feeAsset.address] = '0';
    bot.portfolio.xorDeficitCodec = '20000000000000000000';
    expect(valuePortfolio(bot, candle)).toBe('0');
    expect(valuePortfolio(bot, candle, bot.portfolio.initial)).toBe(openingValue);
    bot.goalState = evaluateBotGoal(bot, 2000, candle);
    expect(bot.goalState).toMatchObject({ lastValue: '0', returnPercent: '-100', outcome: 'loss', completedAt: 2000 });
    expect(bot.portfolio.xorDeficitCodec).toBe('20000000000000000000');
    expect(() => validateBotGoalState(structuredClone(bot))).not.toThrow();
  });

  it('compares fractional token thresholds exactly without rounding progress into a trigger', () => {
    const bot = botFixture();
    bot.assetIn.decimals = 18;
    bot.policy.feeAsset.decimals = 18;
    bot.portfolio.holdings.in = '100000000000000000000';
    bot.goal = { ...goal, targetReturnPercent: '0.000000000000000001' };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    expect(evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '2' })?.outcome).toBe('active');
    bot.portfolio.holdings.in = '100000000000000000001';
    expect(evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '2' })).toMatchObject({
      outcome: 'target',
      returnPercent: '0.000000000000000001',
    });
  });

  it('expires using its original deadline across serialization and needs no quote', () => {
    const bot = botFixture();
    bot.goal = goal;
    expect(evaluateBotGoal(bot, 1000)).toBeUndefined();
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    const restored = JSON.parse(JSON.stringify(bot));
    expect(evaluateBotGoal(restored, 3_601_000)).toMatchObject({ outcome: 'expired', startedAt: 1000 });
    expect(() => evaluateBotGoal(restored, 999)).toThrow('bots.errors.goal');
  });

  it('retains a supplied post-fill valuation when finalization crosses the goal deadline', () => {
    const bot = botFixture();
    bot.goal = goal;
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    bot.portfolio.holdings.in = '9900';
    expect(evaluateBotGoal(bot, 3_601_000, { timestamp: 3_601_000, close: '2' })).toMatchObject({
      outcome: 'expired',
      lastValue: '99',
      returnPercent: '-1',
      startedAt: 1000,
    });
  });

  it('rejects stale observations and corrupt state rather than resetting its baseline', () => {
    const bot = botFixture();
    bot.goal = goal;
    expect(() => evaluateBotGoal(bot, 6000, { timestamp: 1000, close: '2' })).toThrow('bots.errors.stale');
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    bot.goalState!.returnPercent = '5';
    expect(() => validateBotGoalState(bot)).toThrow('bots.errors.goal');
    delete bot.goal;
    expect(() => validateBotGoalState(bot)).toThrow('bots.errors.goal');
    expect(evaluateBotGoal(botFixture(), 1000)).toBeUndefined();
  });

  it('binds goal settings into consent and refuses expired sessions at the signing boundary', () => {
    const bot = executionBot();
    bot.goal = goal;
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2', feeClose: '1' });
    bot.sessionExpiresAt = 10_000_000;
    const session = { botId: bot.id, account: bot.account, network: bot.network, expiresAt: 10_000_000 };
    const identity = consentIdentity(bot);
    bot.goal = { ...goal, valuationAsset: 'output' };
    expect(consentIdentity(bot)).not.toBe(identity);
    bot.goal = { ...goal, maxLossPercent: '4' };
    expect(consentIdentity(bot)).not.toBe(identity);
    expect(() => assertSession(bot, session, executionStatus(), 3_601_000)).toThrow('bots.errors.goalComplete');
  });
});
