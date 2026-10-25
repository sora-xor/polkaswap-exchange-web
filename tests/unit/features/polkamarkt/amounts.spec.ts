import { describe, expect, it } from 'vitest';

import {
  applySlippageMinimum,
  codecToNaturalString,
  formatPolkamarktCodec,
  isPositiveCodec,
  isValidPolkamarktSlippage,
  parsePolkamarktAmount,
} from '@/features/polkamarkt/lib/amounts';

describe('polkamarkt amount helpers', () => {
  it('parses human collateral amounts into codec strings with FPNumber precision', () => {
    expect(parsePolkamarktAmount('1.25')).toBe('1250000000000000000');
    expect(parsePolkamarktAmount('')).toBe('0');
  });

  it('rejects invalid user amounts before runtime submission', () => {
    expect(() => parsePolkamarktAmount('1e3')).toThrow('Amount must be a non-negative decimal number.');
    expect(() => parsePolkamarktAmount('-1')).toThrow('Amount must be a non-negative decimal number.');
  });

  it('formats codec values and applies slippage using integer math', () => {
    expect(formatPolkamarktCodec('1250000000000000000')).toBe('1.25');
    expect(codecToNaturalString('1250000000000000000')).toBe('1.25');
    expect(applySlippageMinimum('1000000000000000000', '0.5')).toBe('995000000000000000');
    expect(applySlippageMinimum('1000000000000000000', 10)).toBe('900000000000000000');
  });

  it('rejects slippage that could erase the minimum output', () => {
    expect(isValidPolkamarktSlippage('0')).toBe(true);
    expect(isValidPolkamarktSlippage('10')).toBe(true);
    expect(isValidPolkamarktSlippage('-1')).toBe(false);
    expect(isValidPolkamarktSlippage('10.01')).toBe(false);
    expect(isValidPolkamarktSlippage('NaN')).toBe(false);
    expect(isValidPolkamarktSlippage('Infinity')).toBe(false);
    expect(() => applySlippageMinimum('1000000000000000000', 100)).toThrow(
      'Slippage must be a decimal percentage between 0 and 10.'
    );
  });

  it('checks positive codec values without floating point conversion', () => {
    expect(isPositiveCodec('1')).toBe(true);
    expect(isPositiveCodec('0')).toBe(false);
    expect(isPositiveCodec('bad')).toBe(false);
  });
});
