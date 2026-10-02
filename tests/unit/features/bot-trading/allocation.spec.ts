import { describe, expect, it } from 'vitest';
import { assertTradeFunds, remainingFeeReserveCodec, spendableHoldingCodec } from '@/features/bot-trading/allocation';
import { botFixture } from './fixtures';

describe('protected bot fee allocation', () => {
  it('makes only earned output above the remaining reserve available, without a second fee deduction', () => {
    const bot = botFixture();
    bot.policy.feeAsset = bot.assetOut;
    bot.portfolio.holdings.out = '173';
    bot.portfolio.feesPaidCodec = '27';
    expect(remainingFeeReserveCodec(bot)).toBe('73');
    expect(spendableHoldingCodec(bot, 'out')).toBe('100');
    expect(() => assertTradeFunds(bot, 'out', '100', '73')).not.toThrow();
    expect(() => assertTradeFunds(bot, 'out', '101', '1')).toThrow('bots.errors.balance');
    expect(() => assertTradeFunds(bot, 'out', '100', '74')).toThrow('bots.errors.feeBudget');
    expect(bot.portfolio.holdings.out).toBe('173');
  });

  it('protects the reserve for input-token fees and preserves exact large holdings', () => {
    const bot = botFixture();
    bot.portfolio.holdings.in = '999999999999999999999999999999';
    expect(spendableHoldingCodec(bot, 'in')).toBe('999999999999999999999999999899');
    expect(() => assertTradeFunds(bot, 'in', '999999999999999999999999999899', '100')).not.toThrow();
    expect(spendableHoldingCodec(bot, 'missing')).toBe('0');
  });

  it('rejects an underfunded legacy reserve even when a proposed output could replenish it', () => {
    const bot = botFixture();
    bot.portfolio.holdings.in = '99';
    bot.portfolio.holdings.out = '100';
    expect(spendableHoldingCodec(bot, 'in')).toBe('0');
    expect(() => assertTradeFunds(bot, 'out', '1', '1')).toThrow('bots.errors.balance');
    bot.portfolio.feesPaidCodec = '101';
    expect(remainingFeeReserveCodec(bot)).toBe('0');
    expect(() => assertTradeFunds(bot, 'out', '1', '0')).toThrow('bots.errors.feeBudget');
  });

  it('rejects malformed integer allocation fields instead of rounding or making credit', () => {
    const bot = botFixture();
    bot.portfolio.feesPaidCodec = '-1';
    expect(() => remainingFeeReserveCodec(bot)).toThrow('bots.errors.amount');
    bot.portfolio.feesPaidCodec = '0';
    expect(() => assertTradeFunds(bot, 'in', '1.5', '0')).toThrow('bots.errors.amount');
  });
});
