import { describe, expect, it } from 'vitest';

import { FPNumber } from '@sora-substrate/sdk';
import { readMarketPrice, valueAtMarketPrice } from '@/lib/soraneo-wallet/src/services/indexer/marketPrice';

describe('market quote availability', () => {
  it('uses a sourced quote even if the compatibility field rounded it to zero', () => {
    expect(readMarketPrice('0.000000000340941693', '0')?.toCodecString()).toBe('340941693');
    expect(readMarketPrice('0', '9')?.toString()).toBe('0');
    expect(readMarketPrice(null, '9')).toBeNull();
    expect(readMarketPrice(undefined, 2)?.toString()).toBe('2');
    expect(readMarketPrice(undefined, '0')).toBeNull();
  });

  it('distinguishes a zero native amount from an unpriced positive amount and retains the entire product', () => {
    expect(valueAtMarketPrice(FPNumber.ZERO, null)?.toString()).toBe('0');
    expect(valueAtMarketPrice(FPNumber.ONE, null)).toBeNull();
    const native = new FPNumber('0.000000001', 9);
    const price = new FPNumber('0.000000000000000001');
    expect(valueAtMarketPrice(native, price)?.toString()).toBe('0.000000000000000000000000001');
  });

  it.each(['-1', 'NaN', 'Infinity', '', false, 0, '0.0000000000000000001', '1'.repeat(161)])(
    'rejects invalid exact prices without falling back to the compatibility mark',
    (invalid) => {
      expect(readMarketPrice(invalid, '42')).toBeNull();
    }
  );
});
