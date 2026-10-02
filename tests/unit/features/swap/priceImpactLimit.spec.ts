import { describe, expect, it } from 'vitest';
import { isSwapPriceImpactAllowed } from '@/features/swap/services/priceImpactLimit';

describe('optional guided purchase price-impact limit', () => {
  it('preserves ordinary swap behavior without an opt-in limit', () => {
    expect(isSwapPriceImpactAllowed('100')).toBe(true);
    expect(isSwapPriceImpactAllowed(null)).toBe(true);
  });
  it('compares exact absolute percentage points at the boundary', () => {
    expect(isSwapPriceImpactAllowed('-5', '5')).toBe(true);
    expect(isSwapPriceImpactAllowed('5.000000000000000001', '5')).toBe(false);
    expect(isSwapPriceImpactAllowed('-31.5', '5')).toBe(false);
  });
  it('blocks missing and malformed evidence or configuration', () => {
    for (const impact of [null, undefined, 0, 'NaN', 'Infinity', '1e2', '']) {
      expect(isSwapPriceImpactAllowed(impact, '5')).toBe(false);
    }
    for (const limit of ['', '0', '-1', '101', 'NaN']) {
      expect(isSwapPriceImpactAllowed('0', limit)).toBe(false);
    }
  });
});
