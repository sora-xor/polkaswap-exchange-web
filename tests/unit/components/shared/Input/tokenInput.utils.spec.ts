import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it } from 'vitest';

import { calculateFiatAmount, resolveTokenDecimals } from '@/components/shared/Input/tokenInput.utils';

describe('tokenInput.utils', () => {
  describe('resolveTokenDecimals', () => {
    it('returns default precision when token missing', () => {
      expect(resolveTokenDecimals(null, false)).toBe(FPNumber.DEFAULT_PRECISION);
    });

    it('returns internal decimals for non-external tokens', () => {
      const decimals = resolveTokenDecimals({ decimals: 12 } as any, false);

      expect(decimals).toBe(12);
    });

    it('returns external decimals when external flag set', () => {
      const decimals = resolveTokenDecimals({ externalDecimals: 18 } as any, true);

      expect(decimals).toBe(18);
    });
  });

  describe('calculateFiatAmount', () => {
    const tokenPrice = new FPNumber(1);

    it('returns zero when value missing', () => {
      const result = calculateFiatAmount(undefined, tokenPrice, 2);

      expect(result.isZero()).toBe(true);
    });

    it('multiplies amount by token price and exchange rate', () => {
      const result = calculateFiatAmount('2', tokenPrice, 2);

      expect(result.toNumber()).toBeCloseTo(4);
    });
  });
});
