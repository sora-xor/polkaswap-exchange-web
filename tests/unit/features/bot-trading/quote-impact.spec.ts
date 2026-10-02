import { describe, expect, it } from 'vitest';
import { FPNumber } from '@/lib/substrate/math';
import { isExactInputQuoteWithinImpactLimit } from '@/features/bot-trading/quote-impact';

const MAX = (1n << 128n) - 1n;

describe('exact input quote impact limit', () => {
  it('accepts equality at the exact cap and rejects a single codec unit above it', () => {
    expect(isExactInputQuoteWithinImpactLimit('99000', '100000', '1')).toBe(true);
    expect(isExactInputQuoteWithinImpactLimit('98999', '100000', '1')).toBe(false);
    expect(isExactInputQuoteWithinImpactLimit('99001', '100000', '1')).toBe(true);
    expect(isExactInputQuoteWithinImpactLimit('98996', '100000', '1')).toBe(false); // 1.004%.
  });

  it('handles zero impact and a zero cap without accepting zero or negative outputs', () => {
    expect(isExactInputQuoteWithinImpactLimit('7', '7', '0')).toBe(true);
    expect(isExactInputQuoteWithinImpactLimit('6', '7', '0')).toBe(false);
    expect(isExactInputQuoteWithinImpactLimit('1', MAX.toString(), '100')).toBe(true);
    for (const invalid of ['0', '-0', '-1']) {
      expect(() => isExactInputQuoteWithinImpactLimit(invalid, '1', '1')).toThrow('bots.errors.quote');
      expect(() => isExactInputQuoteWithinImpactLimit('1', invalid, '1')).toThrow('bots.errors.quote');
    }
  });

  it('compares decimal caps exactly down to the supported 18-digit precision', () => {
    expect(isExactInputQuoteWithinImpactLimit('9875', '10000', '1.25')).toBe(true);
    expect(isExactInputQuoteWithinImpactLimit('9874', '10000', '1.25')).toBe(false);
    expect(isExactInputQuoteWithinImpactLimit('9875', '10000', '1.2500')).toBe(true);
    expect(
      isExactInputQuoteWithinImpactLimit('99999999999999999999', '100000000000000000000', '0.000000000000000001')
    ).toBe(true);
    expect(
      isExactInputQuoteWithinImpactLimit('99999999999999999998', '100000000000000000000', '0.000000000000000001')
    ).toBe(false);
  });

  it('retains u128 edge precision while intermediate cross-products exceed u128', () => {
    const without = MAX - (MAX % 100n);
    const exact = without - without / 100n;
    expect(isExactInputQuoteWithinImpactLimit(exact.toString(), without.toString(), '1.000000000000000000')).toBe(true);
    expect(isExactInputQuoteWithinImpactLimit((exact - 1n).toString(), without.toString(), '1')).toBe(false);
    expect(isExactInputQuoteWithinImpactLimit(MAX.toString(), MAX.toString(), '0')).toBe(true);
  });

  it('uses fee-inclusive quote outputs without adding fees or replacing the no-impact baseline with a spot mark', () => {
    // Invented net quote outputs already include their pool fee: net impact is 50 / 10000 = 0.5%.
    expect(isExactInputQuoteWithinImpactLimit('9950', '10000', '1')).toBe(true);
    // Subtracting a fee a second time would change the input and yield a different, incorrect check.
    expect(isExactInputQuoteWithinImpactLimit('9850', '10000', '1')).toBe(false);
  });

  it('distinguishes contradictory or malformed evidence from a valid over-limit result', () => {
    expect(isExactInputQuoteWithinImpactLimit('98', '100', '1')).toBe(false);
    expect(() => isExactInputQuoteWithinImpactLimit('101', '100', '1')).toThrow('bots.errors.quote');
    for (const invalid of [
      undefined,
      null,
      1,
      1n,
      NaN,
      Infinity,
      {},
      '01',
      '1.0',
      '1e3',
      ' 1',
      '+1',
      (MAX + 1n).toString(),
      '9'.repeat(400),
    ]) {
      expect(() => isExactInputQuoteWithinImpactLimit(invalid, '100', '1')).toThrow('bots.errors.quote');
      expect(() => isExactInputQuoteWithinImpactLimit('1', invalid, '1')).toThrow('bots.errors.quote');
    }
  });

  it('rejects malformed, negative, overflowing and over-precision caps rather than rounding them', () => {
    for (const invalid of [
      undefined,
      null,
      1,
      {},
      '',
      '-1',
      '-0',
      '01',
      '1.',
      '.1',
      '1e-2',
      ' 1',
      '+1',
      'NaN',
      'Infinity',
      '100.000000000000000001',
      '101',
      '0.0000000000000000001',
      '9'.repeat(400),
    ])
      expect(() => isExactInputQuoteWithinImpactLimit('99', '100', invalid)).toThrow('bots.errors.policy');
    expect(isExactInputQuoteWithinImpactLimit('1', '100', '100.000000000000000000')).toBe(true);
  });

  it('verifies that the current SDK signed display rounding is conservative under its actual default mode', () => {
    expect(FPNumber.DEFAULT_ROUND_MODE).toBe(3);
    const impact = FPNumber.ONE.sub(new FPNumber('98996').div(new FPNumber('100000'))).mul(FPNumber.HUNDRED);
    expect(FPNumber.ZERO.sub(impact).toFixed(2)).toBe('-1.01');
    expect(isExactInputQuoteWithinImpactLimit('98996', '100000', '1')).toBe(false);
  });
});
