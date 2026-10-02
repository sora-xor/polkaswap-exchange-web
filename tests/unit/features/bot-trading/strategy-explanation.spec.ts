import { describe, expect, it } from 'vitest';
import { explainedTradeAmount } from '@/features/bot-trading/strategy-explanation';
import { PLAYGROUND_DEFAULT_SETTINGS } from '@/features/bot-trading/playground';

describe('explainedTradeAmount', () => {
  it('describes a fixed share of starting capital and rounds down to the token base unit', () => {
    expect(explainedTradeAmount({ ...PLAYGROUND_DEFAULT_SETTINGS, capital: '100', tradePercent: 10 })).toBe('10');
    expect(
      explainedTradeAmount({ ...PLAYGROUND_DEFAULT_SETTINGS, capital: '0.300000000000000003', tradePercent: 10 })
    ).toBe('0.03');
    expect(explainedTradeAmount({ ...PLAYGROUND_DEFAULT_SETTINGS, capital: '1.000001', tradePercent: 33 }, 6)).toBe(
      '0.33'
    );
    expect(
      explainedTradeAmount(
        { ...PLAYGROUND_DEFAULT_SETTINGS, capital: '0.000000000000000000000000000000000123', tradePercent: 10 },
        36
      )
    ).toBe('0.000000000000000000000000000000000012');
  });

  it('does not invent a trade amount for incomplete, invalid or sub-unit settings', () => {
    for (const capital of ['', '0', '-1', '1e3', 'NaN', '0.000000000000000001', '7'.repeat(101)]) {
      expect(explainedTradeAmount({ ...PLAYGROUND_DEFAULT_SETTINGS, capital })).toBe('—');
    }
    for (const tradePercent of [0, -1, 0.5, 51, NaN, Infinity]) {
      expect(explainedTradeAmount({ ...PLAYGROUND_DEFAULT_SETTINGS, tradePercent })).toBe('—');
    }
    expect(explainedTradeAmount({ ...PLAYGROUND_DEFAULT_SETTINGS, capital: '1.0000001' }, 6)).toBe('—');
    expect(explainedTradeAmount(PLAYGROUND_DEFAULT_SETTINGS, 37)).toBe('—');
  });
});
