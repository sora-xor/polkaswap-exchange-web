import { describe, expect, it } from 'vitest';
import { assessGoalTradeAdmission } from '@/features/bot-trading/goalAdmission';
import { toCodec } from '@/features/bot-trading/amounts';
import type { PaperFill } from '@/features/bot-trading/engine';
import type { BotCandle, BotDefinition } from '@/features/bot-trading/types';
import { executionBot } from './execution-fixtures';

const units = (amount: string) => toCodec(amount, 18);
const candle = { timestamp: 2000, close: '1', feeClose: '1' };

/** Keep observed value 104.6 above the 104.5 stop while varying the fee-token alias. */
function admissionBot(feeAsset = 'in'): BotDefinition {
  const bot = executionBot();
  bot.assetIn = { address: 'in', symbol: 'IN', decimals: 18 };
  bot.assetOut = { address: 'out', symbol: 'OUT', decimals: 18 };
  bot.policy.feeAsset = { address: feeAsset, symbol: 'FEE', decimals: 18 };
  bot.policy.feeBudgetCodec = units('1');
  bot.policy.maxTradeCodec = { in: units('10'), out: units('10') };
  bot.portfolio.holdings = { in: units(feeAsset === 'in' ? '104.6' : '103.6'), out: '0' };
  if (feeAsset !== 'in') bot.portfolio.holdings[feeAsset] = units('1');
  bot.portfolio.initial = { ...bot.portfolio.holdings };
  bot.goal = {
    title: 'Grow',
    targetReturnPercent: '20',
    maxLossPercent: '5',
    durationMs: 3_600_000,
    lossMetric: 'drawdown',
  };
  bot.goalState = {
    startedAt: 1000,
    baselineValue: '100',
    peakValue: '110',
    lastValue: '110',
    returnPercent: '10',
    outcome: 'active',
  };
  return bot;
}

/** Minimum output already incorporates route costs and the allowed slippage. */
function fill(bot: BotDefinition, output = '0.9', fee = '0.05'): PaperFill {
  return {
    inputAsset: 'in',
    inputCodec: units('1'),
    outputAsset: 'out',
    outputCodec: units(output),
    feeAsset: bot.policy.feeAsset.address,
    feeCodec: units(fee),
  };
}

describe('drawdown trade cost admission', () => {
  it.each(['in', 'out', 'fee'])('rejects known quote costs with fee token %s without changing any state', (fee) => {
    const bot = admissionBot(fee);
    const before = JSON.stringify(bot);
    const result = assessGoalTradeAdmission(bot, fill(bot), candle, 2000);
    expect(result).toMatchObject({
      rejection: 'bots.errors.goalTradeCost',
      goalState: { peakValue: '110', lastValue: '104.6', returnPercent: '4.6', outcome: 'active' },
    });
    expect(JSON.stringify(bot)).toBe(before);
    expect(result.goalState).not.toBe(bot.goalState);
  });

  it.each([
    ['0.95', 'bots.errors.goalTradeCost'],
    ['0.949999999999999999', 'bots.errors.goalTradeCost'],
    ['0.950000000000000001', undefined],
  ])('compares an exact 18-decimal minimum %s at the loss boundary', (output, rejection) => {
    const bot = admissionBot();
    expect(assessGoalTradeAdmission(bot, fill(bot, output), candle, 2000).rejection).toBe(rejection);
  });

  it('checks fee-only failure even when the successful swap would be profitable', () => {
    const bot = admissionBot();
    expect(assessGoalTradeAdmission(bot, fill(bot, '1.2', '0.11'), candle, 2000).rejection).toBe(
      'bots.errors.goalTradeCost'
    );
  });

  it.each([
    ['1', '0.1'],
    ['0.85', '0'],
  ])('blocks a threshold consumed by network fee or quoted output alone', (output, fee) => {
    const bot = admissionBot();
    expect(assessGoalTradeAdmission(bot, fill(bot, output, fee), candle, 2000).rejection).toBe(
      'bots.errors.goalTradeCost'
    );
  });

  it('does not charge slippage or route fees a second time or persist hypothetical gains', () => {
    const bot = admissionBot();
    bot.policy.slippagePercent = '5';
    const result = assessGoalTradeAdmission(bot, fill(bot, '10', '0.01'), candle, 2000);
    expect(result.rejection).toBeUndefined();
    expect(result.goalState).toMatchObject({ peakValue: '110', lastValue: '104.6', outcome: 'active' });
    expect(bot.goalState?.lastValue).toBe('110');
    // This minimum leaves 0.01 headroom; subtracting another slippage allowance would wrongly reject it.
    expect(assessGoalTradeAdmission(bot, fill(bot, '0.96'), candle, 2000).rejection).toBeUndefined();
  });

  it('uses a newly observed higher peak when assessing costs', () => {
    const bot = admissionBot();
    bot.portfolio.holdings.in = units('111');
    const order = { ...fill(bot, '0.5', '1'), inputCodec: units('5.1') };
    const result = assessGoalTradeAdmission(bot, order, candle, 2000);
    expect(result).toMatchObject({
      rejection: 'bots.errors.goalTradeCost',
      goalState: { peakValue: '111', lastValue: '111', returnPercent: '11', outcome: 'active' },
    });
    expect(bot.goalState?.peakValue).toBe('110');
  });

  it('values output-token goals and their output-token fee reserve exactly once', () => {
    const bot = admissionBot('out');
    bot.goal!.valuationAsset = 'output';
    bot.portfolio.holdings = { in: units('208.2'), out: units('0.5') };
    bot.policy.feeBudgetCodec = units('0.5');
    const prices = { timestamp: 2000, close: '2', feeClose: '2' };
    const order = { ...fill(bot, '0.95'), inputCodec: units('2') };
    const result = assessGoalTradeAdmission(bot, order, prices, 2000);
    expect(result).toMatchObject({
      rejection: 'bots.errors.goalTradeCost',
      goalState: { lastValue: '104.6', peakValue: '110' },
    });
    order.outputCodec = units('0.950000000000000001');
    expect(assessGoalTradeAdmission(bot, order, prices, 2000).rejection).toBeUndefined();
  });

  it('returns actual terminal observations before projecting a trade', () => {
    const bot = admissionBot();
    bot.portfolio.holdings.in = units('104.5');
    const result = assessGoalTradeAdmission(bot, { ...fill(bot), inputCodec: 'invalid' }, candle, 2000);
    expect(result).toMatchObject({
      rejection: 'bots.errors.goalComplete',
      goalState: { peakValue: '110', lastValue: '104.5', outcome: 'loss', completedAt: 2000 },
    });
    expect(bot.goalState?.outcome).toBe('active');
  });

  it('preserves completed outcomes and recognizes the actual deadline or target', () => {
    const bot = admissionBot();
    const expiry = 3_601_000;
    expect(assessGoalTradeAdmission(bot, fill(bot), { ...candle, timestamp: expiry }, expiry)).toMatchObject({
      rejection: 'bots.errors.goalComplete',
      goalState: { outcome: 'expired' },
    });
    bot.portfolio.holdings.in = units('120');
    const result = assessGoalTradeAdmission(bot, fill(bot), candle, 2000);
    expect(result).toMatchObject({ rejection: 'bots.errors.goalComplete', goalState: { outcome: 'target' } });
    bot.goalState = result.goalState;
    bot.portfolio.holdings.in = units('104.6');
    expect(assessGoalTradeAdmission(bot, fill(bot), { ...candle, timestamp: 3000 }, 3000)).toEqual(result);
  });

  it.each([undefined, 'baseline'] as const)('does not add admission policy to legacy %s goals', (metric) => {
    const bot = admissionBot();
    bot.goal!.lossMetric = metric;
    delete bot.goalState;
    expect(assessGoalTradeAdmission(bot, fill(bot, '0.1', '1'), { ...candle, timestamp: -1 }, 2000)).toEqual({});
    delete bot.goal;
    expect(assessGoalTradeAdmission(bot, fill(bot), candle, 2000)).toEqual({});
  });

  it.each([undefined, 'missing-peak', 'invalid-return'] as const)(
    'refuses missing or malformed durable drawdown state: %s',
    (state) => {
      const bot = admissionBot();
      if (state === undefined) delete bot.goalState;
      else if (state === 'missing-peak') delete bot.goalState!.peakValue;
      else bot.goalState!.returnPercent = '999';
      expect(() => assessGoalTradeAdmission(bot, fill(bot), candle, 2000)).toThrow('bots.errors.goal');
    }
  );

  it.each([-1, 2001, NaN, 0.5])('rejects invalid or future candle timestamp %s', (timestamp) => {
    const bot = admissionBot();
    expect(() => assessGoalTradeAdmission(bot, fill(bot), { ...candle, timestamp }, 2000)).toThrow('bots.errors.stale');
  });

  it('requires a candle strictly younger than five seconds and validated prices', () => {
    const bot = admissionBot();
    expect(() => assessGoalTradeAdmission(bot, fill(bot), candle, 7000)).toThrow('bots.errors.stale');
    expect(() => assessGoalTradeAdmission(bot, fill(bot), candle, 6999)).not.toThrow();
    for (const prices of [
      { ...candle, close: '0' },
      { ...candle, close: 'NaN' },
    ] as BotCandle[])
      expect(() => assessGoalTradeAdmission(bot, fill(bot), prices, 2000)).toThrow('bots.errors.history');
  });

  it('retains exact trade allocation and fee-budget validation without mutations', () => {
    const bot = admissionBot();
    const before = JSON.stringify(bot);
    expect(() => assessGoalTradeAdmission(bot, fill(bot, '1', '1.01'), candle, 2000)).toThrow('bots.errors.feeBudget');
    expect(() => assessGoalTradeAdmission(bot, { ...fill(bot), inputCodec: units('11') }, candle, 2000)).toThrow(
      'bots.errors.policy'
    );
    expect(() => assessGoalTradeAdmission(bot, { ...fill(bot), outputCodec: '0' }, candle, 2000)).toThrow(
      'bots.errors.proposal'
    );
    expect(JSON.stringify(bot)).toBe(before);
  });
});
